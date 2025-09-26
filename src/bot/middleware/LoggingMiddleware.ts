import { Context, MiddlewareFn } from 'telegraf';
import {Logger} from "@utils/Logger";

export class LoggingMiddleware {
    private logger = new Logger('LoggingMiddleware');

    public middleware(): MiddlewareFn<Context> {
        return async (ctx, next) => {
            const start = Date.now();
            await next();
            const ms = Date.now() - start;
            const updateType = ctx.updateType;
            const fromId = ctx.from?.id;
            const updateId = ctx.update.update_id;
            this.logger.info(`Processing update ${updateId} (${updateType}) from user ${fromId} took ${ms}ms`);
        };
    }
}