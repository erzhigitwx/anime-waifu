import { Schema, model, Document } from 'mongoose';
import {ChatMessage} from "../types/index";

export interface IChatMessageDocument extends ChatMessage {}

const chatMessageSchema = new Schema<IChatMessageDocument>({
    id: { type: String, required: true, unique: true }, // UUID для сообщения
    sessionId: { type: String, required: true, ref: 'ChatSession' }, // Ссылка на ID сессии
    sender: { type: String, enum: ['user', 'bot'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    imageUrl: { type: String },
    geminiParts: [{ // Массив для хранения частей в формате Gemini (для контекста)
        text: { type: String, required: true }
    }],
}, {
    timestamps: true // Добавляет createdAt и updatedAt
});

chatMessageSchema.index({ sessionId: 1, timestamp: 1 }); // Для получения истории чата по сессии

export const ChatMessageModel = model<IChatMessageDocument>('ChatMessage', chatMessageSchema);