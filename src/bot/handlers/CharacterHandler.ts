// src/bot/handlers/CharacterHandler.ts
import { Telegraf, Context } from 'telegraf';
import { v4 as uuidv4 } from 'uuid';
import {Logger} from "@utils/Logger";
import {UserModel} from "@models/User.model";
import {CharacterModel} from "@models/Character.model";
import {ChatSessionModel} from "@models/ChatSession.model";
import axios from 'axios'; // <-- Добавляем импорт axios

export class CharacterHandler {
    private bot: Telegraf;
    private logger = new Logger('CharacterHandler');

    constructor(bot: Telegraf) {
        this.bot = bot;
    }

    public async showWelcome(ctx: Context) {
        const userId = ctx.from?.id;
        if (!userId) return;

        this.logger.info(`User ${userId} started the bot.`);

        try {
            await UserModel.findOneAndUpdate(
                { id: userId },
                {
                    $set: {
                        firstName: ctx.from.first_name,
                        username: ctx.from.username || undefined,
                        lastName: ctx.from.last_name || undefined,
                    }
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            );

            await ctx.reply('🌟 Welcome to AI Anime Waifu! Choose an anime character to begin your unique conversation.').catch(this.logger.error);
            await this.showCharacters(ctx);
        } catch (error) {
            this.logger.error(`Error in showWelcome for user ${userId}:`, error);
            await ctx.reply('❌ Something went wrong during initialization. Please try again.').catch(this.logger.error);
        }
    }

    public async showCharacters(ctx: Context) {
        const userId = ctx.from?.id;
        if (!userId) return;

        this.logger.info(`User ${userId} requested characters.`);
        const characters = await CharacterModel.find({});

        if (characters.length === 0) {
            await ctx.reply('No characters available yet. Please contact support.').catch(this.logger.error);
            return;
        }

        const inlineKeyboard = characters.map(char => ([
            { text: char.name, callback_data: `character_${char.id}` }
        ]));

        await ctx.reply('Here are some characters you can talk to:', {
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        }).catch(this.logger.error);
    }

    public async selectCharacter(ctx: Context) {
        const callbackData = (ctx.callbackQuery as any)?.data;
        const characterId = callbackData?.split('_')[1];
        const userId = ctx.from?.id;

        if (!characterId || !userId || !ctx.callbackQuery) {
            this.logger.warn('Invalid character selection callback received.', { callbackData, userId, callbackQuery: ctx.callbackQuery });
            return;
        }

        try {
            this.logger.debug(`User ${userId} attempting to select character with ID from callback: "${characterId}"`);
            const selectedCharacter = await CharacterModel.findOne({ id: characterId });

            if (!selectedCharacter) {
                this.logger.error(`Character with ID "${characterId}" not found in DB for user ${userId}.`);
                await ctx.answerCbQuery('❌ Character not found.').catch(this.logger.error);
                await ctx.editMessageText('❌ Selected character not found. Please try again or select another.', { parse_mode: 'Markdown' }).catch(this.logger.error);
                await UserModel.findOneAndUpdate(
                    { id: userId },
                    { $unset: { selectedCharacterId: 1 }, $set: { updatedAt: new Date() } }
                );
                return;
            }

            await UserModel.findOneAndUpdate(
                { id: userId },
                { $set: { selectedCharacterId: characterId, updatedAt: new Date() } },
                { new: true }
            );

            let chatSession = await ChatSessionModel.findOne({ userId: userId, characterId: characterId });

            if (!chatSession) {
                chatSession = await ChatSessionModel.create({
                    id: uuidv4(),
                    userId: userId,
                    characterId: characterId,
                    startedAt: new Date(),
                    lastActivityAt: new Date(),
                    messageCount: 0,
                });
                this.logger.info(`New chat session created for user ${userId} with character ${characterId}: ${chatSession.id}`);
            } else {
                chatSession.lastActivityAt = new Date();
                await chatSession.save();
                this.logger.info(`Existing chat session reactivated for user ${userId} with character ${characterId}: ${chatSession.id}`);
            }

            await ctx.answerCbQuery(`You selected ${selectedCharacter.name}!`).catch(this.logger.error);
            await ctx.editMessageText(`You are now chatting with **${selectedCharacter.name}**. Say hello to begin!`, { parse_mode: 'Markdown' }).catch(this.logger.error);
            this.logger.info(`User ${userId} selected ${selectedCharacter.name} (ID: ${characterId}).`);

            // --- ОБНОВЛЕННЫЙ БЛОК ОТПРАВКИ ФОТО (с загрузкой в буфер) ---
            if (selectedCharacter.appearance.avatar && selectedCharacter.appearance.avatar.length > 5) {
                try {
                    this.logger.info(`Attempting to download avatar from URL: ${selectedCharacter.appearance.avatar}`);
                    const response = await axios.get(selectedCharacter.appearance.avatar, {
                        responseType: 'arraybuffer',
                        timeout: 15000 // Таймаут 15 секунд на скачивание
                    });

                    const imageBuffer = Buffer.from(response.data);
                    const contentType = response.headers['content-type'];

                    if (!contentType || !contentType.startsWith('image/')) {
                        this.logger.error(`Downloaded content is not an image for ${selectedCharacter.name} from URL: ${selectedCharacter.appearance.avatar}`);
                        await ctx.reply(`*Извини, не удалось обработать фото ${selectedCharacter.name}. Файл по ссылке не является изображением.*`, { parse_mode: 'Markdown' }).catch(console.error);
                        return;
                    }

                    // Определение расширения файла для filename
                    const fileExtension = contentType.split('/')[1] || 'png';

                    await ctx.replyWithPhoto({ source: imageBuffer, filename: `avatar.${fileExtension}` }, {
                        caption: `Это ${selectedCharacter.name} из "${selectedCharacter.series}". ${selectedCharacter.description}`
                    }).catch(async (photoError) => {
                        this.logger.error(`Failed to send avatar buffer to Telegram for ${selectedCharacter.name} to user ${userId}:`, photoError);
                        await ctx.reply(`*Извини, не удалось отправить фото ${selectedCharacter.name}. Возможно, файл слишком большой или произошла внутренняя ошибка Telegram.*`, { parse_mode: 'Markdown' }).catch(console.error);
                    });
                    this.logger.info(`Avatar buffer sent for selected character ${selectedCharacter.name} to user ${userId}.`);

                } catch (downloadError: any) {
                    this.logger.error(`Failed to download avatar for ${selectedCharacter.name} from URL ${selectedCharacter.appearance.avatar}:`, downloadError.message || downloadError);
                    await ctx.reply(`*Извини, не удалось загрузить фото ${selectedCharacter.name} по указанной ссылке. Пожалуйста, проверь URL.*`, { parse_mode: 'Markdown' }).catch(console.error);
                }
            } else {
                this.logger.warn(`Character ${selectedCharacter.name} (ID: ${characterId}) has no valid avatar URL.`);
                await ctx.reply(`*Извини, у персонажа ${selectedCharacter.name} пока нет доступного фото.*`, { parse_mode: 'Markdown' }).catch(console.error);
            }
            // --- КОНЕЦ ОБНОВЛЕННОГО БЛОКА ---

        } catch (error: any) {
            this.logger.error(`Error selecting character for user ${userId}:`, error.message || error);
            await ctx.answerCbQuery('Произошла ошибка при выборе персонажа.').catch(console.error);
            await ctx.editMessageText('❌ Что-то пошло не так при выборе персонажа. Пожалуйста, попробуй еще раз.', { parse_mode: 'Markdown' }).catch(console.error);
        }
    }

    public async showSettings(ctx: Context) {
        this.logger.info(`User ${ctx.from?.id} requested settings.`);
        await ctx.reply('Settings are not yet implemented.').catch(this.logger.error);
    }

    public async handleSettingsAction(ctx: Context) {
        const action = (ctx.callbackQuery as any)?.data.split('_')[1];
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery(`Settings action: ${action}`).catch(this.logger.error);
            this.logger.info(`User ${ctx.from?.id} performed settings action: ${action}.`);
        }
    }

    public async showHelp(ctx: Context) {
        this.logger.info(`User ${ctx.from?.id} requested help.`);
        await ctx.reply('Need help? Contact support or check the FAQ.').catch(this.logger.error);
    }
}