import assert from "node:assert/strict";
import test from "node:test";
import generateShortCode from "../utils/base62.js";

test("generates 100,000 unique Base62 codes with the expected format", () => {
    const codes = new Set<string>();

    for (let index = 0; index < 100_000; index += 1) {
        const code = generateShortCode(10);
        assert.match(code, /^[0-9a-zA-Z]{10}$/);
        codes.add(code);
    }

    assert.equal(codes.size, 100_000);
});