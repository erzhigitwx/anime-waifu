import { Context, MiddlewareFn } from 'telegraf';
import { Logger } from '@utils/Logger';

interface UserRequest {
    count: number;
    timestamp: number;
}

export class RateLimitMiddleware {
    private logger = new Logger('RateLimitMiddleware');
    private requests = new Map<number, UserRequest>();
    private limit = 10;
    private windowMs = 5000;

    public middleware(): MiddlewareFn<Context> {
        return async (ctx: Context, next: () => Promise<void>) => {
            const userId = ctx.from?.id;
            if (!userId) return next();

            const now = Date.now();
            const userRequest = this.requests.get(userId);

            if (userRequest && now - userRequest.timestamp < this.windowMs) {
                userRequest.count++;
                if (userRequest.count > this.limit) {
                    this.logger.warn(`User ${userId} is rate-limited.`);
                    await ctx.reply(
                        '⏳ Please slow down! You are sending too many requests.'
                    ).catch(err => this.logger.error(err));
                    return;
                }
            } else {
                this.requests.set(userId, { count: 1, timestamp: now });
            }

            setTimeout(() => this.requests.delete(userId), this.windowMs);

            return next();
        };
    }
}
