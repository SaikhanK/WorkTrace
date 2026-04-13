import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIf, NgFor, NgClass } from '@angular/common';

interface GithubReportResponse {
    username: string;
    report: string;
}

interface ReportSection {
    title: string;
    icon: string;
    paragraphs: string[];
    bullets: string[];
}

interface ParsedReport {
    verdict: string;
    verdictPositive: boolean;
    sections: ReportSection[];
}

type AppState = 'idle' | 'loading' | 'success' | 'error';

const SECTION_ICONS: Record<string, string> = {
    'einleitung': '◎',
    'aktivität': '◈',
    'technical': '⬡',
    'open-source': '◉',
    'code quality': '◇',
    'red flags': '△',
    'zusammenfassung': '◆',
    'empfehlung': '▶',
    default: '◎',
};

function getSectionIcon(title: string): string {
    const lower = title.toLowerCase();
    for (const key of Object.keys(SECTION_ICONS)) {
        if (lower.includes(key)) return SECTION_ICONS[key];
    }
    return SECTION_ICONS['default'];
}

function parseReport(raw: string): ParsedReport {
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let verdict = '';
    let verdictPositive = false;
    const sections: ReportSection[] = [];
    let currentSection: ReportSection | null = null;

    for (const line of lines) {
        const clean = line.replace(/\*\*/g, '').trim();

        if (clean.toLowerCase().includes('assessment report') || clean.toLowerCase().includes('freelancer assessment')) {
            continue;
        }

        if (clean.toLowerCase().startsWith('freelance potential:') || clean.toLowerCase().startsWith('freelance-potenzial:')) {
            verdict = clean.split(':').slice(1).join(':').trim();
            const lower = verdict.toLowerCase();
            verdictPositive = lower.includes('ja') || lower.includes('yes') || lower.includes('hoch');
            continue;
        }

        if (clean.toLowerCase().startsWith('name:')) {
            continue;
        }

        const isSectionHeading = /^[A-ZÄÖÜ].{2,60}:$/.test(clean) || /^\*\*[^*]+\*\*$/.test(line);
        const headingText = clean.replace(/:$/, '');

        if (isSectionHeading && headingText.length < 80) {
            if (currentSection) sections.push(currentSection);
            currentSection = { title: headingText, icon: getSectionIcon(headingText), paragraphs: [], bullets: [] };
            continue;
        }

        if (/^[-–•]/.test(clean)) {
            const bullet = clean.replace(/^[-–•]\s*/, '');
            if (!currentSection) {
                currentSection = { title: 'Details', icon: '◎', paragraphs: [], bullets: [] };
            }
            currentSection.bullets.push(bullet);
            continue;
        }

        if (clean.length > 0) {
            if (!currentSection) {
                currentSection = { title: 'Übersicht', icon: '◎', paragraphs: [], bullets: [] };
            }
            currentSection.paragraphs.push(clean);
        }
    }

    if (currentSection) sections.push(currentSection);

    return { verdict, verdictPositive, sections };
}

@Component({
    selector: 'app-report',
    standalone: true,
    imports: [FormsModule, NgIf, NgFor, NgClass],
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.scss'],
})
export class ReportComponent {
    username = '';
    state = signal<AppState>('idle');
    report = signal<string>('');
    reportedUser = signal<string>('');
    errorMessage = signal<string>('');

    parsedReport = computed<ParsedReport>(() => parseReport(this.report()));

    constructor(private http: HttpClient) { }

    fetchReport(): void {
        if (!this.username.trim()) return;

        this.state.set('loading');
        this.errorMessage.set('');

        this.http
            .get<GithubReportResponse>(`/api/home?username=${encodeURIComponent(this.username.trim())}`)
            .subscribe({
                next: (res) => {
                    this.report.set(res.report);
                    this.reportedUser.set(res.username);
                    this.state.set('success');
                },
                error: (err) => {
                    const msg =
                        err.status === 404
                            ? 'GitHub-Nutzer nicht gefunden.'
                            : err.status === 429
                                ? 'GitHub API-Limit erreicht. Bitte später erneut versuchen.'
                                : 'Ein unbekannter Fehler ist aufgetreten.';
                    this.errorMessage.set(msg);
                    this.state.set('error');
                },
            });
    }

    reset(): void {
        this.state.set('idle');
        this.username = '';
        this.report.set('');
        this.reportedUser.set('');
    }

    onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') this.fetchReport();
    }
}