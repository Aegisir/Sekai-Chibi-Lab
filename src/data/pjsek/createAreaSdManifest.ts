import { parseManifest, type ModelManifest } from '@/domain/manifest';

import {
  AREA_SD_BASE_URL,
  AREA_SD_DEFAULT_ACTION_ID,
  AREA_SD_DEFAULT_MODEL_ID,
  AREA_SD_SHARED_SKELETON_URL,
  areaSdActionNames,
  areaSdModelIds,
  type AreaSdModelId,
} from './areaSdCatalog';

interface CharacterMeta {
  readonly id: string;
  readonly name: string;
  readonly unit: string;
}

const characterMetaByKey = {
  '01ichika': { id: 'pjsek-01ichika', name: 'Ichika Hoshino', unit: 'Leo/need' },
  '02saki': { id: 'pjsek-02saki', name: 'Saki Tenma', unit: 'Leo/need' },
  '03honami': { id: 'pjsek-03honami', name: 'Honami Mochizuki', unit: 'Leo/need' },
  '04shiho': { id: 'pjsek-04shiho', name: 'Shiho Hinomori', unit: 'Leo/need' },
  '05minori': { id: 'pjsek-05minori', name: 'Minori Hanasato', unit: 'More More Jump!' },
  '06haruka': { id: 'pjsek-06haruka', name: 'Haruka Kiritani', unit: 'More More Jump!' },
  '07airi': { id: 'pjsek-07airi', name: 'Airi Momoi', unit: 'More More Jump!' },
  '08shizuku': { id: 'pjsek-08shizuku', name: 'Shizuku Hinomori', unit: 'More More Jump!' },
  '09kohane': { id: 'pjsek-09kohane', name: 'Kohane Azusawa', unit: 'Vivid Bad Squad' },
  '10an': { id: 'pjsek-10an', name: 'An Shiraishi', unit: 'Vivid Bad Squad' },
  '11akito': { id: 'pjsek-11akito', name: 'Akito Shinonome', unit: 'Vivid Bad Squad' },
  '12touya': { id: 'pjsek-12touya', name: 'Toya Aoyagi', unit: 'Vivid Bad Squad' },
  '13tsukasa': { id: 'pjsek-13tsukasa', name: 'Tsukasa Tenma', unit: 'Wonderlands x Showtime' },
  '14emu': { id: 'pjsek-14emu', name: 'Emu Otori', unit: 'Wonderlands x Showtime' },
  '15nene': { id: 'pjsek-15nene', name: 'Nene Kusanagi', unit: 'Wonderlands x Showtime' },
  '16rui': { id: 'pjsek-16rui', name: 'Rui Kamishiro', unit: 'Wonderlands x Showtime' },
  '17kanade': { id: 'pjsek-17kanade', name: 'Kanade Yoisaki', unit: 'Nightcord at 25:00' },
  '18mafuyu': { id: 'pjsek-18mafuyu', name: 'Mafuyu Asahina', unit: 'Nightcord at 25:00' },
  '19ena': { id: 'pjsek-19ena', name: 'Ena Shinonome', unit: 'Nightcord at 25:00' },
  '20mizuki': { id: 'pjsek-20mizuki', name: 'Mizuki Akiyama', unit: 'Nightcord at 25:00' },
  '21miku': { id: 'pjsek-21miku', name: 'Hatsune Miku', unit: 'Virtual Singer' },
  '22rin': { id: 'pjsek-22rin', name: 'Kagamine Rin', unit: 'Virtual Singer' },
  '23len': { id: 'pjsek-23len', name: 'Kagamine Len', unit: 'Virtual Singer' },
  '24luka': { id: 'pjsek-24luka', name: 'Megurine Luka', unit: 'Virtual Singer' },
  '25meiko': { id: 'pjsek-25meiko', name: 'MEIKO', unit: 'Virtual Singer' },
  '26kaito': { id: 'pjsek-26kaito', name: 'KAITO', unit: 'Virtual Singer' },
} satisfies Record<string, CharacterMeta>;

