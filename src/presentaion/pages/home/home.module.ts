import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { HttpModule } from '@nestjs/axios';
HttpModule
@Module({
    imports: [HttpModule],
    providers: [HomeService],
    controllers: [HomeController],
})
export class HomeModule {

}