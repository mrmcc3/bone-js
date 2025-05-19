import { assert } from "@std/assert";
import { Value } from "./types.ts";

function type_num(a: Value): number {
  if (typeof a === "bigint") return 0x10;
  if (typeof a === "number") {
    if (Number.isInteger(a)) return 0x10;
    return 0x70;
  }
  if (typeof a === "boolean") return 0x20;
  if (typeof a === "string") return 0x90;
  return (a.level * 0xFF) + a.code;
}

export function compare_bytes(a: Uint8Array, b: Uint8Array) {
  const min = Math.min(a.length, b.length);
  for (let i = 0; i < min; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  if (a.length < b.length) return -1;
  if (a.length > b.length) return 1;
  return 0;
}

export function compare_values(ia: Value, ib: Value): number {
  const sa = [ia];
  const sb = [ib];
  const core_type = new Set([0x10, 0x20, 0x70, 0x90]);
  while (true) {
    const a = sa.shift();
    const b = sb.shift();
    if (a === undefined && b === undefined) return 0;
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    const ta = type_num(a);
    const tb = type_num(b);
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    if (core_type.has(ta)) {
      if (a < b) return -1;
      if (a > b) return 1;
      continue;
    }
    assert(typeof a === "object");
    assert(typeof b === "object");
    if ("bytes" in a) {
      assert("bytes" in b);
      const c = compare_bytes(a.bytes, b.bytes);
      if (c !== 0) return c;
    } else {
      assert("values" in b);
      sa.unshift(...a.values);
      sb.unshift(...b.values);
    }
  }
}
