import OpenAI from "openai";

const token = "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";

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: token,
});

async function main() {
    console.log("Testing OpenRouter...");
    const models = [
        "deepseek/deepseek-chat-v3-0324:free",
        "deepseek/deepseek-r1:free",
        "meta-llama/llama-4-maverick:free"
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
