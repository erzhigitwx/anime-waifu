// src/bot/middleware/RateLimitMiddleware.ts
import { Context, MiddlewareFn } from 'telegraf';
import {Logger} from "@utils/Logger";

interface UserRequest {
    count: number;
    timestamp: number;
}

export class RateLimitMiddleware {
    private logger = new Logger('RateLimitMiddleware');
    private requests = new Map<number, UserRequest>(); // userId -> { count, timestamp }
    private limit = 10;
    private windowMs = 5000;

    public middleware(): MiddlewareFn<Context> {
        return async (ctx, next) => {
            const userId = ctx.from?.id;
            if (!userId) {
                return next(); // Cannot rate limit if no user ID
            }

            const now = Date.now();
            const userRequest = this.requests.get(userId);

            if (userRequest && now - userRequest.timestamp < this.windowMs) {
                userRequest.count++;
                if (userRequest.count > this.limit) {
                    this.logger.warn(`User ${userId} is rate-limited.`);
                    await ctx.reply('⏳ Please slow down! You are sending too many requests.').catch(this.logger.error);
                    return; // Stop processing this update
                }
            } else {
                this.requests.set(userId, { count: 1, timestamp: now });
            }

            // Clean up old entries periodically (or use a dedicated cache like Redis)
            setTimeout(() => this.requests.delete(userId), this.windowMs);

            return next();
        };
    }
}