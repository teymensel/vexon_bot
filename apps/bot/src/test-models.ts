import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('API Key not found in .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Just to initialize? No, need separate method if available.
        // The SDK might not expose listModels directly easily in all versions, 
        // but let's try a standard way if available or just test a prompt with a different model.

        console.log("Testing gemini-pro...");
        try {
            const m = genAI.getGenerativeModel({ model: 'gemini-pro' });
            const r = await m.generateContent('Hello');
            console.log("gemini-pro works:", r.response.text());
        } catch (e: any) { console.log("gemini-pro failed:", e.message); }

        console.log("Testing gemini-1.5-flash...");
        try {
            const m = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const r = await m.generateContent('Hello');
            console.log("gemini-1.5-flash works:", r.response.text());
        } catch (e: any) { console.log("gemini-1.5-flash failed:", e.message); }

    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
