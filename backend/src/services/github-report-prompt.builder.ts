import type { GithubRawData } from './github-profile.service';

/**
 * Wandelt die rohen GitHub-Daten in einen kompakten, strukturierten
 * Prompt-String um, den du direkt an ein LLM übergeben kannst.
 *
 * Bewusst als Plain-Text gehalten (kein JSON-Dump), damit das LLM
 * nicht durch irrelevante Felder abgelenkt wird.
 */
export function buildReportPrompt(data: GithubRawData): string {
    const { profile, contributionStats, pullRequests, events, commitActivity } =
        data;

    const topRepoLines = contributionStats.ownedRepos
        .sort((a, b) => b.stars - a.stars)
        .slice(0, 6)
        .map(
            (r) =>
                `  - ${r.name} [${r.language ?? 'n/a'}] ★${r.stars} 🍴${r.forks}` +
                (r.description ? ` — "${r.description}"` : '') +
                ` | Topics: ${r.topics.slice(0, 4).join(', ') || 'none'}` +
                ` | Last push: ${r.pushedAt.split('T')[0]}`,
        )
        .join('\n');

    const langLines = contributionStats.primaryLanguages
        .map((l) => `  ${l.language}: ${l.repoCount} repos (${l.percentage}%)`)
        .join('\n');

    const commitLines = commitActivity
        .map(
            (c, i) =>
                `  Repo #${i + 1}: ${c.totalCommitsLast52Weeks} commits/year, ` +
                `avg ${c.averageCommitsPerWeek}/week` +
                (c.mostActiveWeek
                    ? `, peak week ${c.mostActiveWeek.week} (${c.mostActiveWeek.commits} commits)`
                    : ''),
        )
        .join('\n');

    const eventLines = Object.entries(events.eventBreakdown)
        .sort(([, a], [, b]) => b - a)
        .map(([type, count]) => `  ${type}: ${count}`)
        .join('\n');

    const prompt = `
You are a senior tech recruiter assistant. Based on the GitHub activity data below,
write a professional freelancer assessment report in German for a hiring company.

The report should cover:
1. Overall activity level and consistency (low / medium / high)
2. Technical strengths (languages, domains, project types)
3. Open-source contributions and community engagement
4. Code quality signals (stars, forks, topics, repo descriptions)
5. Red flags or gaps (if any)
6. A final recommendation (suitable for freelance hire: yes / conditionally / no)

Keep the report concise (max 400 words), objective, and use plain language.

══════════════════════════════════════════
GITHUB PROFILE: ${profile.username}
══════════════════════════════════════════

## Basic Info
- Name: ${profile.name ?? 'not provided'}
- Bio: ${profile.bio ?? 'not provided'}
- Location: ${profile.location ?? 'not provided'}
- Company: ${profile.company ?? 'not provided'}
- Hireable: ${profile.hireable ?? 'not specified'}
- Member since: ${profile.createdAt.split('T')[0]}
- Followers: ${profile.followers} | Following: ${profile.following}

## Repository Overview
- Total public repos: ${profile.publicRepos}
- Owned (not forked): ${contributionStats.ownedRepos.length}
- Forked repos: ${contributionStats.forkedRepos.length}
- Total stars received: ${contributionStats.totalStarsReceived}
- Total forks received: ${contributionStats.totalForksReceived}
- Active repos (last 90 days): ${contributionStats.recentlyActivRepos.length}

## Top Repositories
${topRepoLines || '  (none)'}

## Languages Used
${langLines || '  (none)'}

## Commit Activity (Top 5 Repos by Stars)
${commitLines || '  (no data)'}

## Pull Requests
- Open PRs (total): ${pullRequests.totalOpen}
- Closed/Merged PRs (total): ${pullRequests.totalClosed}

## Recent Activity (last 90 days)
- Total events: ${events.totalEventsLast90Days}
- Active days last 30 days: ${events.activeDaysLast30Days}
- Last active: ${events.lastActiveAt ?? 'unknown'}
- Event breakdown:
${eventLines || '  (no events)'}

══════════════════════════════════════════
Now write the assessment report:
`.trim();

    return prompt;
}