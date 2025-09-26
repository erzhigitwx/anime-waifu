// src/bot/handlers/ImageHandler.ts
import { Telegraf, Context } from 'telegraf';
import {Logger} from "@utils/Logger";
import {ImageGenerationService} from "@services/image/ImageGeneratorServise";
import {UserModel} from "@models/User.model";
import {CharacterModel} from "@models/Character.model";

export class ImageHandler {
    private bot: Telegraf;
    private logger = new Logger('ImageHandler');
    private imageGenerationService: ImageGenerationService;

    constructor(bot: Telegraf) {
        this.bot = bot;
        this.imageGenerationService = new ImageGenerationService();
    }

    public async handleGenerateImageCommand(ctx: Context) {
        const userId = ctx.from?.id;
        const messageText = (ctx.message as any)?.text;
        const prompt = messageText?.replace('/genimage', '').trim();

        if (!userId) {
            this.logger.warn('Received /genimage command without user ID.');
            return;
        }

        if (!prompt) {
            await ctx.reply('Please provide a prompt for the image. Usage: `/genimage Your detailed image description`').catch(this.logger.error);
            return;
        }

        // --- ИЗВЛЕКАЕМ НАСТРОЙКИ ПЕРСОНАЖА И ПОЛЬЗОВАТЕЛЯ ---
        const user = await UserModel.findOne({ id: userId });
        if (!user || !user.selectedCharacterId) {
            await ctx.reply('Please select a character first to generate an image related to them. Use /start or /characters.').catch(this.logger.error);
            return;
        }

        const selectedCharacter = await CharacterModel.findOne({ id: user.selectedCharacterId });
        if (!selectedCharacter) {
            await ctx.reply('Your selected character was not found. Please select another using /characters.').catch(this.logger.error);
            user.selectedCharacterId = undefined;
            await user.save();
            return;
        }

        const characterName = selectedCharacter.name;
        // nsfwAllowed берется из настроек персонажа
        const nsfwAllowed = selectedCharacter.settings.nsfwAllowed;
        // --- КОНЕЦ ИЗВЛЕЧЕНИЯ НАСТРОЕК ---

        this.logger.info(`User ${userId} triggered image generation - Character: ${characterName}, Prompt: "${prompt}"`);
        this.logger.info(`User ${userId} requested image generation - Character: ${characterName}, Prompt: "${prompt}", NSFW: ${nsfwAllowed}`);

        await ctx.reply('Generating image... please wait. 🎨').catch(this.logger.error);

        try {
            const dataUrl = await this.imageGenerationService.generateCharacterImage(prompt, {
                character: characterName, // Передаем имя персонажа
                nsfwAllowed: nsfwAllowed,
                quality: selectedCharacter.settings.imageGeneration ? 'high' : 'medium', // Пример: качество зависит от настроек персонажа
                style: 'anime' // Пока жестко задан аниме стиль
            });

            if (dataUrl) {
                if (dataUrl.startsWith('data:image/')) {
                    const parts = dataUrl.split(',');
                    const base64Image = parts[1];
                    const imageBuffer = Buffer.from(base64Image, 'base64');

                    await ctx.replyWithPhoto({ source: imageBuffer, filename: 'generated_image.png' }, {
                        caption: `Here is your image based on "${prompt}"!`
                    }).catch(async (error) => {
                        this.logger.error(`Error sending image buffer to Telegram for user ${userId}:`, error);
                        await ctx.reply('❌ Could not send the image directly. It might be too large or there was an internal error.').catch(this.logger.error);
                        await ctx.reply(`Debug: Image generated successfully as Data URL. You might need to manually view it (link might be too long): ${dataUrl.substring(0, 100)}...`).catch(this.logger.error);
                    });
                    this.logger.info(`Image buffer sent to Telegram for user ${userId} for prompt: "${prompt}"`);

                } else {
                    await ctx.replyWithPhoto({ url: dataUrl }).catch(this.logger.error);
                    this.logger.info(`Image sent to user ${userId} for prompt: "${prompt}"`);
                }
            } else {
                this.logger.warn(`Image generation failed for user ${userId} with prompt: "${prompt}"`);
                await ctx.reply('❌ Could not generate an image for that prompt. Please try again or with a different prompt.').catch(this.logger.error);
            }
        } catch (error: any) {
            this.logger.error(`Error during image generation process for user ${userId}:`, error);
            await ctx.reply('❌ An unexpected error occurred during image generation.').catch(this.logger.error);
        }
    }

    public async handleUserPhoto(ctx: Context) {
        this.logger.info(`User ${ctx.from?.id} sent a photo.`);
        await ctx.reply('Thanks for the photo! I can\'t process images from users yet, but I can generate them.').catch(this.logger.error);
    }
}