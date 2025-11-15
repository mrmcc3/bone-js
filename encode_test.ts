import { assertEquals } from "@std/assert";
import { Builtin, encode, Encoded } from "./encode.ts";
import { z } from "zod/mini";

Deno.test("encode basic", () => {
  const encoder = (value: unknown): Encoded => {
    if (Array.isArray(value)) {
      return {
        code: 0xF0,
        values: value,
        bytes: Uint8Array.fromHex("00"),
      };
    }
    return { code: value ? 0x21 : 0x20 };
  };
  const cases = new Map<unknown[], string>();
  cases.set([], "");
  cases.set([true], "21");
  cases.set([false, true], "2021");
  cases.set([[]], "f000");
  cases.set([true, [false, [true]]], "21f020f0210000");
  for (const [input, output] of cases) {
    assertEquals(encode(input, encoder).toHex(), output);
  }
});

const DateExt = z.pipe(
  z.date(),
  z.transform((d): Encoded => {
    return { code: 0xBA, values: [d.getTime()] };
  }),
);

Deno.test("encode bone", () => {
  const encoder = (value: unknown): Encoded =>
    z.union([DateExt, Builtin]).parse(value);

  const cases = new Map<unknown[], string>();
  cases.set([], "");
  cases.set([true], "21");
  cases.set([false, true], "2021");
  cases.set([0, 1, 8, 255, 256, -1], "1011180818ff1901000ffe");
  cases.set([[]], "f000");
  cases.set([[0, [false]], [true]], "f010f0200000f02100");
  cases.set([3.14, -1.25], "71c0091eb851eb851f71400bffffffffffff");
  cases.set(["", "\0", ["hello"]], "a100a1000100f0a168656c6c6f0000");
  cases.set([Uint8Array.fromHex("")], "a000");
  cases.set([Uint8Array.fromHex("0000000000")], "a00001000100010001000100");
  cases.set([new Date(1763154064328)], "ba1d019a842bf3c8");

  for (const [input, output] of cases) {
    assertEquals(encode(input, encoder).toHex(), output);
  }
});
