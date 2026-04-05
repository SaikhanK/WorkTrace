import { Controller, Get, Query } from "@nestjs/common";
import { HomeService } from "./home.service";

@Controller('api/home')
export class HomeController {
    constructor(private readonly homeService: HomeService) { }
    @Get()
    getTest(@Query('name') name: string): any {
        return this.homeService.getTest(name)
    }
}