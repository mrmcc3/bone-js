import type { Bone } from "./bone.ts";

function block_size(code: number): number {
	if (code < 0x08) return -1;
	if (code < 0x09) return 8;
	if (code < 0x0A) return 7;
	if (code < 0x0B) return 6;
	if (code < 0x0C) return 5;
	if (code < 0x0D) return 4;
	if (code < 0x0E) return 3;
	if (code < 0x0F) return 2;
	if (code < 0x10) return 1;
	if (code < 0x18) return 0;
	if (code < 0x19) return 1;
	if (code < 0x1A) return 2;
	if (code < 0x1B) return 3;
	if (code < 0x1C) return 4;
	if (code < 0x1D) return 5;
	if (code < 0x1E) return 6;
	if (code < 0x1F) return 7;
	if (code < 0x20) return 8;
	if (code < 0x30) return 0;
	if (code < 0x40) return 1;
	if (code < 0x50) return 2;
	if (code < 0x60) return 3;
	if (code < 0x70) return 4;
	if (code < 0x80) return 8;
	if (code < 0x90) return 16;
	if (code < 0xA0) return 32;
	return -1;
}

function tuple_size(code: number): number {
	if (code < 0xB0) return -1;
	if (code < 0xC0) return 1;
	if (code < 0xD0) return 2;
	if (code < 0xE0) return 3;
	if (code < 0xF0) return 4;
	return -1;
}

function read(bytes: Uint8Array, v: Bone): number {
	let i = 0;
	while (bytes[i] === 0xFF) {
		v.level!++;
		i++;
	}
	v.code = bytes[i++] ?? 0;
	if (v.code < 0x08) return i;
	if (v.code >= 0xB0) {
		v.values = [];
		return i;
	}
	const s = i;
	if (v.code < 0xA0) {
		i += block_size(v.code);
		if (s < i) v.bytes = bytes.slice(s, i);
		return i;
	}
	while (true) {
		if (bytes[i] === undefined) break;
		if (bytes[i - 1] === 0x00 && bytes[i] !== 0x01) break;
		i++;
	}
	v.bytes = bytes.slice(s, i);
	return i;
}

/** Decodes binary data into an array of Bone values. */
export function decode(bytes: Uint8Array<ArrayBuffer>): Bone[] {
	if (bytes.length === 0) return [];
	const stack: Bone[] = [];
	const output: Bone[] = [];
	for (let i = 0; i < bytes.length;) {
		const v: Bone = { code: 0, level: 0 };
		i += read(bytes.subarray(i), v);
		const target = stack.at(-1)?.values ?? output;
		if (v.code === 0x00) {
			const p = stack.at(-1);
			if (p === undefined || p.code < 0xF0) throw new Error("illegal null");
			p.bytes = new Uint8Array([0]);
		} else if (v.code < 0x08 || v.code > 0xFE) {
			throw new Error("illegal type code");
		} else {
			target.push(v);
			if (v.code >= 0xB0) stack.push(v);
		}
		for (let i = stack.length - 1; i >= 0; i--) {
			const v = stack[i];
			if (v.bytes || tuple_size(v.code) === v.values!.length) stack.pop();
			else break;
		}
	}
	return output;
}
