import { Schema, model } from 'mongoose';
import {User} from "../types/index";

// Расширяем интерфейс Document для использования с Mongoose
export interface IUserDocument extends User {
}

const userSchema = new Schema<IUserDocument>({
    id: { type: Number, required: true, unique: true }, // Telegram User ID
    username: { type: String, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    selectedCharacterId: { type: String }, // ID выбранного персонажа
    isPremium: { type: Boolean, default: false },
    premiumExpiresAt: { type: Date },
}, {
    timestamps: true // Добавляет createdAt и updatedAt
});

// Создаем индекс для быстрого поиска по id (Telegram ID)
userSchema.index({ id: 1 });

export const UserModel = model<IUserDocument>('User', userSchema);