import { Telegraf, Context } from 'telegraf';
import {Logger} from "@utils/Logger";
import {PaymentService} from "@services/payment/PaymentService";

export class PaymentHandler {
    private bot: Telegraf;
    private logger = new Logger('PaymentHandler');
    private paymentService: PaymentService;

    constructor(bot: Telegraf) {
        this.bot = bot;
        this.paymentService = new PaymentService();
    }

    public async showPremiumOptions(ctx: Context) {
        this.logger.info(`User ${ctx.from?.id} requested premium options.`);
        await ctx.reply('✨ Unlock premium features! Choose a plan:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Premium Plan 1 ($5)', callback_data: 'payment_plan1' }],
                    [{ text: 'Premium Plan 2 ($10)', callback_data: 'payment_plan2' }],
                ]
            }
        }).catch(this.logger.error);
    }

    public async handlePaymentAction(ctx: Context) {
        const planId = (ctx.callbackQuery as any)?.data.split('_')[1];
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery(`Initiating payment for ${planId}...`).catch(this.logger.error);
            this.logger.info(`User ${ctx.from?.id} initiated payment for ${planId}.`);
            // TODO: Create invoice and send to user
            await this.paymentService.createInvoice(ctx.from?.id, planId, ctx);
        }
    }

    public async handleSuccessfulPayment(ctx: Context) {
        const paymentInfo = (ctx.message as any)?.successful_payment;
        this.logger.info(`Successful payment from user ${ctx.from?.id}:`, paymentInfo);
        // TODO: Update user's premium status in DB
        await ctx.reply('🎉 Payment successful! Your premium features are now active.').catch(this.logger.error);
    }

    // public async handlePreCheckout(ctx: Context) {
    //     const query = ctx.preCheckoutQuery;
    //     this.logger.info(`Pre-checkout query from user ${query.from.id}:`, query);
    //     // TODO: Validate pre-checkout query (e.g., check if invoice is still valid)
    //     await ctx.answerPreCheckoutQuery(true).catch(this.logger.error); // Always answer, true for success, false for failure
    // }
}