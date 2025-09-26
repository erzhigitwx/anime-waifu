import { Telegraf, Context } from 'telegraf';
import { Logger } from '@utils/Logger';
import { GeminiService } from '@services/ai/GeminiService';
import { CharacterModel } from '@models/Character.model';
import { UserModel } from '@models/User.model';
import { ChatSessionModel } from '@models/ChatSession.model';
import { ChatMessageModel } from '@models/ChatMessage.model';
import { v4 as uuidv4 } from 'uuid';

export class ChatHandler {
    private bot: Telegraf;
    private logger = new Logger('ChatHandler');
    private geminiService: GeminiService;

    constructor(bot: Telegraf) {
        this.bot = bot;
        this.geminiService = new GeminiService();
    }

    public async handleTextMessage(ctx: Context) {
        const userId = ctx.from?.id;
        const userMessageText = (ctx.message as any)?.text;
        if (!userId || !userMessageText) return;

        if (userMessageText.startsWith('/')) {
            this.logger.debug(`User ${userId} sent a command: "${userMessageText}". Delegating to specific command handlers.`);
            return; // Завершаем выполнение этого обработчика
        }

        this.logger.info(`User ${userId} sent message: "${userMessageText}"`);

        try {
            const user = await UserModel.findOne({ id: userId });
            if (!user || !user.selectedCharacterId) {
                await ctx.reply('Please select a character first using the /start command.').catch(this.logger.error);
                return;
            }

            const selectedCharacter = await CharacterModel.findOne({ id: user.selectedCharacterId });
            if (!selectedCharacter) {
                await ctx.reply('Your selected character was not found. Please select another using /characters.').catch(this.logger.error);
                user.selectedCharacterId = undefined;
                await user.save();
                return;
            }

            let chatSession = await ChatSessionModel.findOne({ userId: userId, characterId: selectedCharacter.id });
            if (!chatSession) {
                chatSession = await ChatSessionModel.create({
                    id: uuidv4(),
                    userId: userId,
                    characterId: selectedCharacter.id,
                    startedAt: new Date(),
                    lastActivityAt: new Date(),
                    messageCount: 0,
                });
                this.logger.warn(`Chat session not found for user ${userId} with character ${selectedCharacter.id}. Created a new one.`);
            }

            const memoryDepth = selectedCharacter.settings.memoryDepth;
            const recentMessages = await ChatMessageModel.find({ sessionId: chatSession.id })
                .sort({ timestamp: 1 })
                .limit(memoryDepth * 2)
                .lean();

            const chatHistory: { role: 'user' | 'model', parts: { text: string }[] }[] = recentMessages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));

            await ChatMessageModel.create({
                id: uuidv4(),
                sessionId: chatSession.id,
                sender: 'user',
                text: userMessageText,
                timestamp: new Date(),
                geminiParts: [{ text: userMessageText }]
            });
            chatSession.messageCount++;
            chatSession.lastActivityAt = new Date();
            await chatSession.save();

            const botResponse = await this.geminiService.generateResponse(selectedCharacter.toObject(), chatHistory, userMessageText);
            await ctx.reply(botResponse).catch(this.logger.error);

            await ChatMessageModel.create({
                id: uuidv4(),
                sessionId: chatSession.id,
                sender: 'bot',
                text: botResponse,
                timestamp: new Date(),
                geminiParts: [{ text: botResponse }]
            });
            chatSession.messageCount++;
            chatSession.lastActivityAt = new Date();
            await chatSession.save();

        } catch (error) {
            this.logger.error(`Error generating AI response for user ${userId}:`, error);
            await ctx.reply('I\'m having trouble responding right now. Please try again later.').catch(this.logger.error);
        }
    }

    public async resetConversation(ctx: Context) {
        const userId = ctx.from?.id;
        if (!userId) return;

        this.logger.info(`User ${userId} requested to reset conversation.`);

        try {
            const user = await UserModel.findOne({ id: userId });
            if (!user || !user.selectedCharacterId) {
                await ctx.reply('You don\'t have an active conversation to reset.').catch(this.logger.error);
                return;
            }

            const chatSession = await ChatSessionModel.findOne({ userId: userId, characterId: user.selectedCharacterId });

            if (chatSession) {
                await ChatMessageModel.deleteMany({ sessionId: chatSession.id });
                chatSession.messageCount = 0;
                await chatSession.save();
                await ctx.reply('Your conversation has been reset. You can start fresh!').catch(this.logger.error);
                this.logger.info(`Conversation for user ${userId} with character ${user.selectedCharacterId} reset.`);
            } else {
                await ctx.reply('No active conversation found to reset.').catch(this.logger.error);
            }

        } catch (error) {
            this.logger.error(`Error resetting conversation for user ${userId}:`, error);
            await ctx.reply('An error occurred while resetting the conversation.').catch(this.logger.error);
        }
    }
}