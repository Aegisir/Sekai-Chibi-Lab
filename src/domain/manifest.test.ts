import { describe, expect, it } from 'vitest';

import { parseManifest } from './manifest';

describe('parseManifest', () => {
  it('normalizes action and layout defaults', () => {
    const manifest = parseManifest({
      version: 1,
      characters: [
        {
          id: 'sample',
          name: 'Sample',
          models: [
            {
              id: 'sample-default',
              name: 'Default',
              runtime: 'spine-pixi-v8',
              assets: {
                skeleton: '/models/sample/skeleton.json',
                atlas: '/models/sample/skeleton.atlas',
              },
              layout: {},
              actions: [
                {
                  id: 'idle',
                  label: 'Idle',
                  animation: 'idle',
                },
              ],
            },
          ],
        },
      ],
    });

    const model = manifest.characters[0]?.models[0];
    const action = model?.actions[0];

    expect(model?.layout.anchorX).toBe(0.5);
    expect(model?.layout.anchorY).toBe(0.88);
    expect(action?.track).toBe(0);
    expect(action?.loop).toBe(false);
    expect(action?.timeScale).toBe(1);
  });

  it('accepts Project SEKAI legacy area_sd assets', () => {
    const manifest = parseManifest({
      version: 1,
      characters: [
        {
          id: 'pjsek-akito',
          name: 'Akito Shinonome',
          models: [
            {
              id: 'sd_11akito_unit',
              name: 'Akito Shinonome - Unit',
              runtime: 'spine-legacy-webgl',
              assets: {
                sharedSkeleton: 'https://assets.pjsek.ai/file/pjsekai-assets/startapp/area_sd/base_model/sekai_skeleton.skel',
                atlas: 'https://assets.pjsek.ai/file/pjsekai-assets/startapp/area_sd/sd_11akito_unit/sekai_atlas.atlas',
                texture: 'https://assets.pjsek.ai/file/pjsekai-assets/startapp/area_sd/sd_11akito_unit/sekai_atlas.png',
              },
              layout: {},
              actions: [
                {
                  id: 'm_normal_idle01_f',
                  label: 'Normal Idle',
                  animation: 'm_normal_idle01_f',
                  loop: true,
                },
              ],
            },
          ],
        },
      ],
    });

    const model = manifest.characters[0]?.models[0];

    expect(model?.runtime).toBe('spine-legacy-webgl');
    expect(model?.assets).toMatchObject({
      sharedSkeleton: expect.stringContaining('sekai_skeleton.skel'),
    });
  });

  it('rejects invalid identifiers', () => {
    expect(() =>
      parseManifest({
        version: 1,
        characters: [
          {
            id: 'Invalid Name',
            name: 'Sample',
            models: [],
          },
        ],
      }),
    ).toThrow();
  });
});
