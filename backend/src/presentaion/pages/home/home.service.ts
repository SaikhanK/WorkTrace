import { Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { HttpService } from '@nestjs/axios';

@Injectable()
export class HomeService {
    constructor(private readonly httpService: HttpService) { }
    async getTest(name: string): Promise<any> {
        const response = await firstValueFrom(
            this.httpService.get(`https://api.github.com/users/${name}/repos`)
        );
        console.log(response)
        return response.data
    }
}
