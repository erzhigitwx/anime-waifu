// src/bot/bot.ts
import { Telegraf, Context } from 'telegraf';
import {Logger} from "@utils/Logger";
import {CharacterHandler} from "@bot/handlers/CharacterHandler";
import {ChatHandler} from "@bot/handlers/ChatHandler";
import {PaymentHandler} from "@bot/handlers/PaymentHandler";
import {ImageHandler} from "@bot/handlers/ImageHandler";
import {AdminHandler} from "@bot/handlers/AdminHandler";
import {AuthMiddleware} from "@bot/middleware/AuthMiddleware";
import {RateLimitMiddleware} from "@bot/middleware/RateLimitMiddleware";
import {LoggingMiddleware} from "@bot/middleware/LoggingMiddleware";
import {Environment} from "@config/environment";

export class Bot {
    private bot: Telegraf;
    private logger = new Logger('Bot');

    private characterHandler!: CharacterHandler;
    private chatHandler!: ChatHandler;
    private paymentHandler!: PaymentHandler;
    private imageHandler!: ImageHandler;
    private adminHandler!: AdminHandler;

    private authMiddleware!: AuthMiddleware;
    private rateLimitMiddleware!: RateLimitMiddleware;
    private loggingMiddleware!: LoggingMiddleware;

    constructor() {
        // --- НОВАЯ ПРОВЕРКА ТОКЕНА ---
        if (!Environment.TELEGRAM_BOT_TOKEN) {
            const errorMessage = 'TELEGRAM_BOT_TOKEN is not set in environment variables. Bot cannot start.';
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        }
        // --- КОНЕЦ ПРОВЕРКИ ---

        this.bot = new Telegraf(Environment.TELEGRAM_BOT_TOKEN);
        this.initializeMiddleware();
        this.initializeHandlers();
    }

    private initializeMiddleware() {
        this.authMiddleware = new AuthMiddleware();
        this.rateLimitMiddleware = new RateLimitMiddleware();
        this.loggingMiddleware = new LoggingMiddleware();

        this.bot.use(this.loggingMiddleware.middleware());
        // this.bot.use(this.authMiddleware.middleware());
        // this.bot.use(this.rateLimitMiddleware.middleware());
    }

    private initializeHandlers() {
        this.characterHandler = new CharacterHandler(this.bot);
        this.chatHandler = new ChatHandler(this.bot);
        this.paymentHandler = new PaymentHandler(this.bot);
        this.imageHandler = new ImageHandler(this.bot);
        this.adminHandler = new AdminHandler(this.bot);
    }

    public async initialize() {
        this.setupCommands();
        this.setupCallbackHandlers();
        this.setupMessageHandlers();
        this.setupErrorHandling();
    }

    private setupCommands() {
        this.bot.start((ctx) => this.characterHandler.showWelcome(ctx));
        this.bot.command('characters', (ctx) => this.characterHandler.showCharacters(ctx));
        this.bot.command('premium', (ctx) => this.paymentHandler.showPremiumOptions(ctx));
        this.bot.command('reset', (ctx) => this.chatHandler.resetConversation(ctx));
        this.bot.command('settings', (ctx) => this.characterHandler.showSettings(ctx));
        this.bot.command('help', (ctx) => this.characterHandler.showHelp(ctx));
        this.bot.command('genimage', (ctx) => this.imageHandler.handleGenerateImageCommand(ctx));
    }

    private setupCallbackHandlers() {
        this.bot.action(/character_(.+)/, (ctx) => this.characterHandler.selectCharacter(ctx));
        this.bot.action(/payment_(.+)/, (ctx) => this.paymentHandler.handlePaymentAction(ctx));
        this.bot.action(/settings_(.+)/, (ctx) => this.characterHandler.handleSettingsAction(ctx));
        this.bot.action(/admin_(.+)/, (ctx) => this.adminHandler.handleAdminAction(ctx));
    }

    private setupMessageHandlers() {
        this.bot.on('text', (ctx) => this.chatHandler.handleTextMessage(ctx));
        this.bot.on('photo', (ctx) => this.imageHandler.handleUserPhoto(ctx));
        this.bot.on('successful_payment', (ctx) => this.paymentHandler.handleSuccessfulPayment(ctx));
        // this.bot.on('pre_checkout_query', (ctx) => this.paymentHandler.handlePreCheckout(ctx));
    }

    private setupErrorHandling() {
        this.bot.catch((err: any, ctx: Context) => {
            this.logger.error('Bot error:', err);
            ctx.reply('❌ Something went wrong. Please try again or contact support.').catch(console.error);
        });
    }

    public async start() {
        await this.bot.launch();
        this.logger.info('Bot is running');
    }

    public stop() {
        this.bot.stop();
        this.logger.info('Bot stopped');
    }
}