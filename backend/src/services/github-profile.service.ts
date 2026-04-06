import { Injectable, HttpException, HttpStatus } from '@nestjs/common';


// ─── DTOs / Typen ────────────────────────────────────────────────────────────

export interface GithubUserProfile {
    username: string;
    name: string | null;
    bio: string | null;
    location: string | null;
    company: string | null;
    blog: string | null;
    email: string | null;
    avatarUrl: string;
    profileUrl: string;
    createdAt: string;
    publicRepos: number;
    publicGists: number;
    followers: number;
    following: number;
    hireable: boolean | null;
}

export interface GithubRepository {
    name: string;
    fullName: string;
    description: string | null;
    url: string;
    language: string | null;
    stars: number;
    forks: number;
    watchers: number;
    isForked: boolean;
    isMirror: boolean;
    topics: string[];
    createdAt: string;
    updatedAt: string;
    pushedAt: string;
    openIssues: number;
    hasWiki: boolean;
    license: string | null;
    size: number; // in KB
}

export interface GithubCommitActivity {
    totalCommitsLast52Weeks: number;
    weeklyActivity: { week: string; commits: number }[];
    mostActiveWeek: { week: string; commits: number } | null;
    averageCommitsPerWeek: number;
}

export interface GithubContributionStats {
    totalStarsReceived: number;
    totalForksReceived: number;
    primaryLanguages: { language: string; repoCount: number; percentage: number }[];
    mostStarredRepo: GithubRepository | null;
    mostForkedRepo: GithubRepository | null;
    recentlyActivRepos: GithubRepository[];
    ownedRepos: GithubRepository[];
    forkedRepos: GithubRepository[];
}

export interface GithubPullRequestStats {
    totalOpen: number;
    totalClosed: number;
    recentPRs: {
        title: string;
        repo: string;
        state: string;
        createdAt: string;
        mergedAt: string | null;
        url: string;
    }[];
}

export interface GithubRawData {
    profile: GithubUserProfile;
    repositories: GithubRepository[];
    contributionStats: GithubContributionStats;
    pullRequests: GithubPullRequestStats;
    commitActivity: GithubCommitActivity[];
    events: GithubEventSummary;
    scrapedAt: string;
}

