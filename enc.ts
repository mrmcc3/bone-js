import type { Bone } from "./bone.ts";

export function bool(b: boolean): Bone {
	return { code: b ? 0x21 : 0x20 };
}

const UINT64_MAX = 2n ** (8n * 8n) - 1n;

export function int(i: number | bigint): Bone {
	const int = BigInt(i);
	const nat = int >= 0;
	if (nat && int < 8) return { code: 0x10 + Number(int) };
	const abs = nat ? int : -int;
	if (abs > UINT64_MAX) throw new Error("integer is too big");
	const arr = new Uint8Array(8);
	const view = new DataView(arr.buffer);
	view.setBigUint64(0, abs, false);
	const s = 8 - arr.findIndex((b) => b != 0);
	if (nat) return { code: 0x17 + s, bytes: arr.slice(-s) };
	for (const i of arr.keys()) arr[i] = ~arr[i] & 0xFF;
	return { code: 0x10 - s, bytes: arr.slice(-s) };
}

export function f64(f: number): Bone {
	const bytes = new Uint8Array(8);
	new DataView(bytes.buffer).setFloat64(0, f, false);
	if ((bytes[0] & 0x80) === 0) {
		bytes[0] = bytes[0] | 0x80;
	} else {
		for (const i of bytes.keys()) bytes[i] = ~bytes[i] & 0xFF;
	}
	return { code: 0x71, bytes };
}

function escape(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
	const nulls = bytes.reduce((a, b) => b === 0 ? a + 1 : a, 0);
	const output = new Uint8Array(bytes.length + nulls + 1);
	let j = 0;
	if (nulls === 0) {
		output.set(bytes, j);
		j += bytes.length;
	} else {
		for (const i of bytes.keys()) {
			output[j++] = bytes[i];
			if (bytes[i] === 0) output[j++] = 0x01;
		}
	}
	output[j] = 0x00;
	return output;
}

export function string(s: string): Bone {
	const bytes = new TextEncoder().encode(s);
	return { code: 0xA1, bytes: escape(bytes) };
}

export function blob(bytes: Uint8Array<ArrayBuffer>, fixed_length = false): Bone {
	if (!fixed_length) return { code: 0xA0, bytes: escape(bytes) };
	if (bytes.length === 1) return { code: 0x30, bytes };
	if (bytes.length === 2) return { code: 0x40, bytes };
	if (bytes.length === 3) return { code: 0x50, bytes };
	if (bytes.length === 4) return { code: 0x60, bytes };
	if (bytes.length === 8) return { code: 0x70, bytes };
	if (bytes.length === 16) return { code: 0x80, bytes };
	if (bytes.length === 32) return { code: 0x90, bytes };
	throw new Error("unsupported block size");
}

export function vals(values: Bone[], fixed_length = false): Bone {
	if (!fixed_length) return { code: 0xF0, values, bytes: new Uint8Array([0]) };
	if (values.length === 1) return { code: 0xB0, values };
	if (values.length === 2) return { code: 0xC0, values };
	if (values.length === 3) return { code: 0xD0, values };
	if (values.length === 4) return { code: 0xE0, values };
	throw new Error("unsupported tuple size");
}
