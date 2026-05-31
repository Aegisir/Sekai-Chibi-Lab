import { z } from 'zod';

import { asActionId, asCharacterId, asModelId } from './ids';

const nonEmptyId = z.string().trim().min(1).max(96).regex(/^[a-z0-9][a-z0-9-_:.]*$/u);
const assetPath = z.string().trim().min(1).max(512);

export const runtimeKindSchema = z.enum(['spine-pixi-v8', 'spine-legacy-webgl', 'live2d-cubism']);

const layoutSchema = z.object({
  scale: z.number().positive().max(8).default(1),
  anchorX: z.number().min(0).max(1).default(0.5),
  anchorY: z.number().min(0).max(1).default(0.88),
  offsetX: z.number().min(-4096).max(4096).default(0),
  offsetY: z.number().min(-4096).max(4096).default(0),
});

export const actionSchema = z.object({
  id: nonEmptyId.transform(asActionId),
  label: z.string().trim().min(1).max(80),
  animation: z.string().trim().min(1).max(128),
  track: z.number().int().min(0).max(16).default(0),
  loop: z.boolean().default(false),
  timeScale: z.number().positive().max(4).default(1),
  mixDuration: z.number().min(0).max(2).default(0.18),
  interrupt: z.boolean().default(true),
});

const baseModelSchema = z.object({
  id: nonEmptyId.transform(asModelId),
  name: z.string().trim().min(1).max(96),
  layout: layoutSchema,
  actions: z.array(actionSchema).min(1).max(128),
  defaultActionId: nonEmptyId.transform(asActionId).optional(),
});

const spinePixiModelSchema = baseModelSchema.extend({
  runtime: z.literal('spine-pixi-v8'),
  assets: z.object({
    skeleton: assetPath,
    atlas: assetPath,
  }),
});

const spineLegacyModelSchema = baseModelSchema.extend({
  runtime: z.literal('spine-legacy-webgl'),
  assets: z.object({
    sharedSkeleton: assetPath,
    atlas: assetPath,
    texture: assetPath,
  }),
});

const live2dModelSchema = baseModelSchema.extend({
  runtime: z.literal('live2d-cubism'),
  assets: z.object({
    model: assetPath,
  }),
});

export const modelSchema = z.discriminatedUnion('runtime', [
  spinePixiModelSchema,
  spineLegacyModelSchema,
  live2dModelSchema,
]);

export const characterSchema = z.object({
  id: nonEmptyId.transform(asCharacterId),
  name: z.string().trim().min(1).max(96),
  unit: z.string().trim().min(1).max(96).optional(),
  models: z.array(modelSchema).min(1),
});

export const manifestSchema = z.object({
  version: z.literal(1),
  characters: z.array(characterSchema).min(1),
});

export type RuntimeKind = z.infer<typeof runtimeKindSchema>;
export type ActionDefinition = z.infer<typeof actionSchema>;
export type ModelDefinition = z.infer<typeof modelSchema>;
export type CharacterDefinition = z.infer<typeof characterSchema>;
export type ModelManifest = z.infer<typeof manifestSchema>;

export const parseManifest = (value: unknown): ModelManifest => manifestSchema.parse(value);
