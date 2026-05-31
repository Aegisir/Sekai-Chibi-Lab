import { describe, expect, it } from 'vitest';

import { sampleManifest } from '@/data/sampleManifest';
import type { ModelDefinition } from '@/domain/manifest';

import { clampTimeScale, composeDefaultCommands, composePlayCommand, findAction } from './actionComposer';

const sampleModel = (): ModelDefinition => {
  const model = sampleManifest.characters[0]?.models[0];

  if (!model) {
    throw new Error('Sample manifest must include one model.');
  }

  return model;
};

describe('actionComposer', () => {
  it('clamps unsafe time scale values', () => {
    expect(clampTimeScale(0)).toBe(0.1);
    expect(clampTimeScale(2.25)).toBe(2.25);
    expect(clampTimeScale(100)).toBe(4);
  });

  it('composes play commands without mutating actions', () => {
    const model = sampleModel();
    const action = model.actions[0];

    if (!action) {
      throw new Error('Sample model must include one action.');
    }

    expect(composePlayCommand(action, 2)).toMatchObject({
      kind: 'playAnimation',
      animation: 'm_cool_angry01_f',
      loop: false,
      timeScale: 2,
    });
  });

  it('uses the configured default action first', () => {
    const model = sampleModel();
    const defaultCommand = composeDefaultCommands(model)[0];

    expect(defaultCommand).toMatchObject({
      kind: 'playAnimation',
      animation: 'm_normal_idle01_f',
      loop: true,
    });
  });

  it('finds actions by branded id', () => {
    const model = sampleModel();
    const action = model.actions[1];

    if (!action) {
      throw new Error('Sample model must include a second action.');
    }

    expect(findAction(model, action.id)?.animation).toBe('m_cool_angry02_f');
  });
});
