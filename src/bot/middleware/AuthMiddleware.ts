import { Context, MiddlewareFn } from 'telegraf';
import { Logger } from '@utils/Logger';

export class AuthMiddleware {
    private logger = new Logger('AuthMiddleware');

    public middleware(): MiddlewareFn<Context> {
        return async (ctx: Context, next: () => Promise<void>) => {
            const userId = ctx.from?.id;
            if (!userId) {
                this.logger.warn('Received update without user ID:', ctx.update);
                return;
            }

            this.logger.debug(`User ${userId} authenticated.`);
            return next();
        };
    }
}
