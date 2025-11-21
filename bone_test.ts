import { assert, assertEquals } from "@std/assert";
import { dec, decode, enc, encode } from "./bone.ts";

Deno.test("bool", () => {
	const input = [true, false];
	const payload = encode(input.map(enc.bool));
	assertEquals(payload.toHex(), "2120");
	const output = decode(payload).map(dec.bool);
	assertEquals(input, output);
});

Deno.test("f64", () => {
	const input = [1.23, -2.25];
	const payload = encode(input.map(enc.f64));
	assertEquals(payload.toHex(), "71bff3ae147ae147ae713ffdffffffffffff");
	const output = decode(payload).map(dec.f64);
	assertEquals(input, output);
});

Deno.test("int", () => {
	const input = [1, 9, -100000000000000000n];
	const payload = encode(input.map(enc.int));
	assertEquals(payload.toHex(), "11180908fe9cba87a275ffff");
	const output = decode(payload).map(dec.int);
	assertEquals(input, output);
});

Deno.test("string", () => {
	const input = ["", "\0", "hello"];
	const payload = encode(input.map(enc.string));
	assertEquals(payload.toHex(), "a100a1000100a168656c6c6f00");
	const output = decode(payload).map(dec.string);
	assertEquals(input, output);
});

Deno.test("blob", () => {
	const rand = crypto.getRandomValues(new Uint8Array(32)).toHex();
	const input = ["00", "00", "11223344", rand].map(Uint8Array.fromHex);
	const payload = encode(input.map((arr, i) => enc.blob(arr, i > 0)));
	assertEquals(payload.toHex(), `a00001003000601122334490${rand}`);
	const output = decode(payload).map(dec.blob);
	assertEquals(input, output);
});

Deno.test("vals", () => {
	const input = [
		[enc.bool(true), enc.int(3)],
		[enc.string("\0")],
	];
	const payload = encode(input.map((vs, i) => enc.vals(vs, i === 0)));
	assertEquals(payload.toHex(), "c02113f0a100010000");
	const output = decode(payload).map(dec.vals);
	assert(dec.bool(output[0]![0]) === true);
	assert(dec.int(output[0]![1]) === 3);
	assert(dec.string(output[1]![0]) === "\0");
});
