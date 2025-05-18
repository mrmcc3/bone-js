import * as fc from "fast-check";
import { arbs } from "./arb.ts";
import { encode } from "./encode.ts";

const payload = fc.sample(arbs.value, 5000);

function replacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return `${value}`;
  if (value instanceof Uint8Array) return value.map((v) => v);
  return value;
}

Deno.bench({
  name: "structuredClone",
  group: "encode",
  fn: () => {
    structuredClone(payload);
  },
});

Deno.bench({
  name: "BONE",
  group: "encode",
  baseline: true,
  fn: () => {
    encode(payload);
  },
});

Deno.bench({
  name: "JSON",
  group: "encode",
  fn: () => {
    JSON.stringify(payload, replacer);
  },
});

async function gzip(data: Uint8Array) {
  return new Uint8Array(
    await new Response(
      ReadableStream.from([data]).pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer(),
  );
}

const bone_data = encode(payload);
const bone_size = bone_data.byteLength;
const json_string = JSON.stringify(payload, replacer);
const json_data = new TextEncoder().encode(json_string);
const json_size = json_data.byteLength;
const raw_ratio = json_size / bone_size;

const bone_gzip = await gzip(bone_data);
const bone_gzip_size = bone_gzip.byteLength;
const json_gzip = await gzip(json_data);
const json_gzip_size = json_gzip.byteLength;
const gzip_ratio = json_gzip_size / bone_gzip_size;

console.log("--- ENCODED SIZE");
console.log("raw");
console.log(`  BONE ${bone_size} bytes (${(bone_size / 1024).toFixed(2)} KB)`);
console.log(
  `  JSON ${json_size} bytes (${(json_size / 1024).toFixed(2)} KB) (${raw_ratio.toFixed(2)}x larger than BONE)`,
);
console.log("gzip");
console.log(`  BONE ${bone_gzip_size} bytes (${(bone_gzip_size / 1024).toFixed(2)} KB)`);
console.log(
  `  JSON ${json_gzip_size} bytes (${(json_gzip_size / 1024).toFixed(2)} KB) (${gzip_ratio.toFixed(2)}x larger than BONE)`,
);
console.log("---");
