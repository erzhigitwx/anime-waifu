// src/services/image/HuggingFaceService.ts
import axios from 'axios';
import {Logger} from "@utils/Logger";
import {Environment} from "@config/environment";

interface HuggingFaceModel {
    url: string;
    name: string;
    supportsNSFW: boolean;
    quality: 'high' | 'medium' | 'low';
    speed: 'fast' | 'medium' | 'slow';
}

export class HuggingFaceService {
    private logger = new Logger('HuggingFaceService');
    private readonly HF_API_TOKEN: string;

    private readonly MODELS: Record<string, HuggingFaceModel> = {
        primary: {
            url: "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
            name: "Stable Diffusion XL Base 1.0",
            supportsNSFW: false, // Эта модель имеет сильные фильтры безопасности
            quality: 'high',
            speed: 'medium'
        },
    };

    private readonly MODEL_PRIORITY = {
        high: ['primary'],
        medium: ['primary'],
        fast: ['primary']
    };

    constructor() {
        this.HF_API_TOKEN = Environment.HUGGINGFACE_API_TOKEN;
        if (!this.HF_API_TOKEN) {
            this.logger.warn('HUGGINGFACE_API_TOKEN is not set. Image generation will be disabled.');
        }
    }

    public async generateImage(
        finalPrompt: string,
        negativePrompt: string,
        nsfwAllowed: boolean = false,
        preferredQuality: 'high' | 'medium' | 'fast' = 'high'
    ): Promise<string | null> {
        if (!this.HF_API_TOKEN) {
            this.logger.error('Hugging Face API token not available for image generation.');
            return null;
        }

        const modelOrder = this.MODEL_PRIORITY[preferredQuality];

        // --- ИСПРАВЛЕННАЯ ЛОГИКА ФИЛЬТРАЦИИ ---
        const availableModels = modelOrder
            .map(key => this.MODELS[key])
            .filter(model => {
                // Если NSFW разрешен, то модель должна поддерживать NSFW.
                // Если NSFW не разрешен, то модель должна НЕ поддерживать NSFW или быть универсальной.
                if (nsfwAllowed) {
                    return model && model.supportsNSFW;
                } else {
                    return model && !model.supportsNSFW; // ИЛИ ВЕРНУТЬ ВСЕ, ЕСЛИ МЫ ХОТИМ, ЧТОБЫ МОДЕЛЬ ПРОСТО ФИЛЬТРОВАЛА САМА
                }
            });
        // --- КОНЕЦ ИСПРАВЛЕННОЙ ЛОГИКИ ФИЛЬТРАЦИИ ---

        if (availableModels.length === 0) {
            // Более информативное сообщение
            this.logger.error(`No suitable models available for the requested content type (NSFW allowed: ${nsfwAllowed}).`);
            return null;
        }

        this.logger.info(`Trying ${availableModels.length} models for image generation...`);

        for (const model of availableModels) {
            this.logger.info(`Attempting image generation with ${model.name} (${model.url})...`);

            const result = await this.tryGenerateWithModel(model, finalPrompt, negativePrompt, nsfwAllowed);

            if (result) {
                this.logger.info(`Image successfully generated with ${model.name}`);
                return result;
            }

            await this.sleep(2000);
        }

        this.logger.error('All models failed to generate image.');
        return null;
    }

    private async tryGenerateWithModel(
        model: HuggingFaceModel,
        prompt: string,
        negativePrompt: string,
        nsfwAllowed: boolean
    ): Promise<string | null> {
        try {
            // Установка разрешения для SDXL
            const width = 768; // Стандарт для SDXL
            const height = 768; // Стандарт для SDXL

            const requestData: any = {
                inputs: prompt,
                parameters: {
                    negative_prompt: negativePrompt,
                    num_inference_steps: this.getInferenceSteps(model),
                    guidance_scale: 7.5,
                    width: width,
                    height: height
                },
                options: {
                    wait_for_model: true,
                    use_cache: false
                }
            };

            const response = await axios.post(
                model.url,
                requestData,
                {
                    headers: {
                        Authorization: `Bearer ${this.HF_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer',
                    timeout: this.getTimeout(model),
                    validateStatus: (status) => status < 500
                }
            );

            if (response.status >= 400) {
                const errorText = Buffer.from(response.data).toString('utf8');
                this.logger.warn(`${model.name} returned error ${response.status}: ${errorText}`);
                return null;
            }

            const contentType = response.headers['content-type'];

            if (!contentType?.startsWith('image/')) {
                const errorText = Buffer.from(response.data).toString('utf8');
                this.logger.warn(`${model.name} returned non-image response (type: ${contentType}): ${errorText.slice(0, 200)}`);
                return null;
            }

            const base64Image = Buffer.from(response.data).toString('base64');
            const dataUrl = `data:${contentType};base64,${base64Image}`;

            this.logger.info(`Image generated successfully with ${model.name}`);
            return dataUrl;

        } catch (error: any) {
            const errorMessage = this.getErrorMessage(error, model);
            this.logger.warn(`${model.name}: ${errorMessage}`);
            return null;
        }
    }

    private getInferenceSteps(model: HuggingFaceModel): number {
        switch (model.quality) {
            case 'high': return 30; // Увеличены шаги для SDXL
            case 'medium': return 20;
            case 'low': return 10;
            default: return 20;
        }
    }

    private getTimeout(model: HuggingFaceModel): number {
        return 120000; // Увеличен таймаут до 2 минут для SDXL
    }

    private getErrorMessage(error: any, model: HuggingFaceModel): string {
        if (error.response?.status === 503) {
            return `Model is currently loading or overloaded. Hugging Face message: ${error.response?.data ? Buffer.from(error.response.data).toString('utf8').slice(0, 100) : ''}`;
        } else if (error.response?.status === 400) {
            return `Invalid request parameters or prompt rejected by content filter. Hugging Face message: ${error.response?.data ? Buffer.from(error.response.data).toString('utf8').slice(0, 100) : ''}`;
        } else if (error.response?.status === 404) {
            return `Model not found or not available. Hugging Face message: ${error.response?.data ? Buffer.from(error.response.data).toString('utf8').slice(0, 100) : ''}`;
        } else if (error.response?.status === 429) {
            return 'Rate limit exceeded. Please wait before making another request.';
        } else if (error.code === 'ETIMEDOUT') {
            return 'Request timed out. The model may be overloaded or too slow.';
        } else if (error.code === 'ECONNREFUSED') {
            return 'Connection refused. Service may be temporarily unavailable.';
        }
        return error.message || 'Unknown error occurred.';
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async checkModelsHealth(): Promise<Record<string, boolean>> {
        const health: Record<string, boolean> = {};

        if (!this.HF_API_TOKEN) {
            this.logger.warn('No API token available for health check');
            return health;
        }

        const model = this.MODELS.primary; // Проверяем только 'primary' модель
        try {
            this.logger.debug(`Checking health of ${model.name}...`);

            const testRequest = {
                inputs: "a cat",
                parameters: {
                    num_inference_steps: 1
                },
                options: {
                    wait_for_model: false
                }
            };

            const response = await axios.post(model.url, testRequest, {
                headers: {
                    Authorization: `Bearer ${this.HF_API_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'image/png'
                },
                timeout: 15000,
                validateStatus: (status) => status < 500
            });

            health.primary = response.status !== 404 && response.status !== 403;
            this.logger.debug(`${model.name} health check: ${health.primary ? 'healthy' : 'unhealthy'} (status: ${response.status})`);

        } catch (error: any) {
            health.primary = false;
            this.logger.debug(`${model.name} health check failed: ${error.message}`);
        }

        return health;
    }
}