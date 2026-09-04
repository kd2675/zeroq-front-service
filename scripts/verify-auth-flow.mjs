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
const apiSource = await readFile(new URL("../app/lib/api.ts", import.meta.url), "utf8");
const discoverySource = await readFile(new URL("../app/hooks/useSpaceDiscovery.ts", import.meta.url), "utf8");
const profileSource = await readFile(new URL("../app/lib/profile.ts", import.meta.url), "utf8");

assert.match(callbackSource, /ensureAccessToken\(\)/);
assert.doesNotMatch(callbackSource, /get\("token"\)|setAccessToken\(/);
assert.doesNotMatch(loginSource, /get\(['"]token['"]\)|window\.location\.href/);
assert.match(loginSource, /window\.location\.replace/);
assert.match(loginSource, /AUTH_API_BASE.*oauth2\/authorize/s);
assert.match(loginSource, /await signup\(/);
assert.match(authSource, /explicitlySignedOut/);
assert.match(authSource, /requestGeneration !== authGeneration/);
assert.match(authSource, /postAuthJson<LoginResponse>\(\s*"\/auth\/login"/);
assert.match(authSource, /postAuthJson<void>\("\/auth\/logout"/);
assert.match(apiSource, /NEXT_PUBLIC_API_MODE \?\? "direct"/);
assert.match(apiSource, /DEFAULT_DIRECT_ZEROQ_API_BASE = "http:\/\/localhost:20180"/);
assert.match(apiSource, /DEFAULT_DIRECT_AUTH_API_BASE = "http:\/\/localhost:9000"/);
assert.match(apiSource, /baseUrl: AUTH_API_BASE/);
assert.match(authSource, /IS_GATEWAY_MODE \? null : getUserFromToken\(token\)/);
assert.match(authSource, /"X-User-Key"/);
assert.match(authSource, /"X-User-Role"/);
assert.match(discoverySource, /buildServiceAuthHeaders\(token\)/);
assert.match(profileSource, /buildServiceAuthHeaders\(accessToken\)/);

console.log("ZeroQ service authentication routing checks passed.");
