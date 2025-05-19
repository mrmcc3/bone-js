import { assert } from "@std/assert";
import {
  ByteExt,
  DecFn,
  Ext,
  PartialByteExt,
  PartialExt,
  Value,
  ValueExt,
} from "./types.ts";

function is_string<R>(x: PartialExt<R>): x is PartialByteExt {
  return x.code >= 0x90 && x.code < 0xA0;
}

function is_block<R>(x: PartialExt<R>): x is PartialByteExt {
  return x.code >= 0x08 && x.code < 0x90;
}

function is_list<R>(x: PartialExt<R>): x is ValueExt<R> {
  return x.code >= 0xF0 && x.code < 0xFF;
}

function is_complete<R>(x: PartialExt<R>): boolean {
  assert(x.code >= 0x08);
  if ("bytes" in x) {
    if (x.code === 0x0F || x.code === 0x18) return x.bytes.length == 1;
    if (x.code === 0x0E || x.code === 0x19) return x.bytes.length == 2;
    if (x.code === 0x0D || x.code === 0x1A) return x.bytes.length == 3;
    if (x.code === 0x0C || x.code === 0x1B) return x.bytes.length == 4;
    if (x.code === 0x0B || x.code === 0x1C) return x.bytes.length == 5;
    if (x.code === 0x0A || x.code === 0x1D) return x.bytes.length == 6;
    if (x.code === 0x09 || x.code === 0x1E) return x.bytes.length == 7;
    if (x.code === 0x08 || x.code === 0x1F) return x.bytes.length == 8;
    if (x.code < 0x30) return true;
    if (x.code < 0x40) return x.bytes.length == 1;
    if (x.code < 0x50) return x.bytes.length == 2;
    if (x.code < 0x60) return x.bytes.length == 3;
    if (x.code < 0x70) return x.bytes.length == 4;
    if (x.code < 0x80) return x.bytes.length == 8;
    if (x.code < 0x90) return x.bytes.length == 16;
    if (x.code < 0xA0) return false;
  } else {
    if (x.code < 0xB0) return x.values.length == 1;
    if (x.code < 0xC0) return x.values.length == 2;
    if (x.code < 0xD0) return x.values.length == 3;
    if (x.code < 0xE0) return x.values.length == 4;
    if (x.code < 0xF0) return x.values.length == 8;
    if (x.code < 0xFF) return false;
  }
  throw new Error("illegal");
}

function decode_float64(ext: ByteExt): number {
  const bytes = new Uint8Array(ext.bytes);
  if ((bytes[0] & 0x80) === 0) {
    for (const i of bytes.keys()) bytes[i] = ~bytes[i] & 0xFF;
  } else {
    bytes[0] = bytes[0] & 0x7F;
  }
  return new DataView(bytes.buffer).getFloat64(0, false);
}

function decode_int({ code, bytes }: ByteExt): number | bigint {
  if (code >= 0x10 && code < 0x18) return code - 0x10;
  const neg = code < 0x10;
  const arr = new Uint8Array(8);
  if (neg) arr.fill(0xFF);
  arr.set(bytes, 8 - bytes.length);
  if (neg) {
    for (const i of arr.keys()) arr[i] = ~arr[i] & 0xFF;
  }
  const view = new DataView(arr.buffer);
  const int = view.getBigUint64(0, false);
  const abs = int <= Number.MAX_SAFE_INTEGER ? Number(int) : int;
  return neg ? -abs : abs;
}

function decode_string(ext: ByteExt): string {
  return new TextDecoder().decode(ext.bytes);
}

class Decoder<R> {
  level = 0;
  values: Value<R>[] = [];
  stack: PartialExt<R>[] = [];
  ext_fn?: DecFn<R>;

  constructor(ext_fn?: DecFn<R>) {
    if (ext_fn) this.ext_fn = ext_fn;
  }

  to_value(input: Ext<R>): Value<R> {
    if (input.code < 0x20) return decode_int(input as ByteExt);
    const user_space = (input.code & 0x0F) >= 0x0A;
    if (this.ext_fn && user_space) return this.ext_fn(input);
    if (input.code === 0x20) return false;
    if (input.code === 0x21) return true;
    if (input.code === 0x70) return decode_float64(input as ByteExt);
    if (input.code === 0x90) return decode_string(input as ByteExt);
    return input;
  }

  finalize(ext: PartialExt<R>) {
    const input: Ext<R> = "bytes" in ext
      ? {
        code: ext.code,
        level: ext.level,
        bytes: new Uint8Array(ext.bytes),
      }
      : ext;
    if (this.stack.length === 0) {
      this.values.push(this.to_value(input));
      return;
    }
    const parent = this.stack.at(-1)!;
    assert("values" in parent);
    parent.values.push(this.to_value(input));
  }

  collapse() {
    while (this.stack.length > 0) {
      const ext = this.stack.at(-1)!;
      if (!is_complete(ext)) return;
      this.stack.pop();
      this.finalize(ext);
    }
  }

  terminate_string(b: number) {
    if (this.stack.length === 0) return;
    if (b === 0x01) return;
    const ext = this.stack.at(-1)!;
    if (!is_string(ext)) return;
    if (!ext.zero) return;
    ext.zero = false;
    this.stack.pop();
    this.finalize(ext);
    this.collapse();
  }

  accept(b: number) {
    assert(b >= 0 && b <= 0xFF, "illegal byte");
    this.terminate_string(b);
    if (this.stack.length > 0) {
      const ext = this.stack.at(-1)!;
      if (is_string(ext)) {
        if (b == 0x00) {
          ext.zero = true;
        } else if (b === 0x01 && ext.zero) {
          ext.zero = false;
          ext.bytes.push(0x00);
        } else {
          ext.bytes.push(b);
        }
        return;
      }
      if (is_block(ext)) {
        ext.bytes.push(b);
        this.collapse();
        return;
      }
      if (b === 0x00 && is_list(ext)) {
        assert(this.level === 0);
        this.stack.pop();
        this.finalize(ext);
        this.collapse();
        return;
      }
    }
    if (b === 0xFF) {
      this.level++;
      return;
    }
    if (b < 0x08) {
      console.log(this, b);
    }
    assert(b >= 0x08, "illegal typecode");
    assert(this.level === 0 || b >= 0x20, "illegal level extension");
    if (b >= 0xA0) {
      this.stack.push({ code: b, level: this.level, values: [] });
    } else {
      this.stack.push({ code: b, level: this.level, bytes: [], zero: false });
    }
    this.level = 0;
    this.collapse();
  }
}

export function decode<R = never>(
  bytes: Uint8Array,
  ext_fn?: DecFn<R>,
): Value<R>[] {
  const decoder = new Decoder<R>(ext_fn);
  for (const b of bytes) decoder.accept(b);
  decoder.terminate_string(0xFF);
  if (decoder.stack.length) throw new Error("non empty stack");
  if (decoder.level) throw new Error("non zero level");
  return decoder.values;
}
