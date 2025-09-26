// src/models/Character.ts

// Main Character Interface
export interface Character {
    id: string; // Unique identifier for the character (e.g., 'kirito')
    name: string;
    series: string; // Anime series the character is from
    description: string; // General description of the character
    personality: CharacterPersonality;
    appearance: CharacterAppearance;
    relationships: CharacterRelationships;
    settings: CharacterSettings;
    stats: CharacterStats;
}

// Nested Interfaces for Character details

export interface CharacterPersonality {
    traits: string[]; // e.g., ['calm', 'protective', 'sarcastic']
    speechPatterns: string[]; // e.g., ['formal', 'uses honorifics', 'blunt']
    emotions: EmotionRange[]; // How emotions manifest
    behaviors: BehaviorPattern[]; // Specific behaviors in situations
    backstory: string; // Key elements of their past
    goals: string[];
    fears: string[];
    likes: string[];
    dislikes: string[];
}

export interface CharacterAppearance {
    avatar: string; // URL to the character's avatar image
    description: string; // Text description of their physical appearance
    imagePrompts: string[]; // Base prompts for AI image generation (e.g., "anime style, black hair, determined expression")
    visualTags: string[]; // Keywords to describe visual style/themes
}

export interface CharacterRelationships {
    defaultRelationship: number; // 0-100, starting relationship level with user
    relationshipProgression: RelationshipStage[]; // Stages of relationship development
    maxRelationship: number; // Maximum possible relationship score
    relationshipFactors: RelationshipFactor[]; // Actions that impact relationship
}

export interface CharacterSettings {
    isPremium: boolean; // Does this character require premium access?
    nsfwAllowed: boolean; // Can this character generate NSFW images/text?
    imageGeneration: boolean; // Can this character trigger image generation?
    responseLength: 'short' | 'medium' | 'long';
    creativityLevel: number; // 0-10, influences AI response creativity
    memoryDepth: number; // How many messages to remember for AI context
}

export interface CharacterStats {
    popularity: number;
    totalConversations: number;
    averageRating: number;
    premiumUsers: number;
    createdAt: Date;
    lastUpdated: Date;
}

export interface EmotionRange {
    emotion: string; // e.g., 'happy', 'sad', 'angry'
    minIntensity: number; // 0-100
    maxIntensity: number; // 0-100
    triggers: string[]; // What situations/topics trigger this emotion
    expressions: string[]; // How the character expresses this emotion (e.g., 'smiles', 'frowns', 'raises voice')
}

export interface BehaviorPattern {
    situation: string; // e.g., 'user expresses sadness', 'user asks about past'
    responses: string[]; // Potential actions or verbal responses
    probability: number; // 0-1, likelihood of this behavior occurring
    requirements?: string[]; // Optional conditions for this behavior to activate
}

export interface RelationshipStage {
    level: number; // Numerical level
    name: string; // e.g., 'Acquaintance', 'Friend', 'Confidant'
    description: string;
    unlockedFeatures: string[]; // What new interactions/content are unlocked at this stage
    requiredInteractions: number; // How many interactions to reach this stage
}

export interface RelationshipFactor {
    action: string; // e.g., "compliment given", "gift item", "disagreement"
    impact: number; // -10 to +10, how it affects relationship score
    description: string;
}