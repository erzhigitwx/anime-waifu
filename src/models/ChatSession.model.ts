import { Schema, model } from 'mongoose';
import {ChatSession} from "../types/index";

export interface IChatSessionDocument extends ChatSession {}

const chatSessionSchema = new Schema<IChatSessionDocument>({
    id: { type: String, required: true, unique: true }, // UUID для сессии
    userId: { type: Number, required: true, ref: 'User' }, // Ссылка на Telegram User ID
    characterId: { type: String, required: true, ref: 'Character' }, // Ссылка на ID персонажа
    startedAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
}, {
    timestamps: true // Добавляет createdAt и updatedAt
});

chatSessionSchema.index({ userId: 1, characterId: 1 }); // Для быстрого поиска сессии пользователя с персонажем

export const ChatSessionModel = model<IChatSessionDocument>('ChatSession', chatSessionSchema);