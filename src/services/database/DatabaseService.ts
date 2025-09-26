import mongoose from 'mongoose';
import {Environment} from "@config/environment";
import {Logger} from "@utils/Logger";


export class DatabaseService {
    private logger = new Logger('DatabaseService');
    private _isConnected: boolean = false;

    public get isConnected(): boolean {
        return this._isConnected;
    }

    public async initialize() {
        if (this._isConnected) {
            this.logger.info('Already connected to MongoDB.');
            return;
        }

        try {
            this.logger.info(`Connecting to MongoDB at: ${Environment.MONGO_URI} (Database: ${Environment.MONGO_DB})`);
            await mongoose.connect(Environment.MONGO_URI, {
                dbName: Environment.MONGO_DB,
            });
            this._isConnected = true;
            this.logger.info('Successfully connected to MongoDB!');


            // await this.runSeeds();

        } catch (error) {
            this.logger.error('Failed to connect to MongoDB:', error);
            process.exit(1); // Выход из приложения при ошибке подключения к БД
        }
    }

    public async disconnect() {
        if (this._isConnected) {
            await mongoose.disconnect();
            this._isConnected = false;
            this.logger.info('Disconnected from MongoDB.');
        }
    }

    private async runSeeds() {
        this.logger.info('Running database seeds...');
        //@ts-ignore
        const { run: runCharacterSeeds } = await import('../../../database/seeds/001_initial_characters.ts');
        await runCharacterSeeds(this.logger); // Передаем logger, а не `this.db`

        // Дополнительные seed-файлы будут добавлены здесь, если нужно
        this.logger.info('Database seeding completed.');
    }
}