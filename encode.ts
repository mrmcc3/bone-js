import { z } from "zod/mini";

const Encoded = z.object({
  code: z.int().check(z.gte(0x08), z.lt(0xFF)),
  level: z.prefault(z.int().check(z.gte(0)), 0),
  values: z.optional(z.array(z.unknown())),
  bytes: z.optional(z.instanceof(Uint8Array<ArrayBuffer>)),
}).check(
  z.refine(({ code, values, bytes }) => {
    // https://vibing.dev/bone#typecodes
    if (code < 0x09) return !values && bytes?.length === 8;
    if (code < 0x0A) return !values && bytes?.length === 7;
    if (code < 0x0B) return !values && bytes?.length === 6;
    if (code < 0x0C) return !values && bytes?.length === 5;
    if (code < 0x0D) return !values && bytes?.length === 4;
    if (code < 0x0E) return !values && bytes?.length === 3;
    if (code < 0x0F) return !values && bytes?.length === 2;
    if (code < 0x10) return !values && bytes?.length === 1;
    if (code < 0x18) return !values && !bytes;
    if (code < 0x19) return !values && bytes?.length === 1;
    if (code < 0x1A) return !values && bytes?.length === 2;
    if (code < 0x1B) return !values && bytes?.length === 3;
    if (code < 0x1C) return !values && bytes?.length === 4;
    if (code < 0x1D) return !values && bytes?.length === 5;
    if (code < 0x1E) return !values && bytes?.length === 6;
    if (code < 0x1F) return !values && bytes?.length === 7;
    if (code < 0x20) return !values && bytes?.length === 8;
    if (code < 0x30) return !values && !bytes;
    if (code < 0x40) return !values && bytes?.length === 1;
    if (code < 0x50) return !values && bytes?.length === 2;
    if (code < 0x60) return !values && bytes?.length === 3;
    if (code < 0x70) return !values && bytes?.length === 4;
    if (code < 0x80) return !values && bytes?.length === 8;
    if (code < 0x90) return !values && bytes?.length === 16;
    if (code < 0xA0) return !values && bytes?.length === 32;
    if (code < 0xB0) return !values && bytes?.at(-1) === 0;
    if (code < 0xC0) return values?.length === 1 && !bytes;
    if (code < 0xD0) return values?.length === 2 && !bytes;
    if (code < 0xE0) return values?.length === 3 && !bytes;
    if (code < 0xF0) return values?.length === 4 && !bytes;
    return Array.isArray(values) && bytes?.at(-1) === 0;
  }),
);

export type Encoded = z.input<typeof Encoded>;

type StackItem = { e: z.output<typeof Encoded>; i: number };

export function encode(
  values: unknown[],
  encoder = (value: unknown): Encoded => Builtin.parse(value),
): Uint8Array<ArrayBuffer> {
  const blobs: Uint8Array<ArrayBuffer>[] = [];
  const stack: StackItem[] = [];
  for (const v of values) {
    stack.push({ e: Encoded.parse(encoder(v)), i: 0 });
    while (stack.length > 0) {
      const s = stack.at(-1)!;
      const { e: { code, level, values, bytes } } = s;
      if (s.i === 0) {
        const head = new Uint8Array(level + 1);
        head.fill(0xFF, 0, level);
        head[level] = code;
        blobs.push(head);
      }
      if (values && s.i < values.length) {
        const e = Encoded.parse(encoder(values[s.i++]));
        stack.push({ e, i: 0 });
      } else {
        if (bytes) blobs.push(bytes);
        stack.pop();
      }
    }
  }
  let length = 0;
  for (const blob of blobs) length += blob.length;
  const output = new Uint8Array(length);
  let offset = 0;
  for (const blob of blobs) {
    output.set(blob, offset);
    offset += blob.length;
  }
  return output;
}

// builtins

const Boolean = z.pipe(
  z.boolean(),
  z.transform((b): Encoded => ({ code: b ? 0x21 : 0x20 })),
);

const UINT64_BOUND = 2n ** (8n * 8n);
const Big = z.bigint().check(z.gt(-UINT64_BOUND), z.lt(UINT64_BOUND));

const Integer = z.pipe(
  z.union([z.int(), Big]),
  z.transform((i): Encoded => {
    const int = BigInt(i);
    const nat = int >= 0;
    if (nat && int < 8) return { code: 0x10 + Number(int) };
    const abs = nat ? int : -int;
    const arr = new Uint8Array(8);
    const view = new DataView(arr.buffer);
    view.setBigUint64(0, abs, false);
    const s = 8 - arr.findIndex((b) => b != 0);
    if (nat) return { code: 0x17 + s, bytes: arr.slice(-s) };
    for (const i of arr.keys()) arr[i] = ~arr[i] & 0xFF;
    return { code: 0x10 - s, bytes: arr.slice(-s) };
  }),
);

const Float = z.pipe(
  z.number(),
  z.transform((f): Encoded => {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setFloat64(0, f, false);
    if ((bytes[0] & 0x80) === 0) {
      bytes[0] = bytes[0] | 0x80;
    } else {
      for (const i of bytes.keys()) bytes[i] = ~bytes[i] & 0xFF;
    }
    return { code: 0x71, bytes };
  }),
);

function escape(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  const nulls = bytes.reduce((a, b) => b === 0 ? a + 1 : a, 0);
  const output = new Uint8Array(bytes.length + nulls + 1);
  let j = 0;
  if (nulls === 0) {
    output.set(bytes, j);
    j += bytes.length;
  } else {
    for (const i of bytes.keys()) {
      output[j++] = bytes[i];
      if (bytes[i] === 0) output[j++] = 0x01;
    }
  }
  output[j] = 0x00;
  return output;
}

const String = z.pipe(
  z.string(),
  z.transform((s): Encoded => {
    const bytes = new TextEncoder().encode(s);
    return { code: 0xA1, bytes: escape(bytes) };
  }),
);

const Bytes = z.pipe(
  z.instanceof(Uint8Array<ArrayBuffer>),
  z.transform((bytes): Encoded => ({ code: 0xA0, bytes: escape(bytes) })),
);

const List = z.pipe(
  z.array(z.unknown()),
  z.transform((values): Encoded => ({
    code: 0xF0,
    values,
    bytes: new Uint8Array([0x00]),
  })),
);

export const Builtin = z.union([
  Boolean,
  Integer,
  Float,
  String,
  Bytes,
  List,
]);
