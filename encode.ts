import { assert } from "@std/assert";
import { ByteExt, EncFn, Ext, Value } from "./types.ts";

function encode_string(s: string): ByteExt {
  const bytes = new TextEncoder().encode(s);
  return { level: 0, code: 0x90, bytes };
}

function escape_string(s: ByteExt): Uint8Array {
  const nulls = s.bytes.filter((v) => v === 0x00).length;
  if (nulls === 0) return s.bytes;
  const res = new Uint8Array(s.bytes.length + nulls);
  let j = 0;
  for (const i of s.bytes.keys()) {
    res[j++] = s.bytes[i];
    if (s.bytes[i] === 0) res[j++] = 0x01;
  }
  return res;
}

export const MAX_UINT64 = 2n ** (8n * 8n) - 1n;

export function encode_int(int: bigint): ByteExt {
  const nat = int >= 0;
  if (nat && int < 8) {
    return { level: 0, code: 0x10 + Number(int), bytes: new Uint8Array() };
  }
  const abs = nat ? int : -int;
  if (abs > MAX_UINT64) throw new Error("int too big");
  const arr = new Uint8Array(8);
  const view = new DataView(arr.buffer);
  view.setBigUint64(0, abs, false);
  const bytes = 8 - arr.findIndex((b) => b != 0);
  if (nat) {
    return { level: 0, code: 0x17 + bytes, bytes: arr.slice(-bytes) };
  }
  for (const i of arr.keys()) arr[i] = ~arr[i] & 0xFF;
  return { level: 0, code: 0x10 - bytes, bytes: arr.slice(-bytes) };
}

function encode_float64(f: number): ByteExt {
  if (Number.isNaN(f)) throw new Error("illegal number: NaN");
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setFloat64(0, f, false);
  if ((bytes[0] & 0x80) === 0) {
    bytes[0] = bytes[0] | 0x80;
  } else {
    for (const i of bytes.keys()) bytes[i] = ~bytes[i] & 0xFF;
  }
  return { level: 0, code: 0x70, bytes };
}

function is_ext<R>(v: Value<R>): v is Ext<R> {
  return typeof v === "object" && v !== null && "level" in v && "code" in v;
}

export function to_ext<R>(v: Value<R>, ext_fn?: EncFn<R>): Ext<R> {
  if (typeof v === "boolean") {
    return { level: 0, code: v ? 0x21 : 0x20, bytes: new Uint8Array(0) };
  }
  if (typeof v === "string") return encode_string(v);
  if (typeof v === "number") {
    if (Number.isInteger(v)) return encode_int(BigInt(v));
    return encode_float64(v);
  }
  if (typeof v === "bigint") return encode_int(v);

  if (is_ext(v)) return v;
  if (ext_fn) {
    const ext = ext_fn(v);
    assert(
      ext.code < 0xFF && ext.code >= 0x20,
      "typecode not in extension range",
    );
    assert((ext.code & 0x0F) >= 0x0A, "typecode not in user range");
    return ext;
  }
  throw new Error(`unable to encode ${v}`);
}

function is_string<R>(x: Ext<R>) {
  return x.code >= 0x90 && x.code < 0xA0;
}

function is_list<R>(x: Ext<R>) {
  return x.code >= 0xF0 && x.code < 0xFF;
}

interface StackItem<R> {
  v: Ext<R>;
  i: number;
}

export function encode<R = never>(
  values: Value<R>[],
  ext_fn?: EncFn<R>,
): Uint8Array {
  const bytes: number[] = [];
  const stack: StackItem<R>[] = [];
  for (const v of values) {
    stack.push({ v: to_ext(v, ext_fn), i: 0 });
    while (stack.length > 0) {
      const s = stack.at(-1)!;
      if (s.i === 0) bytes.push(...new Array(s.v.level).fill(0xFF), s.v.code);
      if ("bytes" in s.v) {
        if (is_string(s.v)) bytes.push(...escape_string(s.v));
        else bytes.push(...s.v.bytes);
      }
      if ("values" in s.v && s.i < s.v.values.length) {
        stack.push({ v: to_ext(s.v.values[s.i++], ext_fn), i: 0 });
      } else {
        if (is_list(s.v) || is_string(s.v)) bytes.push(0x00);
        stack.pop();
      }
    }
  }
  return new Uint8Array(bytes);
}
