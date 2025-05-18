import type { ByteExt, Value } from "./encode.ts";

function decode_float64(encoded: ByteExt): number {
  const bytes = new Uint8Array(encoded.bytes);
  if ((bytes[0] & 0x80) === 0) {
    // Was negative, flip all bits back
    for (const i of bytes.keys()) bytes[i] = ~bytes[i] & 0xFF;
  } else {
    // Was positive, clear sign bit
    bytes[0] = bytes[0] & 0x7F;
  }
  return new DataView(bytes.buffer).getFloat64(0, false);
}

export function decode(_bytes: Uint8Array): Value[] {
  return [];
}
