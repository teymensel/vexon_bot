import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();

// List of OpenRouter models to try in order (Free tier priority)
// Validated via verify-openrouter.ts
// List of OpenRouter models to try in order (Free tier priority)
// Validated via valid_model.txt (Content: google/gemini-2.5-flash-image)
const MODELS_TO_TRY = [
    "google/gemini-2.5-flash-image", // Verified working by script
    "google/gemini-2.0-pro-exp-02-05:free",
    "google/gemini-2.0-flash-thinking-exp:free",
    "deepseek/deepseek-r1:free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
];

let openai: OpenAI | null = null;

export async function generateAIResponse(prompt: string, context?: string, imageUrl?: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        console.warn('[AI Service] OPENROUTER_API_KEY is not set in environment.');
        return 'AI servisi devre dışı (Token eksik).';
    }

    // Lazy initialization
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
        // Vision Payload
        messages.push({
            role: "user",
            content: [
                { type: "text", text: context ? `${context}\n\n${prompt}` : prompt },
                {
                    type: "image_url",
                    image_url: {
                        url: imageUrl
                    }
                }
            ]
        });
    } else {
        // Text-only Payload
        const fullPrompt = context
            ? `Context: ${context}\n\nUser: ${prompt}`
            : prompt;

        messages.push({ role: "user", content: fullPrompt });
    }

    // Try each model until one works
    for (const modelName of MODELS_TO_TRY) {
        try {
            // Skip DeepSeek for images (it's text only usually)
            if (imageUrl && modelName.includes('deepseek')) {
                continue;
            }

            const completion = await openai.chat.completions.create({
                model: modelName,
                messages: messages,
            });

            const reply = completion.choices[0].message.content;
            if (reply) return reply; // Success

        } catch (error: any) {
            // Log minimal error for retry
            console.warn(`[AI Service] Model ${modelName} failed or busy. Trying next... (${error.message || 'Unknown Error'})`);
            continue;
        }
    }

    // If all failed
    console.error('[AI Service] All OpenRouter models failed.');
    return 'Şu anda hiçbir AI modeline erişilemedi. Sunucular yoğun olabilir.';
}
