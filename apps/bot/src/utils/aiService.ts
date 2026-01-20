import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();

// List of OpenRouter models to try in order (Free tier priority)
const MODELS_TO_TRY = [
    "google/gemini-2.0-flash-lite-preview-02-05:free", // Newest Flash Lite
    "google/gemini-2.0-pro-exp-02-05:free",            // Newest Pro Exp
    "deepseek/deepseek-r1-distill-llama-70b:free",     // DeepSeek R1 (Very popular)
    "qwen/qwen-2.5-vl-72b-instruct:free",              // Qwen VL (Vision supported)
    "meta-llama/llama-3.3-70b-instruct:free",           // Llama 3.3
    "mistralai/mistral-nemo:free",                       // Mistral Nemo
    "google/gemini-2.0-flash-exp:free"                   // Fallback Flash
];

// List of Groq models to try as fallback
const GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768",
    "gemma2-9b-it"
];

let openai: OpenAI | null = null;
let groqClient: OpenAI | null = null;

export async function generateAIResponse(prompt: string, context?: string, imageUrl?: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    // --- 1. TRY OPENROUTER ---
    if (apiKey) {
        if (!openai) {
            openai = new OpenAI({
                baseURL: "https://openrouter.ai/api/v1",
                apiKey: apiKey,
            });
        }

        const messages: any[] = [
            { role: "system", content: "You are a helpful Discord assistant. Keep answers concise." }
        ];

        if (imageUrl) {
            messages.push({
                role: "user",
                content: [
                    { type: "text", text: context ? `${context}\n\n${prompt}` : prompt },
                    { type: "image_url", image_url: { url: imageUrl } }
                ]
            });
        } else {
            const fullPrompt = context ? `Context: ${context}\n\nUser: ${prompt}` : prompt;
            messages.push({ role: "user", content: fullPrompt });
        }

        for (const modelName of MODELS_TO_TRY) {
            try {
                if (imageUrl && modelName.includes('deepseek')) continue;
                const completion = await openai.chat.completions.create({ model: modelName, messages: messages });
                const reply = completion.choices[0].message.content;
                if (reply) return reply;
            } catch (error: any) {
                console.warn(`[AI Service] OpenRouter Model ${modelName} failed: ${error.message}`);
                continue;
            }
        }
    } else {
        console.warn('[AI Service] OPENROUTER_API_KEY missing.');
    }

    // --- 2. TRY GROQ FALLBACK ---
    if (groqKey) {
        console.log('[AI Service] OpenRouter failed/missing. Switching to GROQ...');
        if (!groqClient) {
            groqClient = new OpenAI({
                baseURL: "https://api.groq.com/openai/v1",
                apiKey: groqKey,
            });
        }

        const messages: any[] = [
            { role: "system", content: "You are a helpful Discord assistant. Keep answers concise." }
        ];

        // Groq primarily supports text (Llama/Mixtral). Vision support varies (Llama 3.2 11B/90B Vision exists but maybe not on free tier or stable yet).
        // We will try to send image if model is 'llama-3.2-11b-vision-preview' etc, but let's stick to text reliable ones first.
        // If image provided, we warn/skip or try? Groq has 'llama-3.2-90b-vision-preview'. Let's add it.

        if (imageUrl) {
            // Basic vision check or just convert to text-only prompt if simple models
            // For now, assume text fallback if image fails, but let's try vision model first
            // GROQ_MODELS.unshift("llama-3.2-90b-vision-preview");
            // Actually, the user asked for "llama-3.3-70b-versatile" etc. Let's just strip image if model doesn't support it or try.
            // Simplest: Just send text to Groq for now to ensure reliability, or try ONE vision model.

            // Let's strip image for fallback reliability unless we are sure.
            // Or better: Append "[Image URL: ...]" to text.
            const fullPrompt = context ? `Context: ${context}\n\nUser: ${prompt} [Image: ${imageUrl}]` : `${prompt} [Image: ${imageUrl}]`;
            messages.push({ role: "user", content: fullPrompt });
        } else {
            const fullPrompt = context ? `Context: ${context}\n\nUser: ${prompt}` : prompt;
            messages.push({ role: "user", content: fullPrompt });
        }

        for (const modelName of GROQ_MODELS) {
            try {
                const completion = await groqClient.chat.completions.create({
                    model: modelName,
                    messages: messages,
                    max_completion_tokens: 1024,
                    temperature: 0.7
                });
                const reply = completion.choices[0].message.content;
                if (reply) return reply;
            } catch (error: any) {
                console.warn(`[AI Service] Groq Model ${modelName} failed: ${error.message}`);
                continue;
            }
        }
    } else {
        console.warn('[AI Service] GROQ_API_KEY missing.');
    }

    console.error('[AI Service] All AI Providers failed.');
    return 'Şu anda hiçbir AI servisine (OpenRouter veya Groq) erişilemedi. Lütfen daha sonra tekrar deneyin.';
}
