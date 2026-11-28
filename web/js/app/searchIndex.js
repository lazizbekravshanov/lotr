// The search index: entries for cities, states and realms, and how a query scores against one. Pure (no DOM), so
// it is covered by the self-test (dev/lore.cases.js). app/search.js is the box that uses it.
//
// Every renamed place answers to both of its names: the one on screen and its alias, the other tongue's name
// (js/lore.js aliases()). Matches on the shown name rank first: prefix, then word-prefix, then substring; the alias
// follows the same order two ranks lower. Ties go to the larger population.
import { normName } from "../lore.js";

export const MAX_RESULTS = 8;

/**
 * opts: {cities, states: [{name, abbr, population?}] (by state index), realms?: [{id, name, gloss, totals?}],
 *        aliases?: [{kind: "city" | "state", id, alias}], stateWord?: what a state is called ("State")}
 */
export function buildEntries(opts) {
  const alias = new Map((opts.aliases || []).map((a) => [`${a.kind}:${a.id}`, a.alias]));
  const entries = [];
  for (const c of opts.cities || []) {
    const alt = alias.get(`city:${c.id}`) || "";
    entries.push({
      kind: "city", city: c, label: c.name, n: normName(c.name), full: normName(c.full), alt: normName(alt), altLabel: alt,
      pop: c.population || 0, sub: c.full || "",
    });
  }
  (opts.states || []).forEach((s, index) => {
    if (!s) return;
    const alt = alias.get(`state:${index}`) || "";
    entries.push({
      kind: "state", index, label: s.name, n: normName(s.name), full: normName(s.abbr), abbr: (s.abbr || "").toLowerCase(),
      alt: normName(alt), altLabel: alt, pop: s.population || 0, sub: opts.stateWord || "State",
    });
  });
  for (const r of opts.realms || []) {
    entries.push({
      kind: "realm", id: r.id, label: r.name, n: normName(r.name), full: normName(r.gloss), alt: "", altLabel: "",
      pop: r.totals?.population || 0, sub: "Realm",
    });
  }
  return entries;
}

/** How well entry `e` matches the normalised query `q`: 0 is best, -1 is no match. */
export function scoreEntry(e, q) {
  if (e.abbr && e.abbr === q) return 0;
  if (e.n.startsWith(q)) return e.n === q ? 0 : 1;
  if ((" " + e.n).includes(" " + q)) return 2;
  if (e.alt) {
    if (e.alt.startsWith(q)) return e.alt === q ? 2 : 3;
    if ((" " + e.alt).includes(" " + q)) return 4;
  }
  if ((" " + e.full).includes(" " + q)) return 3;
  if (e.n.includes(q)) return 4;
  if (e.full.includes(q)) return 5;
  if (e.alt && e.alt.includes(q)) return 6;
  return -1;
}

/** The best MAX_RESULTS entries for what was typed. */
export function queryEntries(entries, typed) {
  const q = normName(typed);
  if (!q) return [];
  const out = [];
  for (const e of entries) {
    const s = scoreEntry(e, q);
    if (s >= 0) out.push([s, e]);
  }
  out.sort((a, b) => a[0] - b[0] || b[1].pop - a[1].pop);
  return out.slice(0, MAX_RESULTS).map((x) => x[1]);
}
