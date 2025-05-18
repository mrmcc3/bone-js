import * as fc from "fast-check";
import {
  type ByteExt,
  MAX_UINT64,
  type Value,
  type ValueExt,
} from "./encode.ts";

function block_size(code: number) {
  if (code < 0x30) return 0;
  if (code < 0x40) return 1;
  if (code < 0x50) return 2;
  if (code < 0x60) return 3;
  if (code < 0x70) return 4;
  if (code < 0x80) return 8;
  return 16;
}

function tuple_size(code: number) {
  if (code < 0xB0) return 1;
  if (code < 0xC0) return 2;
  if (code < 0xD0) return 3;
  if (code < 0xE0) return 4;
  if (code < 0xF0) return 8;
  return 16;
}

const block_ext: fc.Arbitrary<ByteExt> = fc.tuple(
  fc.integer({ min: 0x20, max: 0x8F }),
  fc.nat({ max: 4 }),
  fc.uint8Array({ minLength: 16, maxLength: 16 }),
)
  .filter(([code]) => code !== 0x70)
  .map(([code, level, bytes]) => ({
    code,
    level,
    bytes: bytes.slice(0, block_size(code)),
  }));

const string_ext: fc.Arbitrary<ByteExt> = fc.tuple(
  fc.integer({ min: 0x91, max: 0x9F }),
  fc.nat({ max: 4 }),
  fc.uint8Array(),
).map(([code, level, bytes]) => ({ code, level, bytes }));

export const arbs = fc.letrec<{
  int: number;
  bigint: bigint;
  bool: boolean;
  float: number;
  string: string;
  block_ext: ByteExt;
  string_ext: ByteExt;
  list_ext: ValueExt;
  tuple_ext: ValueExt;
  value: Value;
}>((tie) => ({
  int: fc.integer(),
  bigint: fc.bigInt({ min: -MAX_UINT64, max: MAX_UINT64 }),
  bool: fc.boolean(),
  float: fc.double({
    noNaN: true,
    noInteger: true,
  }),
  string: fc.string(),
  block_ext,
  string_ext,
  list_ext: fc.tuple(
    fc.integer({ min: 0xF0, max: 0xFE }),
    fc.nat({ max: 4 }),
    fc.array(tie("value")),
  ).map(([code, level, values]) => ({ code, level, values })),
  tuple_ext: fc.tuple(
    fc.integer({ min: 0xA0, max: 0xEF }),
    fc.nat({ max: 4 }),
    fc.infiniteStream(tie("value")),
  ).map(([code, level, values]) => ({
    code,
    level,
    values: Array.from(values.take(tuple_size(code))),
  })),
  value: fc.oneof(
    tie("int"),
    tie("bigint"),
    tie("bool"),
    tie("float"),
    tie("string"),
    tie("block_ext"),
    tie("string_ext"),
    tie("tuple_ext"),
    tie("list_ext"),
  ),
}));
