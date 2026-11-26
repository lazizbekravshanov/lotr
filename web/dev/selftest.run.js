// Shared by selftest.html and selftest.mjs: load every case file, run each case, report PASS / FAIL lines.
const CASE_FILES = ["./lore.cases.js"];

function makeAssert() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg || "assertion failed");
  };
  assert.equal = (got, want, msg) => {
    const a = JSON.stringify(got), b = JSON.stringify(want);
    if (a !== b) throw new Error(`${msg ? msg + ": " : ""}got ${a}, want ${b}`);
  };
  return assert;
}

/** load(name) → Promise<module>. Returns {passed, failed, lines}. */
export async function run(load) {
  const lines = [];
  let passed = 0, failed = 0;
  for (const file of CASE_FILES) {
    let mod;
    try {
      mod = await load(file);
    } catch (err) {
      failed++;
      lines.push(`FAIL  ${file}: could not load (${err.message})`);
      continue;
    }
    for (const [name, fn] of mod.cases) {
      try {
        await fn(makeAssert());
        passed++;
        lines.push(`PASS  ${name}`);
      } catch (err) {
        failed++;
        lines.push(`FAIL  ${name}: ${err.message}`);
      }
    }
  }
  return { passed, failed, lines };
}
