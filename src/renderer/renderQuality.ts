export interface RenderQuality {
  readonly resolution: number;
  readonly maxFps: number;
  readonly antialias: boolean;
}

const isCoarsePointer = (): boolean => globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;

export const pickRenderQuality = (): RenderQuality => {
  const rawDpr = globalThis.devicePixelRatio || 1;
  const mobile = isCoarsePointer();

  return {
    resolution: Math.min(rawDpr, mobile ? 1.5 : 2),
    maxFps: mobile ? 60 : 120,
    antialias: !mobile,
  };
};
