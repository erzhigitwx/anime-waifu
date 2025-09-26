import 'dotenv/config';
import { Bot } from '@bot/bot';
import { DatabaseService } from '@services/database/DatabaseService';
import { Logger } from '@utils/Logger';

const logger = new Logger('Main');

async function bootstrap() {
    try {
        // Initialize database
        const db = new DatabaseService();
        await db.initialize(); // Теперь это подключение к MongoDB
        logger.info('Database initialized (MongoDB)');

        // Initialize and start bot
        const bot = new Bot();
        await bot.initialize();
        await bot.start();

        logger.info('🚀 Anime Waifu Bot started successfully!');
    } catch (error) {
        logger.error('Failed to start bot:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    // Добавляем отключение от MongoDB при завершении работы
    const db = new DatabaseService();
    await db.disconnect();
    process.exit(0);
});

bootstrap();