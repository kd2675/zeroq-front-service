import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildLoginPath, sanitizeAuthNextPath } from "../app/lib/authRouting.ts";

assert.equal(sanitizeAuthNextPath("/?space=3"), "/?space=3");
assert.equal(sanitizeAuthNextPath("https://attacker.example/steal"), "/");
assert.equal(sanitizeAuthNextPath("//attacker.example/steal"), "/");
assert.equal(sanitizeAuthNextPath("/auth/callback"), "/");
assert.equal(buildLoginPath("/?space=3", true), "/login?next=%2F%3Fspace%3D3&expired=1");

const callbackSource = await readFile(new URL("../app/auth/callback/page.tsx", import.meta.url), "utf8");
const loginSource = await readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8");
const authSource = await readFile(new URL("../app/lib/auth.ts", import.meta.url), "utf8");

assert.match(callbackSource, /ensureAccessToken\(\)/);
assert.doesNotMatch(callbackSource, /get\("token"\)|setAccessToken\(/);
assert.doesNotMatch(loginSource, /get\(['"]token['"]\)|window\.location\.href/);
assert.match(loginSource, /window\.location\.replace/);
assert.match(loginSource, /await signup\(/);
assert.match(authSource, /explicitlySignedOut/);
assert.match(authSource, /requestGeneration !== authGeneration/);

console.log("ZeroQ service authentication routing checks passed.");