export interface GithubEventSummary {
    totalEventsLast90Days: number;
    eventBreakdown: Record<string, number>;
    activeDaysLast30Days: number;
    lastActiveAt: string | null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class GithubProfileService {
    private readonly baseUrl = 'https://api.github.com';
    private readonly headers: Record<string, string>;

    constructor() {
    }

    // ─── Public Entry Point ───────────────────────────────────────────────────

    async fetchProfileData(username: string): Promise<GithubRawData> {
        const [profile, rawRepos, pullRequests, events] = await Promise.all([
            this.fetchUser(username),
            this.fetchRepositories(username),
            this.fetchPullRequests(username),
            this.fetchRecentEvents(username),
        ]);

        const repositories = this.mapRepositories(rawRepos);
        const contributionStats = this.buildContributionStats(repositories);

        const topRepos = [...repositories]
            .filter((r) => !r.isForked)
            .sort((a, b) => b.stars - a.stars)
            .slice(0, 5);

        const commitActivity = await Promise.all(
            topRepos.map((r) => this.fetchCommitActivity(username, r.name)),
        );

        return {
            profile,
            repositories,
            contributionStats,
            pullRequests,
            commitActivity,
            events,
            scrapedAt: new Date().toISOString(),
        };
    }

    // ─── API Calls ────────────────────────────────────────────────────────────

    private async get<T>(path: string): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const res = await fetch(url, { headers: this.headers });

        if (res.status === 404) {
            throw new HttpException(
                `GitHub user or resource not found: ${path}`,
                HttpStatus.NOT_FOUND,
            );
        }
        if (res.status === 403) {
            throw new HttpException(
                'GitHub API rate limit exceeded. Provide a GITHUB_TOKEN.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
        if (!res.ok) {
            throw new HttpException(
                `GitHub API error ${res.status} for ${path}`,
                HttpStatus.BAD_GATEWAY,
            );
        }

        return res.json() as Promise<T>;
    }

    private async getPaginated<T>(
        path: string,
        perPage = 100,
        maxPages = 3,
    ): Promise<T[]> {
        const results: T[] = [];
        for (let page = 1; page <= maxPages; page++) {
            const separator = path.includes('?') ? '&' : '?';
            const data = await this.get<T[]>(
                `${path}${separator}per_page=${perPage}&page=${page}`,
            );
            results.push(...data);
            if (data.length < perPage) break;
        }
        return results;
    }

    // ─── Fetch Methoden ───────────────────────────────────────────────────────

    private async fetchUser(username: string): Promise<GithubUserProfile> {
        const data = await this.get<Record<string, unknown>>(`/users/${username}`);
        return {
            username: data.login as string,
            name: (data.name as string) ?? null,
            bio: (data.bio as string) ?? null,
            location: (data.location as string) ?? null,
            company: (data.company as string) ?? null,
            blog: (data.blog as string) ?? null,
            email: (data.email as string) ?? null,
            avatarUrl: data.avatar_url as string,
            profileUrl: data.html_url as string,
            createdAt: data.created_at as string,
            publicRepos: data.public_repos as number,
            publicGists: data.public_gists as number,
            followers: data.followers as number,
            following: data.following as number,
            hireable: (data.hireable as boolean) ?? null,
        };
    }

    private async fetchRepositories(
        username: string,
    ): Promise<Record<string, unknown>[]> {
        return this.getPaginated<Record<string, unknown>>(
            `/users/${username}/repos?sort=pushed&type=all`,
        );
    }

    private async fetchCommitActivity(
        username: string,
        repo: string,
    ): Promise<GithubCommitActivity> {
        try {
            const data = await this.get<{ total: number; week: number }[]>(
                `/repos/${username}/${repo}/stats/commit_activity`,
            );

            if (!Array.isArray(data) || data.length === 0) {
                return this.emptyCommitActivity();
            }

            const weekly = data.map((w) => ({
                week: new Date(w.week * 1000).toISOString().split('T')[0],
                commits: w.total,
            }));

            const totalCommitsLast52Weeks = weekly.reduce(
                (sum, w) => sum + w.commits,
                0,
            );
            const mostActiveWeek =
                [...weekly].sort((a, b) => b.commits - a.commits)[0] ?? null;

            return {
                totalCommitsLast52Weeks,
                weeklyActivity: weekly,
                mostActiveWeek,
                averageCommitsPerWeek:
                    weekly.length > 0
                        ? Math.round((totalCommitsLast52Weeks / weekly.length) * 10) / 10
                        : 0,
            };
        } catch {
            return this.emptyCommitActivity();
        }
    }

    private async fetchPullRequests(
        username: string,
    ): Promise<GithubPullRequestStats> {
        const [openData, closedData] = await Promise.all([
            this.get<{ total_count: number; items: Record<string, unknown>[] }>(
                `/search/issues?q=author:${username}+type:pr+state:open&per_page=10`,
            ),
            this.get<{ total_count: number; items: Record<string, unknown>[] }>(
                `/search/issues?q=author:${username}+type:pr+state:closed&per_page=10`,
            ),
        ]);

        const mapPR = (item: Record<string, unknown>) => ({
            title: item.title as string,
            repo: (item.repository_url as string).replace(
                'https://api.github.com/repos/',
                '',
            ),
            state: item.state as string,
            createdAt: item.created_at as string,
            mergedAt: (item.pull_request as Record<string, unknown>)
                ?.merged_at as string | null,
            url: item.html_url as string,
        });

        return {
            totalOpen: openData.total_count,
            totalClosed: closedData.total_count,
            recentPRs: [
                ...openData.items.map(mapPR),
                ...closedData.items.map(mapPR),
            ].slice(0, 15),
        };
    }

    private async fetchRecentEvents(
        username: string,
    ): Promise<GithubEventSummary> {
        const events = await this.getPaginated<Record<string, unknown>>(
            `/users/${username}/events/public`,
            100,
            3,
        );

        const now = Date.now();
        const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

        const recentEvents = events.filter((e) => {
            const ts = new Date(e.created_at as string).getTime();
            return ts >= ninetyDaysAgo;
        });

        const eventBreakdown: Record<string, number> = {};
        const activeDays = new Set<string>();

        for (const event of recentEvents) {
            const type = (event.type as string) ?? 'Unknown';
            eventBreakdown[type] = (eventBreakdown[type] ?? 0) + 1;

            const day = (event.created_at as string).split('T')[0];
            const ts = new Date(event.created_at as string).getTime();
            if (ts >= thirtyDaysAgo) activeDays.add(day);
        }

        const lastActiveAt =
            recentEvents.length > 0
                ? (recentEvents[0].created_at as string)
                : null;

        return {
            totalEventsLast90Days: recentEvents.length,
            eventBreakdown,
            activeDaysLast30Days: activeDays.size,
            lastActiveAt,
        };
    }

    // ─── Mapper / Aggregation ─────────────────────────────────────────────────

    private mapRepositories(
        raw: Record<string, unknown>[],
    ): GithubRepository[] {
        return raw.map((r) => ({
            name: r.name as string,
            fullName: r.full_name as string,
            description: (r.description as string) ?? null,
            url: r.html_url as string,
            language: (r.language as string) ?? null,
            stars: (r.stargazers_count as number) ?? 0,
            forks: (r.forks_count as number) ?? 0,
            watchers: (r.watchers_count as number) ?? 0,
            isForked: (r.fork as boolean) ?? false,
            isMirror: r.mirror_url !== null,
            topics: (r.topics as string[]) ?? [],
            createdAt: r.created_at as string,
            updatedAt: r.updated_at as string,
            pushedAt: r.pushed_at as string,
            openIssues: (r.open_issues_count as number) ?? 0,
            hasWiki: (r.has_wiki as boolean) ?? false,
            license:
                (r.license as Record<string, string> | null)?.spdx_id ?? null,
            size: (r.size as number) ?? 0,
        }));
    }

    private buildContributionStats(
        repos: GithubRepository[],
    ): GithubContributionStats {
        const ownedRepos = repos.filter((r) => !r.isForked);
        const forkedRepos = repos.filter((r) => r.isForked);

        const totalStarsReceived = ownedRepos.reduce((s, r) => s + r.stars, 0);
        const totalForksReceived = ownedRepos.reduce((s, r) => s + r.forks, 0);
        const langMap: Record<string, number> = {};
        for (const repo of ownedRepos) {
            if (repo.language) {
                langMap[repo.language] = (langMap[repo.language] ?? 0) + 1;
            }
        }
        const totalLangRepos = Object.values(langMap).reduce((s, n) => s + n, 0);
        const primaryLanguages = Object.entries(langMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([language, repoCount]) => ({
                language,
                repoCount,
                percentage:
                    totalLangRepos > 0
                        ? Math.round((repoCount / totalLangRepos) * 1000) / 10
                        : 0,
            }));

        const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
        const recentlyActivRepos = ownedRepos.filter(
            (r) => new Date(r.pushedAt).getTime() >= ninetyDaysAgo,
        );

        const mostStarredRepo =
            [...ownedRepos].sort((a, b) => b.stars - a.stars)[0] ?? null;
        const mostForkedRepo =
            [...ownedRepos].sort((a, b) => b.forks - a.forks)[0] ?? null;

        return {
            totalStarsReceived,
            totalForksReceived,
            primaryLanguages,
            mostStarredRepo,
            mostForkedRepo,
            recentlyActivRepos,
            ownedRepos,
            forkedRepos,
        };
    }

    private emptyCommitActivity(): GithubCommitActivity {
        return {
            totalCommitsLast52Weeks: 0,
            weeklyActivity: [],
            mostActiveWeek: null,
            averageCommitsPerWeek: 0,
        };
    }
}