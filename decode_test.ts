import * as fc from "fast-check";
import { arbs } from "./arb.ts";
import { encode } from "./encode.ts";
import { decode } from "./decode.ts";
import { assertEquals } from "@std/assert";

Deno.test("roundtrip", () => {
  fc.assert(fc.property(fc.array(arbs.value), (values) => {
    assertEquals(
      values,
      decode(encode(values)),
    );
  }));
});
