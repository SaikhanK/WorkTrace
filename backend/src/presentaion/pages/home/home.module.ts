import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { HttpModule } from '@nestjs/axios';
import { LlmService } from 'src/services/llm.service';
HttpModule
@Module({
    imports: [HttpModule],
    providers: [HomeService, LlmService],
    controllers: [HomeController],
})
export class HomeModule {

}