const supportGroups = {
  base: { id: 'pjsek-base', name: 'Base model', unit: 'Project SEKAI' },
  mob: { id: 'pjsek-mobs', name: 'Mob characters', unit: 'Project SEKAI' },
  school: { id: 'pjsek-school', name: 'School NPCs', unit: 'Project SEKAI' },
  staff: { id: 'pjsek-staff', name: 'Staff NPCs', unit: 'Project SEKAI' },
  special: { id: 'pjsek-special', name: 'Special models', unit: 'Project SEKAI' },
} satisfies Record<string, CharacterMeta>;

const characterKeyPattern = /^sd_(\d{2}[a-z]+)_/u;

const toTitle = (value: string): string =>
  value.replace(/\b[a-z]/gu, (letter) => letter.toUpperCase());

const formatWords = (value: string): string =>
  toTitle(
    value
      .replace(/^sd_/u, '')
      .replace(/_/gu, ' ')
      .replace(/aprilfool(\d{4})/gu, 'april fool $1')
      .replace(/cloth(\d+)/gu, 'cloth $1'),
  );

const groupForModel = (modelId: AreaSdModelId): CharacterMeta => {
  if (modelId === 'base_model') {
    return supportGroups.base;
  }

  const characterKey = characterKeyPattern.exec(modelId)?.[1];

  if (characterKey && characterKey in characterMetaByKey) {
    return characterMetaByKey[characterKey as keyof typeof characterMetaByKey];
  }

  if (modelId.startsWith('sd_mob')) {
    return supportGroups.mob;
  }

  if (modelId.startsWith('sd_school')) {
    return supportGroups.school;
  }

  if (modelId.startsWith('sd_staff')) {
    return supportGroups.staff;
  }

  return supportGroups.special;
};

const variantForModel = (modelId: AreaSdModelId): string => {
  const characterKey = characterKeyPattern.exec(modelId)?.[1];

  if (!characterKey) {
    return formatWords(modelId);
  }

  return formatWords(modelId.replace(`sd_${characterKey}_`, ''));
};

const modelName = (modelId: AreaSdModelId): string => {
  const group = groupForModel(modelId);

  if (group.id.startsWith('pjsek-0') || group.id.startsWith('pjsek-1') || group.id.startsWith('pjsek-2')) {
    return `${group.name} - ${variantForModel(modelId)}`;
  }

  return variantForModel(modelId);
};

const modelAtlasUrl = (modelId: AreaSdModelId): string => `${AREA_SD_BASE_URL}/${modelId}/sekai_atlas.atlas`;
const modelTextureUrl = (modelId: AreaSdModelId): string => `${AREA_SD_BASE_URL}/${modelId}/sekai_atlas.png`;

const actionId = (animation: string): string => animation.toLowerCase();
const actionLabel = (animation: string): string => formatWords(animation);
const isLoopAction = (animation: string): boolean =>
  /(?:idle|listen|walk|wait|pose)/iu.test(animation);

const areaSdActions = areaSdActionNames.map((animation) => ({
  id: actionId(animation),
  label: actionLabel(animation),
  animation,
  loop: isLoopAction(animation),
  mixDuration: 0.12,
}));

const createAreaSdModel = (modelId: AreaSdModelId) => ({
  id: modelId,
  name: modelName(modelId),
  runtime: 'spine-legacy-webgl',
  assets: {
    sharedSkeleton: AREA_SD_SHARED_SKELETON_URL,
    atlas: modelAtlasUrl(modelId),
    texture: modelTextureUrl(modelId),
  },
  layout: {
    scale: 0.36,
    anchorX: 0.5,
    anchorY: 0.84,
    offsetX: 0,
    offsetY: 0,
  },
  defaultActionId: AREA_SD_DEFAULT_ACTION_ID,
  actions: areaSdActions,
});

export const createAreaSdManifest = (): ModelManifest => {
  const groups = new Map<string, CharacterMeta & { models: ReturnType<typeof createAreaSdModel>[] }>();

  for (const modelId of areaSdModelIds) {
    const group = groupForModel(modelId);
    const existingGroup = groups.get(group.id);

    if (existingGroup) {
      existingGroup.models.push(createAreaSdModel(modelId));
      continue;
    }

    groups.set(group.id, {
      ...group,
      models: [createAreaSdModel(modelId)],
    });
  }

  return parseManifest({
    version: 1,
    characters: [...groups.values()],
  });
};

export const areaSdManifest = createAreaSdManifest();
export const areaSdDefaultModelId = AREA_SD_DEFAULT_MODEL_ID;
