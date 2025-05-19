export type Core = number | bigint | boolean | string;

export type ByteExt = {
  code: number;
  level: number;
  bytes: Uint8Array;
};

export type ValueExt<R = never> = {
  code: number;
  level: number;
  values: Value<R>[];
};

export type Value<R = never> = Core | Ext<R> | R;
export type Ext<R> = ByteExt | ValueExt<R>;

export type DecFn<R> = (input: Ext<R>) => Ext<R> | R;
export type EncFn<R> = (input: R) => Ext<R>;

export type PartialByteExt = {
  code: number;
  level: number;
  bytes: number[];
  zero: boolean;
};

export type PartialExt<R> = PartialByteExt | ValueExt<R>;
