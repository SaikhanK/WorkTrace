import { Injectable } from "@nestjs/common";
import Groq from "groq-sdk";

@Injectable()
export class LlmService {
    private groq: Groq;

    constructor() {
        this.groq = new Groq({
            apiKey: process.env.LLM_API_KEY,
        });
    }
}