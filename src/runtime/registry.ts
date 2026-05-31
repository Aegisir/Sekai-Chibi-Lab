import type { RuntimeKind } from '@/domain/manifest';
import type { RuntimeAdapter, RuntimeModelInstance } from '@/runtime/types';

type RuntimeAdapterFactory = () => RuntimeAdapter | Promise<RuntimeAdapter>;
type RuntimeAdapterEntry = readonly [RuntimeKind, RuntimeAdapterFactory];

class UnsupportedLive2dAdapter implements RuntimeAdapter {
  readonly kind = 'live2d-cubism' satisfies RuntimeKind;

  async loadModel(): Promise<RuntimeModelInstance> {
    throw new Error('Live2D Cubism support is intentionally kept behind a future lazy adapter.');
  }
}

export class RuntimeRegistry {
  private readonly adapters = new Map<RuntimeKind, RuntimeAdapterFactory>();
  private readonly loadedAdapters = new Map<RuntimeKind, RuntimeAdapter>();

  constructor(entries: readonly RuntimeAdapterEntry[]) {
    for (const [kind, factory] of entries) {
      if (this.adapters.has(kind)) {
        throw new Error(`Duplicate runtime adapter: ${kind}`);
      }

      this.adapters.set(kind, factory);
    }
  }

  async get(kind: RuntimeKind): Promise<RuntimeAdapter> {
    const cachedAdapter = this.loadedAdapters.get(kind);

    if (cachedAdapter) {
      return cachedAdapter;
    }

    const factory = this.adapters.get(kind);

    if (!factory) {
      throw new Error(`Unsupported runtime: ${kind}`);
    }

    const adapter = await factory();

    if (adapter.kind !== kind) {
      throw new Error(`Runtime adapter mismatch: expected ${kind}, received ${adapter.kind}`);
    }

    this.loadedAdapters.set(kind, adapter);

    return adapter;
  }
}

export const createRuntimeRegistry = (): RuntimeRegistry =>
  new RuntimeRegistry([
    [
      'spine-pixi-v8',
      async () => {
        const { SpineAdapter } = await import('@/runtime/spine/SpineAdapter');

        return new SpineAdapter();
      },
    ],
    [
      'spine-legacy-webgl',
      async () => {
        const { SpineLegacyAdapter } = await import('@/runtime/spineLegacy/SpineLegacyAdapter');

        return new SpineLegacyAdapter();
      },
    ],
    ['live2d-cubism', () => new UnsupportedLive2dAdapter()],
  ]);
