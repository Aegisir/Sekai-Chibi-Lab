import { BinaryInput } from 'pixi-spine-base-3';

type PatchedBinaryInput = BinaryInput & {
  readStringRef: () => string | null;
  readString: () => string | null;
};

let installed = false;

export const installPjsekBinaryPatch = (): void => {
  if (installed) {
    return;
  }

  // PJSK area_sd stores direct strings where pixi-spine expects string table refs.
  const prototype = BinaryInput.prototype as PatchedBinaryInput;

  prototype.readStringRef = prototype.readString;
  installed = true;
};
