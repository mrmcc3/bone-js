import * as fc from "fast-check";
import { arbs } from "./arb.ts";
import { encode } from "./encode.ts";
import { decode } from "./decode.ts";
import { assertEquals } from "@std/assert";
import { compare_bytes, compare_values } from "./compare.ts";
import { Ext } from "./types.ts";

Deno.test("decode examples", () => {
  // deno-fmt-ignore
  assertEquals(
    decode(new Uint8Array([
      // ints
      0x10, 0x11, 0x17,
      0x0F, 0xFE,
      0x0F, 0x7F,
      0x18, 0x08,
      0x18, 0xFF,
      0x0F, 0x00,
      0x1F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0x08, 0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 

      // bools
      0x20, 0x21,

      // floats
      0x70, 0xc0, 0x09, 0x21, 0xf9, 0xf0, 0x1b, 0x86, 0x6e,
      0x70, 0x3f, 0xfa, 0x40, 0xf6, 0x6a, 0x55, 0x08, 0x6f,
      0x70, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x70, 0x00, 0x0f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,

      // strings
      0x90, 0x00,
      0x90, 0x41, 0x42, 0x43, 0x00,
      0x90, 0x00, 0x01, 0x00,
      0xFF, 0x9F, 0x00, 0x01, 0xFF, 0x00,
      
      // tuples
      0xFF, 0xFF, 0xA0, 0x20,
      0xB0, 0x20, 0x20,
      0xC0, 0x20, 0x20, 0x20,
      0xD0, 0x20, 0x20, 0x20, 0x20,

      // list
      0xFF, 0xF1, 0x00,
      0xF0, 0x21, 0x00,

      // nested
      0xF0, 0xA1, 0x20, 0x00,
    
    ])),
    [
      // ints
      0, 1, 7,
      -1, -128, 8, 255, -255,
      18446744073709551615n, -9223372036854775808n,

      // bool
      false, true,

      // float64
      3.14159, -2.71828, Infinity, -Infinity,

      // strings
      "",
      "ABC", "\0",
      {code: 0x9F, level: 1, bytes: new Uint8Array([0x00, 0xFF])},
      
      // tuple
      { code: 0xA0, level: 2, values: [false] },
      { code: 0xB0, level: 0, values: [false, false] },
      { code: 0xC0, level: 0, values: [false, false, false] },
      { code: 0xD0, level: 0, values: [false, false, false, false] },

      // list
      { code: 0xF1, level: 1, values: [] },
      { code: 0xF0, level: 0, values: [true] },

      // nested
      { code: 0xF0, level: 0, values: [{ code: 0xA1, level: 0, values: [false] }]},
    ],
  );
});

Deno.test.ignore("decode errors", () => {
  // TODO. examples that causes the decoder to fail
});

Deno.test("isomorphic", () => {
  fc.assert(
    fc.property(fc.array(arbs.value), (values) => {
      const enc = encode(values);
      assertEquals(structuredClone(values), decode(enc));
    }),
  );
});

Deno.test("order preservation", () => {
  fc.assert(
    fc.property(arbs.value, arbs.value, (a, b) => {
      assertEquals(
        compare_bytes(encode([a]), encode([b])),
        compare_values(a, b),
      );
    }),
    { numRuns: 5000 },
  );
});

function enc_ext(v: Date): Ext<Date> {
  return { code: 0xAF, level: 0, values: [v.getTime()] };
}

function dec_ext(ext: Ext<Date>) {
  if (ext.code === 0xAF && "values" in ext) {
    return new Date(ext.values[0] as number);
  }
  return ext;
}

Deno.test("extension example", () => {
  const payload = [new Date()];
  const enc = encode(payload, enc_ext);
  const dec = decode(enc, dec_ext);
  assertEquals(payload, dec);
});
