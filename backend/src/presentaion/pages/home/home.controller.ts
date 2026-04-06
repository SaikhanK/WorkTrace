import { Controller, Get, Query } from "@nestjs/common";
import { HomeService } from "./home.service";

@Controller('api/home')
export class HomeController {
    constructor(private readonly homeService: HomeService) { }

    @Get()
    getGithubReport(@Query('username') username: string): any {
        return this.homeService.getGithubReport(username);
    }
}