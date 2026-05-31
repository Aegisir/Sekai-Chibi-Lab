import { createMemo, createSignal, onCleanup } from 'solid-js';

import { clampTimeScale, composePlayCommand, composeStopCommand } from '@/actions/actionComposer';
import { areaSdDefaultModelId, sampleManifest } from '@/data/sampleManifest';
import type { ActionDefinition, ModelDefinition } from '@/domain/manifest';
import { ActionPanel } from '@/features/controls/ActionPanel';
import { ModelPanel } from '@/features/controls/ModelPanel';
import { StageView } from '@/features/stage/StageView';
import type { StageController } from '@/renderer/StageController';

import './app.css';

type StageStatus = 'idle' | 'loading' | 'ready' | 'error';
interface ActorEntry {
  readonly id: string;
  readonly model: ModelDefinition;
}

const firstModel = (): ModelDefinition => {
  const models = sampleManifest.characters.flatMap((character) => character.models);
  const model = models.find((candidate) => candidate.id === areaSdDefaultModelId) ?? models[0];

  if (!model) {
    throw new Error('PJSK manifest must include at least one model.');
  }

  return model;
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown runtime error.';

export const App = () => {
  const initialModel = firstModel();
  const [controller, setController] = createSignal<StageController>();
  const [selectedModel, setSelectedModel] = createSignal<ModelDefinition>(initialModel);
  const [status, setStatus] = createSignal<StageStatus>('idle');
  const [message, setMessage] = createSignal('Stage is booting.');
  const [timeScale, setTimeScale] = createSignal(1);
  const [rotation, setRotation] = createSignal(0);
  const [mirrorEnabled, setMirrorEnabled] = createSignal(false);
  const [shadowEnabled, setShadowEnabled] = createSignal(true);
  const [dockOffset, setDockOffset] = createSignal({ x: 0, y: 0 });
  const [actors, setActors] = createSignal<readonly ActorEntry[]>([]);
  const [activeActorId, setActiveActorId] = createSignal<string | undefined>();
  const canUseStage = createMemo(() => Boolean(controller()) && status() !== 'loading');
  const canControlMotion = createMemo(
    () => Boolean(controller()) && status() === 'ready' && Boolean(activeActorId()),
  );
  const activeActor = createMemo(() => actors().find((actor) => actor.id === activeActorId()));
  let nextActorNumber = 1;
  let dragOrigin: { pointerX: number; pointerY: number; offsetX: number; offsetY: number } | undefined;

  const handleDockDragMove = (event: PointerEvent): void => {
    if (!dragOrigin) {
      return;
    }

    setDockOffset({
      x: dragOrigin.offsetX + event.clientX - dragOrigin.pointerX,
      y: dragOrigin.offsetY + event.clientY - dragOrigin.pointerY,
    });
  };

  const handleDockDragEnd = (): void => {
    dragOrigin = undefined;
    window.removeEventListener('pointermove', handleDockDragMove);
    window.removeEventListener('pointerup', handleDockDragEnd);
  };

  const handleDockDragStart = (event: PointerEvent): void => {
    if (event.button !== 0 || window.matchMedia('(max-width: 860px)').matches) {
      return;
    }

    event.preventDefault();

    const current = dockOffset();
    dragOrigin = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: current.x,
      offsetY: current.y,
    };

    window.addEventListener('pointermove', handleDockDragMove);
    window.addEventListener('pointerup', handleDockDragEnd);
  };

  onCleanup(() => {
    window.removeEventListener('pointermove', handleDockDragMove);
    window.removeEventListener('pointerup', handleDockDragEnd);
  });

  const addModel = async (model: ModelDefinition): Promise<void> => {
    const stage = controller();

    if (!stage) {
      setMessage('Stage is not ready yet.');
      return;
    }

    setStatus('loading');
    setMessage('Loading remote skeleton, atlas, and texture.');

    try {
      await stage.loadModel(model);
      stage.setCharacterShadow(shadowEnabled());
      stage.setGlobalTimeScale(timeScale());
      stage.setCharacterRotation(0);
      stage.setCharacterMirror(false);
      const actorId = `actor-${nextActorNumber++}`;
      const nextActors = [...actors(), { id: actorId, model }];

      setActors(nextActors);
      setActiveActorId(actorId);
      setStatus('ready');
      setMessage(`Added: ${model.name}`);
    } catch (error) {
      setStatus('error');
      setMessage(toErrorMessage(error));
    }
  };

  const handleStageReady = (stage: StageController): void => {
    setController(() => stage);
    setMessage('Stage ready. Select a Project SEKAI area_sd model, then load it.');
  };

  const handleModelSelect = (model: ModelDefinition): void => {
    setSelectedModel(model);
    setMessage(`Selected: ${model.name}`);
  };

  const handleDeleteActive = (): void => {
    const stage = controller();
    const currentId = activeActorId();

    if (!stage || !currentId) {
      return;
    }

    const currentActors = actors();
    const removeIndex = currentActors.findIndex((actor) => actor.id === currentId);

    if (removeIndex < 0) {
      return;
    }

    stage.setActiveIndex(removeIndex);
    stage.removeActiveModel();

    const nextActors = currentActors.filter((actor) => actor.id !== currentId);

    setActors(nextActors);

    if (nextActors.length === 0) {
      setActiveActorId(undefined);
      setStatus('idle');
      setMessage('No characters on stage. Add one.');
      return;
    }

    const nextIndex = Math.min(removeIndex, nextActors.length - 1);

    stage.setActiveIndex(nextIndex);
    setActiveActorId(nextActors[nextIndex].id);
    setRotation(stage.readCharacterRotation());
    setMirrorEnabled(stage.readCharacterMirror());
    setMessage(`Active: ${nextActors[nextIndex].model.name}`);
  };

  const handleActiveActorChange = (actorId: string): void => {
    const stage = controller();
    const index = actors().findIndex((actor) => actor.id === actorId);

    if (!stage || index < 0) {
      return;
    }

    stage.setActiveIndex(index);
    setActiveActorId(actorId);
    setRotation(stage.readCharacterRotation());
    setMirrorEnabled(stage.readCharacterMirror());
    setMessage(`Active: ${actors()[index].model.name}`);
  };

  const handleActiveIndexChange = (index: number): void => {
    const stage = controller();
    const nextActors = actors();

    if (!stage || index < 0 || index >= nextActors.length) {
      return;
    }

    stage.setActiveIndex(index);
    setActiveActorId(nextActors[index].id);
    setRotation(stage.readCharacterRotation());
    setMirrorEnabled(stage.readCharacterMirror());
    setMessage(`Active: ${nextActors[index].model.name}`);
  };

  const handleRotationChange = (degrees: number): void => {
    const stage = controller();
    const next = Math.max(-180, Math.min(180, degrees));

    setRotation(next);
    stage?.setCharacterRotation(next);
  };

  const handleMirrorToggle = (enabled: boolean): void => {
    setMirrorEnabled(enabled);
    controller()?.setCharacterMirror(enabled);
  };

  const handlePlay = (action: ActionDefinition, loop: boolean): void => {
    controller()?.executeActive(composePlayCommand(action, timeScale(), loop));
  };

  const handleStop = (): void => {
    controller()?.executeActive(composeStopCommand());
  };

  const handleTimeScaleChange = (value: number): void => {
    const nextValue = clampTimeScale(value);

    setTimeScale(nextValue);
    controller()?.setGlobalTimeScale(nextValue);
  };

  const handleShadowToggle = (enabled: boolean): void => {
    setShadowEnabled(enabled);
    controller()?.setCharacterShadow(enabled);
  };

  return (
    <div class="app-shell">
      <header class="top-bar">
        <p class={`app-status status-${status()}`}>{message()}</p>
      </header>

      <main class="workspace">
        <section class="stage-shell" aria-label="Preview">
          <StageView
            onReady={handleStageReady}
            onError={(error) => setMessage(toErrorMessage(error))}
            onActiveIndexChange={handleActiveIndexChange}
          />
        </section>

        <aside
          class="control-dock"
          aria-label="Controls"
          style={{
            '--dock-offset-x': `${dockOffset().x}px`,
            '--dock-offset-y': `${dockOffset().y}px`,
          }}
        >
          <ModelPanel
            characters={sampleManifest.characters}
            selectedModelId={selectedModel().id}
            disabled={!canUseStage()}
            actors={actors().map((actor, index) => ({ id: actor.id, label: `${index + 1}. ${actor.model.name}` }))}
            activeActorId={activeActorId()}
            onSelect={handleModelSelect}
            onAdd={(model) => void addModel(model)}
            onDeleteActive={handleDeleteActive}
            onActiveActorChange={handleActiveActorChange}
            onDragStart={handleDockDragStart}
          />

          <ActionPanel
            model={activeActor()?.model ?? selectedModel()}
            disabled={!canControlMotion()}
            timeScale={timeScale()}
            rotation={rotation()}
            mirrorEnabled={mirrorEnabled()}
            shadowEnabled={shadowEnabled()}
            onPlay={handlePlay}
            onStop={handleStop}
            onTimeScaleChange={handleTimeScaleChange}
            onRotationChange={handleRotationChange}
            onMirrorToggle={handleMirrorToggle}
            onShadowToggle={handleShadowToggle}
          />
        </aside>
      </main>
    </div>
  );
};
