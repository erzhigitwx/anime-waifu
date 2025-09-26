// src/services/payment/PaymentService.ts
import { Context } from 'telegraf';
import {Logger} from "@utils/Logger";
import {Environment} from "@config/environment";

export class PaymentService {
    private logger = new Logger('PaymentService');

    constructor() {
        if (!Environment.TELEGRAM_PAYMENT_PROVIDER_TOKEN) {
            this.logger.warn('TELEGRAM_PAYMENT_PROVIDER_TOKEN is not set. Payment features will be disabled.');
        }
    }

    public async createInvoice(userId: number | undefined, planId: string, ctx: Context) {
        if (!userId || !Environment.TELEGRAM_PAYMENT_PROVIDER_TOKEN) {
            this.logger.error('Cannot create invoice: User ID or payment provider token missing.');
            await ctx.reply('Payment services are currently unavailable.').catch(this.logger.error);
            return;
        }

        const prices = this.getPlanDetails(planId);
        if (!prices) {
            await ctx.reply('Invalid premium plan selected.').catch(this.logger.error);
            return;
        }

        try {
            await ctx.replyWithInvoice({
                title: prices.title,
                description: prices.description,
                payload: `vivid_persona_premium_${userId}_${planId}`,
                provider_token: Environment.TELEGRAM_PAYMENT_PROVIDER_TOKEN,
                currency: 'USD',
                prices: [{ label: prices.title, amount: prices.amount }],
                start_parameter: 'premium', // A parameter that is passed to the bot when a user clicks the "pay" button
                photo_url: prices.photo_url,
                need_name: false,
                need_phone_number: false,
                need_email: false,
                send_email_to_provider: false,
                is_flexible: false,
            }).catch(this.logger.error);
            this.logger.info(`Invoice created for user ${userId}, plan ${planId}`);
        } catch (error) {
            this.logger.error(`Error creating invoice for user ${userId}, plan ${planId}:`, error);
            await ctx.reply('Failed to create invoice. Please try again later.').catch(this.logger.error);
        }
    }

    private getPlanDetails(planId: string) {
        // In a real app, this would come from a database or config
        switch (planId) {
            case 'plan1':
                return {
                    title: 'Vivid Persona - Basic',
                    description: 'Unlock basic premium features for one month.',
                    amount: 500, // $5.00 (in cents)
                    photo_url: 'https://via.placeholder.com/200/0000FF/FFFFFF?text=Premium1'
                };
            case 'plan2':
                return {
                    title: 'Vivid Persona - Pro',
                    description: 'Unlock all premium features and exclusive content for one month.',
                    amount: 1000, // $10.00 (in cents)
                    photo_url: 'https://via.placeholder.com/200/FFD700/000000?text=Premium2'
                };
            default:
                return null;
        }
    }

    // You might add methods to verify payment, update user status in DB, etc.
}