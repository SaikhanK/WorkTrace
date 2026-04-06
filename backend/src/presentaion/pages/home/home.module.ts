import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { LlmService } from 'src/services/llm.service';
import { GithubProfileService } from 'src/services/github-profile.service';

@Module({
    imports: [
    ],
    providers: [HomeService, LlmService, GithubProfileService],
    controllers: [HomeController],
})
export class HomeModule { }