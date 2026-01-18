import axios from 'axios';
import dotenv from 'dotenv';
import OpenAI from "openai";

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
    console.error('OPENROUTER_API_KEY not found');
    process.exit(1);
}

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
});

async function findWorkingModel() {
    console.log("Fetching available models...");
    try {
        const response = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        const allModels = response.data.data;
        // Filter for specific reliable free models or just any free model
        const candidates = allModels
            .filter((m: any) => m.id.includes(':free') || m.id.includes('deepseek') || m.id.includes('gemini'))
            .map((m: any) => m.id);

        console.log(`Found ${candidates.length} candidate models.`);

        // Prioritize commonly known good ones if in list
        const priority = candidates.filter((id: string) => id.includes('deepseek/deepseek-chat') || id.includes('google/gemini'));
        const others = candidates.filter((id: string) => !priority.includes(id));
        const testList = [...priority, ...others].slice(0, 10); // Limit to top 10 to save time

        console.log("Testing top candidates:", testList);

        for (const modelId of testList) {
            console.log(`Testing ${modelId}...`);
            try {
                const start = Date.now();
                const completion = await openai.chat.completions.create({
                    model: modelId,
                    messages: [{ role: "user", content: "Hi" }],
                });
                const duration = Date.now() - start;

                if (completion.choices[0].message.content) {
                    console.log(`\nSUCCESS! Working Model Found: ${modelId}`);
                    // Write to file for checking
                    const fs = require('fs');
                    fs.writeFileSync('valid_model.txt', modelId);

                    console.log(`Response time: ${duration}ms`);
                    return; // Stop after finding first working one
                }
            } catch (error: any) {
                console.log(`Failed ${modelId}: ${error.status || error.message}`);
            }
        }

        console.log("No working models found in the candidate list.");

    } catch (error: any) {
        console.error('Error fetching list:', error.response ? error.response.data : error.message);
    }
}

findWorkingModel();
