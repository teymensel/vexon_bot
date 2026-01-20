import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.OPENROUTER_API_KEY;

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: token,
});

async function main() {
    console.log("Testing OpenRouter...");
    const models = [
        "google/gemini-2.0-flash-thinking-exp:free",
        "google/gemini-2.0-flash-exp:free",
        "google/gemini-exp-1206:free",
        "meta-llama/llama-3-8b-instruct:free",
        "microsoft/phi-3-mini-128k-instruct:free",
        "huggingfaceh4/zephyr-7b-beta:free",
        "liquid/lfm-40b:free",
    ];

    for (const model of models) {
        console.log(`\nTrying model: ${model}`);
        try {
            const completion = await openai.chat.completions.create({
                model: model,
                messages: [
                    { role: "user", content: "Say hello!" },
                ],
            });

            console.log(`Success (${model}):`, completion.choices[0].message.content);
            // If one works, we can stop or keep testing all
        } catch (error: any) {
            console.error(`Failed (${model}):`, error.message);
        }
    }
}

main();
