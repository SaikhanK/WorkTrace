import { Injectable } from "@nestjs/common";
import { LlmService } from "src/services/llm.service";
import { buildReportPrompt } from "src/services/github-report-prompt.builder";
import { GithubProfileService } from "src/services/github-profile.service";

@Injectable()
export class HomeService {
    constructor(
        private readonly githubProfileService: GithubProfileService,
        private readonly llmService: LlmService,
    ) { }

    async getGithubReport(username: string): Promise<{ report: string; username: string }> {
        const githubData = await this.githubProfileService.fetchProfileData(username);
        const prompt = buildReportPrompt(githubData);
        const report = await this.llmService.chat(prompt);

        return {
            username,
            report: report ?? "Kein Bericht generiert.",
        };
    }
}