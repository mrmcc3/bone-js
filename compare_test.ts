import { assertEquals } from "@std/assert";
import { compare_values } from "./compare.ts";
import { MAX_UINT64 } from "./encode.ts";
import * as fc from "fast-check";
import { arbs } from "./arb.ts";

Deno.test("order examples", () => {
  assertEquals(
    [
      -MAX_UINT64,
      1,
      false,
      { code: 0x50, level: 0, bytes: new Uint8Array([1, 2, 4]) },
      2n,
      {
        code: 0xFE,
        level: 0,
        values: [false, { code: 0xFE, level: 2, values: [1] }],
      },
      { code: 0xA0, level: 0, values: [2] },
      Infinity,
      -255,
      "",
      MAX_UINT64,
      { code: 0x50, level: 0, bytes: new Uint8Array([1, 2, 3]) },
      { code: 0x50, level: 1, bytes: new Uint8Array([1, 2, 3]) },
      0,
      {
        code: 0xFE,
        level: 0,
        values: [false, { code: 0xFE, level: 2, values: [] }],
      },
      -1e-10,
      1.234,
      { code: 0xA0, level: 0, values: [1] },
      "BONE",
      true,
      -Infinity,
      -255n,
      // Additional mixed type examples
      "100",
      100,
      100n,
      { code: 0x50, level: 0, bytes: new Uint8Array([100]) },
      { code: 0xA0, level: 0, values: [100] },
      { code: 0xFE, level: 0, values: [100] },
      -0.5,
      { code: 0x50, level: 2, bytes: new Uint8Array([1]) },
      { code: 0xA0, level: 1, values: [1] },
      { code: 0xFE, level: 1, values: [1] },
    ].toSorted(compare_values),
    [
      -MAX_UINT64,
      -255,
      -255n,
      0,
      1,
      2n,
      100,
      100n,
      MAX_UINT64,
      false,
      true,
      { code: 0x50, level: 0, bytes: new Uint8Array([1, 2, 3]) },
      { code: 0x50, level: 0, bytes: new Uint8Array([1, 2, 4]) },
      { code: 0x50, level: 0, bytes: new Uint8Array([100]) },
      -Infinity,
      -0.5,
      -1e-10,
      1.234,
      Infinity,
      "",
      "100",
      "BONE",
      { code: 0xA0, level: 0, values: [1] },
      { code: 0xA0, level: 0, values: [2] },
      { code: 0xA0, level: 0, values: [100] },
      { code: 0xFE, level: 0, values: [100] },
      {
        code: 0xFE,
        level: 0,
        values: [false, { code: 0xFE, level: 2, values: [] }],
      },
      {
        code: 0xFE,
        level: 0,
        values: [false, { code: 0xFE, level: 2, values: [1] }],
      },
      { code: 0x50, level: 1, bytes: new Uint8Array([1, 2, 3]) },
      { code: 0xA0, level: 1, values: [1] },
      { code: 0xFE, level: 1, values: [1] },
      { code: 0x50, level: 2, bytes: new Uint8Array([1]) },
    ],
  );
});

Deno.test("idempotent sort", () => {
  fc.assert(fc.property(fc.array(arbs.value), (values) => {
    assertEquals(
      values.toSorted(compare_values),
      values.toSorted(compare_values).toSorted(compare_values),
    );
  }));
});
