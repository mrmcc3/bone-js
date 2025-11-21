import type { Bone } from "./bone.ts";

function valid({ code, values, bytes }: Bone): boolean {
	if (code < 0x09) return !values && bytes?.length === 8;
	if (code < 0x0A) return !values && bytes?.length === 7;
	if (code < 0x0B) return !values && bytes?.length === 6;
	if (code < 0x0C) return !values && bytes?.length === 5;
	if (code < 0x0D) return !values && bytes?.length === 4;
	if (code < 0x0E) return !values && bytes?.length === 3;
	if (code < 0x0F) return !values && bytes?.length === 2;
	if (code < 0x10) return !values && bytes?.length === 1;
	if (code < 0x18) return !values && !bytes;
	if (code < 0x19) return !values && bytes?.length === 1;
	if (code < 0x1A) return !values && bytes?.length === 2;
	if (code < 0x1B) return !values && bytes?.length === 3;
	if (code < 0x1C) return !values && bytes?.length === 4;
	if (code < 0x1D) return !values && bytes?.length === 5;
	if (code < 0x1E) return !values && bytes?.length === 6;
	if (code < 0x1F) return !values && bytes?.length === 7;
	if (code < 0x20) return !values && bytes?.length === 8;
	if (code < 0x30) return !values && !bytes;
	if (code < 0x40) return !values && bytes?.length === 1;
	if (code < 0x50) return !values && bytes?.length === 2;
	if (code < 0x60) return !values && bytes?.length === 3;
	if (code < 0x70) return !values && bytes?.length === 4;
	if (code < 0x80) return !values && bytes?.length === 8;
	if (code < 0x90) return !values && bytes?.length === 16;
	if (code < 0xA0) return !values && bytes?.length === 32;
	if (code < 0xB0) return !values && bytes?.at(-1) === 0;
	if (code < 0xC0) return values?.length === 1 && !bytes;
	if (code < 0xD0) return values?.length === 2 && !bytes;
	if (code < 0xE0) return values?.length === 3 && !bytes;
	if (code < 0xF0) return values?.length === 4 && !bytes;
	return Array.isArray(values) && bytes?.at(-1) === 0;
}

function check(value: Bone): Bone {
	if (!valid(value)) throw new Error("invalid bone value");
	return value;
}

export function encode(values: Bone[]): Uint8Array<ArrayBuffer> {
	let length = 0;
	const blobs: Uint8Array<ArrayBuffer>[] = [];
	const stack: Array<{ v: Bone; i: number }> = [];
	for (const v of values) {
		stack.push({ v: check(v), i: 0 });
		while (stack.length > 0) {
			const s = stack.at(-1)!;
			const { v: { code, level = 0, values, bytes } } = s;
			if (s.i === 0) {
				const head = new Uint8Array(level + 1);
				head.fill(0xFF, 0, level);
				head[level] = code;
				blobs.push(head);
				length += head.length;
			}
			if (values && s.i < values.length) {
				stack.push({ v: check(values[s.i++]), i: 0 });
			} else {
				if (bytes) {
					blobs.push(bytes);
					length += bytes.length;
				}
				stack.pop();
			}
		}
	}
	const output = new Uint8Array(length);
	let offset = 0;
	for (const blob of blobs) {
		output.set(blob, offset);
		offset += blob.length;
	}
	return output;
}
