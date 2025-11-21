import type { Bone } from "./bone.ts";

/** Decodes a Bone value as a boolean. */
export function bool({ code }: Bone): boolean | undefined {
	if (code === 0x20) return false;
	if (code === 0x21) return true;
	return;
}

/** Decodes a Bone value as an integer (number or bigint). */
export function int({ code, bytes }: Bone): number | bigint | undefined {
	if (code < 0x08 || code > 0x1F) return;
	if (code >= 0x10 && code < 0x18) return code - 0x10;
	if (bytes === undefined) return;
	const neg = code < 0x10;
	const arr = new Uint8Array(8);
	if (neg) arr.fill(0xFF);
	arr.set(bytes, 8 - bytes.length);
	if (neg) {
		for (const i of arr.keys()) arr[i] = ~arr[i] & 0xFF;
	}
	const view = new DataView(arr.buffer);
	const int = view.getBigUint64(0, false);
	const abs = int <= Number.MAX_SAFE_INTEGER ? Number(int) : int;
	return neg ? -abs : abs;
}

/** Decodes a Bone value as a 64-bit float. */
export function f64({ code, bytes }: Bone): number | undefined {
	if (code !== 0x71 || !bytes || bytes.length !== 8) return;
	const clone = new Uint8Array(bytes);
	if ((clone[0] & 0x80) === 0) {
		for (const i of clone.keys()) clone[i] = ~clone[i] & 0xFF;
	} else {
		clone[0] = clone[0] & 0x7F;
	}
	return new DataView(clone.buffer).getFloat64(0, false);
}

function unescape(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
	const arr: number[] = [];
	for (let i = 0; i < bytes.length; i++) {
		if (bytes[i] === 0x01 && bytes[i - 1] === 0x00) continue;
		arr.push(bytes[i]);
	}
	if (arr.at(-1) === 0x00) arr.pop();
	return new Uint8Array(arr);
}

/** Decodes a Bone value as a string. */
export function string({ code, bytes }: Bone): string | undefined {
	if (code !== 0xA1 || !bytes) return;
	return new TextDecoder().decode(unescape(bytes));
}

/** Decodes a Bone value as a blob (Uint8Array). */
export function blob({ code, bytes }: Bone): Uint8Array<ArrayBuffer> | undefined {
	if (code === 0xA0 && bytes) return unescape(bytes);
	if ([0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90].includes(code)) return bytes;
	return;
}

/** Decodes a Bone value as an array of Bone values. */
export function vals({ values }: Bone): Bone[] | undefined {
	return values;
}
