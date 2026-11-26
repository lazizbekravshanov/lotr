// Runs the self-test cases under node:  node web/dev/selftest.mjs
// Needs Node 22.12 or newer (it loads the site's plain .js modules as ES modules). The same cases run in any
// browser at /dev/selftest.html, so node is optional.
import { run } from "./selftest.run.js";

const { passed, failed, lines } = await run((name) => import(new URL(name, import.meta.url)));
for (const l of lines) console.log(l);
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
