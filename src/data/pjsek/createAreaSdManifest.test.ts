import { describe, expect, it } from 'vitest';

import { areaSdActionNames, areaSdModelIds, AREA_SD_DEFAULT_MODEL_ID } from './areaSdCatalog';
import { areaSdDefaultModelId, areaSdManifest } from './createAreaSdManifest';

describe('areaSdManifest', () => {
  it('exposes the known Project SEKAI area_sd catalog', () => {
    const models = areaSdManifest.characters.flatMap((character) => character.models);

    expect(areaSdModelIds).toHaveLength(226);
    expect(areaSdActionNames).toHaveLength(116);
    expect(models).toHaveLength(226);
  });

  it('builds remote legacy Spine asset URLs', () => {
    const models = areaSdManifest.characters.flatMap((character) => character.models);
    const defaultModel = models.find((model) => model.id === AREA_SD_DEFAULT_MODEL_ID);

    expect(areaSdDefaultModelId).toBe(AREA_SD_DEFAULT_MODEL_ID);
    expect(defaultModel).toMatchObject({
      runtime: 'spine-legacy-webgl',
      assets: {
        sharedSkeleton: expect.stringContaining('/base_model/sekai_skeleton.skel'),
        atlas: expect.stringContaining('/sd_11akito_unit/sekai_atlas.atlas'),
        texture: expect.stringContaining('/sd_11akito_unit/sekai_atlas.png'),
      },
    });
  });
});
