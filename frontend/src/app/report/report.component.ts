import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIf, NgClass } from '@angular/common';

interface GithubReportResponse {
    username: string;
    report: string;
}

type AppState = 'idle' | 'loading' | 'success' | 'error';

@Component({
    selector: 'app-report',
    standalone: true,
    imports: [FormsModule, NgIf, NgClass],
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.scss'],
})
export class ReportComponent {
    username = '';
    state = signal<AppState>('idle');
    report = signal<string>('');
    reportedUser = signal<string>('');
    errorMessage = signal<string>('');

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