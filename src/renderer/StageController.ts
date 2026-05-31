import { composeDefaultCommands } from '@/actions/actionComposer';
import type { ModelDefinition } from '@/domain/manifest';
import { createRuntimeRegistry, type RuntimeRegistry } from '@/runtime/registry';
import type { RuntimeCommand, RuntimeModelInstance, StageSize } from '@/runtime/types';

export class StageController {
  private readonly instances: RuntimeModelInstance[] = [];
  private readonly characterOffsets: Array<{ x: number; y: number }> = [];
  private readonly characterRotations: number[] = [];
  private readonly characterMirrors: boolean[] = [];
  private activeIndex = -1;
  private readonly resizeObserver: ResizeObserver;
  private loadToken = 0;
  private disposed = false;

  private constructor(
    private readonly host: HTMLElement,
    private readonly registry: RuntimeRegistry,
  ) {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.resize();
  }

  static async create(
    host: HTMLElement,
    registry: RuntimeRegistry = createRuntimeRegistry(),
  ): Promise<StageController> {
    return new StageController(host, registry);
  }

  async loadModel(model: ModelDefinition): Promise<void> {
    const token = ++this.loadToken;
    const adapter = await this.registry.get(model.runtime);
    const instance = await adapter.loadModel(model, {
      host: this.host,
      size: this.readSize(),
    });

    if (this.disposed || token !== this.loadToken) {
      instance.destroy();
      return;
    }

    this.instances.push(instance);
    this.characterOffsets.push({ x: 0, y: 0 });
    this.characterRotations.push(0);
    this.characterMirrors.push(false);
    this.activeIndex = this.instances.length - 1;
    const offset = this.characterOffsets[this.activeIndex];
    const rotation = this.characterRotations[this.activeIndex];
    const mirror = this.characterMirrors[this.activeIndex];

    instance.setCharacterOffset(offset.x, offset.y);
    instance.setCharacterRotation(rotation);
    instance.setCharacterMirror(mirror);

    for (const command of composeDefaultCommands(model)) {
      instance.execute(command);
    }
  }

  executeActive(command: RuntimeCommand): void {
    this.readActiveInstance()?.execute(command);
  }

  setGlobalTimeScale(value: number): void {
    this.readActiveInstance()?.setTimeScale(value);
  }

  setCharacterShadow(enabled: boolean): void {
    this.readActiveInstance()?.setCharacterShadow(enabled);
  }

  setCharacterOffset(x: number, y: number): void {
    if (this.activeIndex < 0 || this.activeIndex >= this.characterOffsets.length) {
      return;
    }

    this.characterOffsets[this.activeIndex] = { x, y };
    this.readActiveInstance()?.setCharacterOffset(x, y);
  }

  setCharacterRotation(degrees: number): void {
    if (this.activeIndex < 0 || this.activeIndex >= this.characterRotations.length) {
      return;
    }

    this.characterRotations[this.activeIndex] = degrees;
    this.readActiveInstance()?.setCharacterRotation(degrees);
  }

  setCharacterMirror(enabled: boolean): void {
    if (this.activeIndex < 0 || this.activeIndex >= this.characterMirrors.length) {
      return;
    }

    this.characterMirrors[this.activeIndex] = enabled;
    this.readActiveInstance()?.setCharacterMirror(enabled);
  }

  readCharacterOffset(): { readonly x: number; readonly y: number } {
    if (this.activeIndex < 0 || this.activeIndex >= this.characterOffsets.length) {
      return { x: 0, y: 0 };
    }

    return this.characterOffsets[this.activeIndex];
  }

  readCharacterRotation(): number {
    if (this.activeIndex < 0 || this.activeIndex >= this.characterRotations.length) {
      return 0;
    }

    return this.characterRotations[this.activeIndex];
  }

  readCharacterMirror(): boolean {
    if (this.activeIndex < 0 || this.activeIndex >= this.characterMirrors.length) {
      return false;
    }

    return this.characterMirrors[this.activeIndex];
  }

  canDragActiveCharacterAt(x: number, y: number): boolean {
    return this.readActiveInstance()?.canDragCharacterAt(x, y) ?? false;
  }

  pickActiveIndexAt(x: number, y: number): number {
    for (let index = this.instances.length - 1; index >= 0; index -= 1) {
      if (this.instances[index].canDragCharacterAt(x, y)) {
        this.activeIndex = index;
        return index;
      }
    }

    return -1;
  }

  readActiveIndex(): number {
    return this.activeIndex;
  }

  readInstanceCount(): number {
    return this.instances.length;
  }

  setActiveIndex(index: number): void {
    if (index < 0 || index >= this.instances.length) {
      return;
    }

    this.activeIndex = index;
  }

  removeActiveModel(): void {
    const active = this.readActiveInstance();

    if (!active || this.activeIndex < 0) {
      return;
    }

    active.destroy();
    this.instances.splice(this.activeIndex, 1);
    this.characterOffsets.splice(this.activeIndex, 1);
    this.characterRotations.splice(this.activeIndex, 1);
    this.characterMirrors.splice(this.activeIndex, 1);

    if (this.instances.length === 0) {
      this.activeIndex = -1;
      return;
    }

    this.activeIndex = Math.min(this.activeIndex, this.instances.length - 1);
  }

  destroy(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.loadToken += 1;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.resizeObserver.disconnect();
    this.clearActiveInstance();
  }

  private readonly handleVisibilityChange = (): void => {
    for (const instance of this.instances) {
      instance.setPaused(document.hidden);
    }
  };

  private resize(): void {
    const size = this.readSize();

    for (const instance of this.instances) {
      instance.resize(size);
    }
  }

  private readSize(): StageSize {
    const bounds = this.host.getBoundingClientRect();

    return {
      width: Math.max(1, Math.floor(bounds.width)),
      height: Math.max(1, Math.floor(bounds.height)),
    };
  }

  private clearActiveInstance(): void {
    while (this.instances.length > 0) {
      const instance = this.instances.pop();

      instance?.destroy();
    }

    this.activeIndex = -1;
    this.characterOffsets.length = 0;
    this.characterRotations.length = 0;
    this.characterMirrors.length = 0;
  }

  private readActiveInstance(): RuntimeModelInstance | undefined {
    if (this.activeIndex < 0 || this.activeIndex >= this.instances.length) {
      return undefined;
    }

    return this.instances[this.activeIndex];
  }
}
