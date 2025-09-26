// src/services/image/ImageGenerationService.ts
import { HuggingFaceService } from './HuggingFaceService';
import { Logger } from '@utils/Logger';

interface ImageGenerationOptions {
    character?: string;
    nsfwAllowed?: boolean;
    quality?: 'high' | 'medium' | 'fast';
    style?: 'anime' | 'realistic' | 'artistic';
}

export class ImageGenerationService {
    private huggingFaceService: HuggingFaceService;
    private logger = new Logger('ImageGenerationService');

    constructor() {
        this.huggingFaceService = new HuggingFaceService();
    }

    public async generateCharacterImage(
        prompt: string,
        options: ImageGenerationOptions = {}
    ): Promise<string | null> {
        const {
            character,
            nsfwAllowed = false,
            quality = 'high',
            style = 'anime'
        } = options;

        // Validate prompt
        if (!prompt || prompt.trim().length === 0) {
            this.logger.error('Empty prompt provided for image generation');
            return null;
        }

        // Process prompt based on character and style
        const processedPrompt = this.processPrompt(prompt, character, style, nsfwAllowed);
        const negativePrompt = this.getNegativePrompt(nsfwAllowed);

        this.logger.info(`Generating image for character: ${character || 'unknown'}`);
        this.logger.debug(`Processed prompt (final): "${processedPrompt}"`);
        this.logger.debug(`Negative prompt: "${negativePrompt}"`);


        try {
            const result = await this.huggingFaceService.generateImage(
                processedPrompt,
                negativePrompt,
                nsfwAllowed,
                quality // Передаем preferredQuality в HuggingFaceService
            );

            if (result) {
                this.logger.info('Image generation successful');
                return result;
            }

            this.logger.error('Image generation failed after trying all providers.');
            return null;

        } catch (error: any) {
            this.logger.error('Image generation error:', error.message);
            return null;
        }
    }

    private processPrompt(prompt: string, character?: string, style: string = 'anime', nsfwAllowed: boolean = false): string {
        let processed = prompt;

        const characterEnhancements: Record<string, string> = {
            'sakura haruno': 'sakura haruno from naruto, pink hair, green eyes, ninja headband, determined expression',
            'kirito': 'kirito from sword art online, black hair, dark eyes, black outfit, confident pose',
            'asuna': 'asuna yuuki from sword art online, chestnut hair, hazel eyes, white and red outfit',
            'rem': 'rem from re:zero, blue hair, blue eyes, maid outfit, gentle smile',
            'levi ackerman': 'levi ackerman from attack on titan, black hair, grey eyes, survey corps uniform, serious expression',
            'goku': 'goku from dragon ball, spiky black hair, orange gi, muscular build',
            'nezuko kamado': 'nezuko kamado from demon slayer, long black hair with orange tips, bamboo muzzle, pink kimono',
            'monkey d. luffy': 'monkey d. luffy from one piece, black messy hair, straw hat, red vest',
            'mikasa ackerman': 'mikasa ackerman from attack on titan, short black hair, red scarf, survey corps uniform',
            'satoru gojo': 'satoru gojo from jujutsu kaisen, white spiky hair, blindfold, black jujutsu uniform',
            'zero two': 'zero two from darling in the franxx, long pink hair, red horns, pilot suit',
            'eren yeager': 'eren yeager from attack on titan, short brown hair, green eyes, survey corps uniform',
            'ram': 'ram from re:zero, short pink hair, maid outfit, sarcastic expression',
            'ryuk': 'ryuk from death note, tall shinigami, black skin, red eyes, large wings',
            'colossal titan': 'colossal titan from attack on titan, 60 meters tall, skinless, exposed muscle, emitting steam'
        };

        if (character) {
            // Ищем совпадение по полному имени или ID, если промпт начинается с имени
            const charKey = character.toLowerCase();
            if (characterEnhancements[charKey]) {
                processed = `${characterEnhancements[charKey]}, ${processed}`;
            }
        }

        switch (style) {
            case 'anime':
                processed = `anime art style, ${processed}, detailed anime face, expressive anime eyes, vibrant colors`;
                break;
            case 'realistic':
                processed = `photorealistic, ${processed}, detailed skin texture, natural lighting`;
                break;
            case 'artistic':
                processed = `artistic illustration, ${processed}, painterly style, beautiful composition`;
                break;
        }

        const qualityModifiers = [
            'masterpiece',
            'best quality',
            'highly detailed',
            'sharp focus',
            'professional artwork',
            'perfect anatomy',
            'beautiful lighting'
        ].join(', ');

        processed = `${processed}, ${qualityModifiers}`;

        if (nsfwAllowed) {
            processed += ', (explicit), (nude), (sexy)';
        } else {
            processed += ', safe for work, appropriate';
        }

        return processed.toLowerCase();
    }

    private getNegativePrompt(nsfwAllowed: boolean): string {
        const baseNegative = [
            'blurry', 'low quality', 'worst quality', 'low resolution', 'bad anatomy', 'bad hands', 'bad face',
            'deformed', 'ugly', 'duplicate', 'morbid', 'mutilated', 'poorly drawn hands', 'poorly drawn face',
            'mutation', 'malformed limbs', 'extra limbs', 'cloned face', 'gross proportions', 'missing arms',
            'missing legs', 'extra arms', 'extra legs', 'fused fingers', 'too many fingers', 'long neck'
        ];

        if (!nsfwAllowed) {
            baseNegative.push(
                'nsfw', 'nude', 'naked', 'explicit', 'sexual', 'inappropriate', 'porn', 'erotic'
            );
        }

        return baseNegative.join(', ');
    }

    public getPlaceholderImage(character?: string): string {
        const placeholders: Record<string, string> = {
            'sakura haruno': 'https://example.com/placeholder-sakura.jpg',
            'kirito': 'https://example.com/placeholder-kirito.jpg',
            'asuna': 'https://example.com/placeholder-asuna.jpg',
            'rem': 'https://example.com/placeholder-rem.jpg',
            'default': 'https://example.com/placeholder-anime.jpg'
        };

        // Используем полное имя персонажа для поиска, если доступно
        return placeholders[character?.toLowerCase() || 'default'] || placeholders.default;
    }

    public async checkHealth(): Promise<boolean> {
        try {
            const modelsHealth = await this.huggingFaceService.checkModelsHealth();
            const availableModels = Object.values(modelsHealth).filter(Boolean).length;

            this.logger.info(`Health check: ${availableModels} models available`);
            return availableModels > 0;
        } catch (error) {
            this.logger.error('Health check failed:', error);
            return false;
        }
    }

    public async getModelsHealth(): Promise<Record<string, boolean>> {
        try {
            return await this.huggingFaceService.checkModelsHealth();
        } catch (error) {
            this.logger.error('Failed to get models health:', error);
            return {};
        }
    }
}