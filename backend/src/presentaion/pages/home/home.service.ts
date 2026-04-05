import { Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { HttpService } from '@nestjs/axios';
import { LlmService } from "src/services/llm.service";

@Injectable()
export class HomeService {
    constructor(private readonly httpService: HttpService, private llmService: LlmService) { }
    async getTest(name: string): Promise<any> {
        const response = await firstValueFrom(
            this.httpService.get(`https://api.github.com/users/${name}/repos`)
        );
        const test = this.llmService.chat("wie gehts")
        return test
    }
}
