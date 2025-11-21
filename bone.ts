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
