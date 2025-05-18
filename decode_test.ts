import * as fc from "fast-check";
import { arbs } from "./arb.ts";
import { encode } from "./encode.ts";
import { decode } from "./decode.ts";
import { assertEquals } from "@std/assert";
import { compare_bytes, compare_values } from "./compare.ts";

Deno.test.ignore("isomorphic", () => {
  fc.assert(fc.property(fc.array(arbs.value), (values) => {
    assertEquals(
      values,
      decode(encode(values)),
    );
  }));
});

Deno.test.ignore("order preservation", () => {
  fc.assert(fc.property(arbs.value, arbs.value, (a, b) => {
    assertEquals(
      compare_bytes(encode([a]), encode([b])),
      compare_values(a, b),
    );
  }));
});
