import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
    console.error('OPENROUTER_API_KEY not found');
    process.exit(1);
}

async function listModels() {
    try {
        const response = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            }
        });

        const models = response.data.data;
        console.log(`Found ${models.length} models.`);

        // Filter for deepseek or free
        const deepseek = models.filter((m: any) => m.id.includes('deepseek'));
        const free = models.filter((m: any) => m.id.includes(':free'));
        const llama = models.filter((m: any) => m.id.includes('llama') && m.id.includes('free'));

        console.log('\n--- DeepSeek Models ---');
        deepseek.forEach((m: any) => console.log(m.id));

        console.log('\n--- Free Models (Sample) ---');
        free.slice(0, 10).forEach((m: any) => console.log(m.id));

    } catch (error: any) {
        console.error('Error fetching models:', error.response ? error.response.data : error.message);
    }
}

listModels();
