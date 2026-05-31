import { onCleanup, onMount } from 'solid-js';

import type { StageController } from '@/renderer/StageController';

interface StageViewProps {
  readonly onReady: (controller: StageController) => void;
  readonly onError: (error: unknown) => void;
  readonly onActiveIndexChange?: (index: number) => void;
}

export const StageView = (props: StageViewProps) => {
  let host!: HTMLDivElement;
  let alive = true;
  let controller: StageController | undefined;
  let dragStart:
    | {
        pointerId: number;
        pointerX: number;
        pointerY: number;
        offsetX: number;
        offsetY: number;
      }
    | undefined;

  const handlePointerMove = (event: PointerEvent): void => {
    if (!dragStart || !controller || event.pointerId !== dragStart.pointerId) {
      return;
    }

    controller.setCharacterOffset(
      dragStart.offsetX + event.clientX - dragStart.pointerX,
      dragStart.offsetY + event.clientY - dragStart.pointerY,
    );
  };

  const handlePointerUp = (event: PointerEvent): void => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) {
      return;
    }

    dragStart = undefined;
    host.releasePointerCapture(event.pointerId);
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (!controller || event.button !== 0) {
      return;
    }

    const bounds = host.getBoundingClientRect();
    const localX = event.clientX - bounds.left;
    const localY = event.clientY - bounds.top;

    const pickedIndex = controller.pickActiveIndexAt(localX, localY);

    if (pickedIndex < 0) {
      return;
    }

    props.onActiveIndexChange?.(pickedIndex);

    const current = controller.readCharacterOffset();

    dragStart = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: current.x,
      offsetY: current.y,
    };

    host.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  onMount(() => {
    void import('@/renderer/StageController')
      .then(({ StageController }) => StageController.create(host))
      .then((createdController) => {
        if (!alive) {
          createdController.destroy();
          return;
        }

        controller = createdController;
        props.onReady(createdController);
      })
      .catch(props.onError);
  });

  onCleanup(() => {
    alive = false;
    dragStart = undefined;
    controller?.destroy();
  });

  return (
    <div
      ref={host}
      class="stage-view"
      aria-label="Character stage"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
};
