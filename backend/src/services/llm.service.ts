import { Injectable } from "@nestjs/common";
import Groq from "groq-sdk";

@Injectable()
export class LlmService {
    private groq: Groq;

    constructor() {
        this.groq = new Groq({
            apiKey: '',
        });
    }

    async chat(prompt: string) {
        const response = await this.groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        return response.choices[0].message.content;
    }
}