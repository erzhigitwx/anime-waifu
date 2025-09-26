import { Schema, model, Document } from 'mongoose';
import {
    CharacterPersonality,
    CharacterAppearance,
    CharacterRelationships,
    CharacterSettings,
    CharacterStats,
    EmotionRange,
    BehaviorPattern,
    RelationshipStage,
    RelationshipFactor, Character
} from "../types/Character";

export interface ICharacterDocument extends Character {
}

const emotionRangeSchema = new Schema<EmotionRange>({
    emotion: { type: String, required: true },
    minIntensity: { type: Number, required: true },
    maxIntensity: { type: Number, required: true },
    triggers: [{ type: String }],
    expressions: [{ type: String }],
}, { _id: false });

const behaviorPatternSchema = new Schema<BehaviorPattern>({
    situation: { type: String, required: true },
    responses: [{ type: String }],
    probability: { type: Number, required: true },
    requirements: [{ type: String }],
}, { _id: false });

const relationshipStageSchema = new Schema<RelationshipStage>({
    level: { type: Number, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    unlockedFeatures: [{ type: String }],
    requiredInteractions: { type: Number, required: true },
}, { _id: false });

const relationshipFactorSchema = new Schema<RelationshipFactor>({
    action: { type: String, required: true },
    impact: { type: Number, required: true },
    description: { type: String, required: true },
}, { _id: false });


const characterPersonalitySchema = new Schema<CharacterPersonality>({
    traits: [{ type: String }],
    speechPatterns: [{ type: String }],
    emotions: [emotionRangeSchema],
    behaviors: [behaviorPatternSchema],
    backstory: { type: String },
    goals: [{ type: String }],
    fears: [{ type: String }],
    likes: [{ type: String }],
    dislikes: [{ type: String }],
}, { _id: false });

const characterAppearanceSchema = new Schema<CharacterAppearance>({
    avatar: { type: String },
    description: { type: String },
    imagePrompts: [{ type: String }],
    visualTags: [{ type: String }],
}, { _id: false });

const characterRelationshipsSchema = new Schema<CharacterRelationships>({
    defaultRelationship: { type: Number, default: 50 },
    relationshipProgression: [relationshipStageSchema],
    maxRelationship: { type: Number, default: 100 },
    relationshipFactors: [relationshipFactorSchema],
}, { _id: false });

const characterSettingsSchema = new Schema<CharacterSettings>({
    isPremium: { type: Boolean, default: false },
    nsfwAllowed: { type: Boolean, default: false },
    imageGeneration: { type: Boolean, default: true },
    responseLength: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' },
    creativityLevel: { type: Number, default: 7 },
    memoryDepth: { type: Number, default: 10 },
}, { _id: false });

const characterStatsSchema = new Schema<CharacterStats>({
    popularity: { type: Number, default: 0 },
    totalConversations: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    premiumUsers: { type: Number, default: 0 },
}, { _id: false });

const characterSchema = new Schema<ICharacterDocument>({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    series: { type: String },
    description: { type: String },
    personality: characterPersonalitySchema,
    appearance: characterAppearanceSchema,
    relationships: characterRelationshipsSchema,
    settings: characterSettingsSchema,
    stats: characterStatsSchema,
}, {
    timestamps: true
});

characterSchema.index({ id: 1 });

export const CharacterModel = model<ICharacterDocument>('Character', characterSchema);