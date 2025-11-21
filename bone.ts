/**
 * BONE (Binary Ordered Notation with Extension) encoder/decoder.
 *
 * @example
 * ```ts
 * import { enc, encode, decode, dec } from "@mrmcc3/bone";
 *
 * // Create Bone values
 * const bones = [enc.bool(true), enc.int(42), enc.string("hello")];
 *
 * // Encode to binary
 * const bytes = encode(bones);
 *
 * // Decode back to Bone values
 * const decoded = decode(bytes);
 *
 * // Extract JavaScript values
 * const bool = dec.bool(decoded[0]); // true
 * const num = dec.int(decoded[1]); // 42
 * const str = dec.string(decoded[2]); // "hello"
 * ```
 *
 * @module
 */

export type Bone = {
	code: number;
	level?: number;
	values?: Bone[];
	bytes?: Uint8Array<ArrayBuffer>;
};

export * as enc from "./enc.ts";
export * as dec from "./dec.ts";
export { encode } from "./encode.ts";
export { decode } from "./decode.ts";
