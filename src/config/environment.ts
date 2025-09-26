// src/config/environment.ts
import 'dotenv/config';

export class Environment {
    public static readonly TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN || (() => { throw new Error('TELEGRAM_BOT_TOKEN is not set.'); })();
    public static readonly GEMINI_API_KEY: string = process.env.GEMINI_API_KEY || (() => { throw new Error('GEMINI_API_KEY is not set.'); })();
    public static readonly HUGGINGFACE_API_TOKEN: string = process.env.HUGGINGFACE_API_TOKEN || (() => { throw new Error('HUGGINGFACE_API_TOKEN is not set.'); })();
    public static readonly MONGO_URI: string = process.env.MONGO_URI || (() => { throw new Error('MONGO_URI is not set.'); })();
    public static readonly MONGO_DB: string = process.env.MONGO_DB || (() => { throw new Error('MONGO_DB is not set.'); })();

    public static readonly TELEGRAM_PAYMENT_PROVIDER_TOKEN: string | undefined = process.env.TELEGRAM_PAYMENT_PROVIDER_TOKEN;
    public static readonly NODE_ENV: string = process.env.NODE_ENV || 'development';
    public static readonly PORT: number = parseInt(process.env.PORT || '3000', 10);
}