type Brand<Value, Name extends string> = Value & { readonly __brand: Name };

export type CharacterId = Brand<string, 'CharacterId'>;
export type ModelId = Brand<string, 'ModelId'>;
export type ActionId = Brand<string, 'ActionId'>;

const asBrand = <TBrand extends string>(value: string): Brand<string, TBrand> => value as Brand<string, TBrand>;

export const asCharacterId = (value: string): CharacterId => asBrand<'CharacterId'>(value);
export const asModelId = (value: string): ModelId => asBrand<'ModelId'>(value);
export const asActionId = (value: string): ActionId => asBrand<'ActionId'>(value);
