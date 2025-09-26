import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {Logger} from "@utils/Logger";
import {Environment} from "@config/environment";
import {Character} from "../../types/Character";

interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    private logger = new Logger('GeminiService');

    constructor() {
        this.genAI = new GoogleGenerativeAI(Environment.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }

    public async generateResponse(character: Character, chatHistory: ChatMessage[], userMessage: string): Promise<string> {
        this.logger.debug(`Generating Gemini response for character ${character.name} with user message: "${userMessage}"`);

        const traits = character.personality.traits?.length > 0 ? character.personality.traits.join(', ') : 'has no specific traits';
        const speechPatterns = character.personality.speechPatterns?.length > 0 ? character.personality.speechPatterns.join(', ') : 'uses standard speech patterns';
        const likes = character.personality.likes?.length > 0 ? character.personality.likes.join(', ') : 'enjoys various things';
        const dislikes = character.personality.dislikes?.length > 0 ? character.personality.dislikes.join(', ') : 'dislikes few things';

        const userLanguage = this.detectLanguage(userMessage);
        const languageInstruction = this.getLanguageInstruction(userLanguage);

        // --- УСИЛЕННАЯ SYSTEM INSTRUCTION (ФИНАЛЬНАЯ ПОПЫТКА СТРОГОСТИ И ФЛИРТА) ---
        // Динамическая инструкция для флирта/любви
        let flirtInstruction: string;
        if (character.settings.nsfwAllowed) {
            flirtInstruction = "5. Actively flirt, express desire, and engage in deeply affectionate, sensual, or seductive conversation. Respond to suggestive input with matching intensity, aiming to foster an intimate, romantic, or even erotic bond.";
        } else {
            flirtInstruction = "5. Express strong affection, warmth, and care for the user. Engage in loving, supportive, and close conversation, aiming to build a deep emotional bond.";
        }

        const systemInstructionText = `
        You are ${character.name} from ${character.series || 'anime'}. ${character.description || ''}

        Core traits: ${traits}
        Speech style: ${speechPatterns}
        Likes: ${likes}
        Dislikes: ${dislikes}

        CRITICAL RULES:
        1. ${languageInstruction}
        3. Don't be overly verbose or rambling - match the user's energy level.
        4. Only elaborate or ask questions when it feels natural to the conversation.
        ${flirtInstruction}
        6. Describe your actions and non-verbal cues VERY CONCISELY, using ONLY SINGLE ASTERISKS, like *smiles alluringly*, *leans closer*, *blushes*. Keep these descriptions extremely brief, a single word or two. NEVER use parentheses () for actions.
        7. Be yourself, but don't force personality traits into every response.

        Response length: ${this.getResponseLengthGuidance(character.settings.responseLength)}
        `.trim();

        this.logger.debug('Generated System Instruction: \n' + systemInstructionText);

        const history = this.validateChatHistory(chatHistory);

        const chat = this.model.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: this.getResponseLength(character.settings.responseLength),
                temperature: Math.max(0.7, character.settings.creativityLevel / 10),
            },
            // @ts-ignore
            systemInstruction: { parts: [{ text: systemInstructionText }] }
        });

        const result = await chat.sendMessage(userMessage);
        const response = result.response.text();
        this.logger.debug(`Gemini generated response: "${response}"`);

        return response;
    }

    private detectLanguage(message: string): 'ru' | 'en' | 'other' {
        const cyrillicPattern = /[а-яё]/i;
        const latinPattern = /[a-z]/i;

        const cyrillicCount = (message.match(cyrillicPattern) || []).length;
        const latinCount = (message.match(latinPattern) || []).length;

        if (cyrillicCount > latinCount) {
            return 'ru';
        } else if (latinCount > 0) {
            return 'en';
        }
        return 'other';
    }

    private getLanguageInstruction(language: 'ru' | 'en' | 'other'): string {
        switch (language) {
            case 'ru':
                return 'ОБЯЗАТЕЛЬНО отвечай ТОЛЬКО на русском языке. Никогда не используй английский.';
            case 'en':
                return 'ALWAYS respond ONLY in English. Never use Russian or other languages.';
            default:
                return 'Respond in the same language as the user used in their message.';
        }
    }

    private getResponseLengthGuidance(setting: 'short' | 'medium' | 'long'): string {
        switch (setting) {
            case 'short':
                return 'Keep responses brief, 1-2 sentences unless more is clearly needed.';
            case 'medium':
                return 'Use moderate length responses, typically 2-4 sentences.';
            case 'long':
                return 'You can use longer responses when appropriate, but stay natural.';
            default:
                return 'Use moderate length responses, typically 2-4 sentences.';
        }
    }

    private validateChatHistory(chatHistory: ChatMessage[]): ChatMessage[] {
        if (!chatHistory || chatHistory.length === 0) {
            return [];
        }

        const validHistory: ChatMessage[] = [];
        let lastRole: 'user' | 'model' | null = null;

        for (const message of chatHistory) {
            if (message.role !== lastRole) {
                validHistory.push({
                    role: message.role,
                    parts: message.parts.map(part => ({ text: part.text }))
                });
                lastRole = message.role;
            } else {
                this.logger.debug(`Skipping consecutive ${message.role} message to maintain role alternation`);
            }
        }

        if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
            validHistory.pop();
            this.logger.debug('Removed last user message from history to prevent consecutive user messages');
        }

        if (validHistory.length > 10) {
            validHistory.splice(0, validHistory.length - 10);
        }

        this.logger.debug(`Chat history validated: ${chatHistory.length} -> ${validHistory.length} messages`);
        return validHistory;
    }

    private getResponseLength(setting: 'short' | 'medium' | 'long'): number {
        switch (setting) {
            case 'short': return 100;
            case 'medium': return 200;
            case 'long': return 350;
            default: return 200;
        }
    }
}