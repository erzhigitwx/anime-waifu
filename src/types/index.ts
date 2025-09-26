export interface User {
    id: number; // Telegram user ID (still a number from Telegram)
    username?: string;
    firstName: string;
    lastName?: string;
    selectedCharacterId?: string; // ID of the currently selected character
    isPremium: boolean;
    premiumExpiresAt?: Date;
    createdAt?: Date; // Mongoose добавляет их автоматически, делаем опциональными в интерфейсе
    updatedAt?: Date;
}

// ChatSession represents an ongoing conversation between a user and a character
export interface ChatSession {
    id: string; // Unique session ID (UUID)
    userId: number;
    characterId: string;
    startedAt: Date;
    lastActivityAt: Date;
    messageCount: number;
    createdAt?: Date;
    updatedAt?: Date;
}

// ChatMessage represents a single message in a chat session
export interface ChatMessage {
    id: string; // Unique message ID (UUID)
    sessionId: string;
    sender: 'user' | 'bot';
    text: string;
    timestamp: Date;
    imageUrl?: string;
    // Для AI model history context (e.g., Gemini's ChatMessage format)
    geminiParts: { text: string }[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Payment {
    id: string; // UUID для платежа
    userId: number;
    planId: string;
    amount: number; // В центах
    currency: string;
    telegramPaymentChargeId?: string;
    providerPaymentChargeId?: string;
    status: 'pending' | 'completed' | 'failed';
    createdAt?: Date;
    updatedAt?: Date;
}
