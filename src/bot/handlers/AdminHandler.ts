// src/bot/handlers/AdminHandler.ts
import { Telegraf, Context } from 'telegraf';
import {Logger} from "@utils/Logger";

export class AdminHandler {
    private bot: Telegraf;
    private logger = new Logger('AdminHandler');
    private ADMIN_IDS: number[] = [ /* Your Telegram User ID(s) here */ ]; // IMPORTANT: Replace with actual admin IDs

    constructor(bot: Telegraf) {
        this.bot = bot;
    }

    private isAdmin(userId: number | undefined): boolean {
        return userId !== undefined && this.ADMIN_IDS.includes(userId);
    }

    public async handleAdminAction(ctx: Context) {
        const userId = ctx.from?.id;
        if (!this.isAdmin(userId)) {
            await ctx.answerCbQuery('🚫 You are not authorized to perform this action.').catch(this.logger.error);
            return;
        }

        const action = (ctx.callbackQuery as any)?.data.split('_')[1];
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery(`Admin action: ${action}`).catch(this.logger.error);
            this.logger.info(`Admin ${userId} performed action: ${action}.`);
            await ctx.editMessageText(`Admin action **${action}** executed. (Placeholder)`, { parse_mode: 'Markdown' }).catch(this.logger.error);
            // Implement specific admin logic here (e.g., /admin_stats, /admin_broadcast)
        }
    }

    // Example of an admin command
    public async showAdminPanel(ctx: Context) {
        const userId = ctx.from?.id;
        if (!this.isAdmin(userId)) {
            await ctx.reply('🚫 You are not authorized to access the admin panel.').catch(this.logger.error);
            return;
        }
        await ctx.reply('Welcome to the Admin Panel!', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'View Stats', callback_data: 'admin_stats' }],
                    [{ text: 'Broadcast Message', callback_data: 'admin_broadcast' }],
                ]
            }
        }).catch(this.logger.error);
    }
}