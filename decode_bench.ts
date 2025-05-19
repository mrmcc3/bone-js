import * as fc from "fast-check";
import { arbs } from "./arb.ts";
import { encode } from "./encode.ts";
import { decode } from "./decode.ts";

const payload = fc.sample(arbs.value, 5000);

function replacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return ["BI", `${value}`];
  if (value instanceof Uint8Array) return ["U8", Array.from(value)];
  return value;
}

function reviver(_key: string, value: unknown) {
  if (
    Array.isArray(value) && value.length === 2 && typeof value[0] === "string"
  ) {
    if (value[0] === "BI") return BigInt(value[1]);
    if (value[0] === "U8") return new Uint8Array(value[1]);
  }
  return value;
}

const json = JSON.stringify(payload, replacer);
const bone = encode(payload);

Deno.bench({
  name: "BONE",
  group: "decode",
  baseline: true,
  fn: () => {
    decode(bone);
  },
});

Deno.bench({
  name: "JSON",
  group: "decode",
  fn: () => {
    JSON.parse(json, reviver);
  },
});
