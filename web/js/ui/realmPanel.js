// The realm panel (legend tongue only): a realm of the legendarium is a union of whole states, so its figures are
// plain sums of theirs (data/legendarium.json realms[].totals; nothing is estimated). Renders into #city-panel like
// the city and state panels.
import { esc, popShort } from "../format.js";
import { isCapital } from "../world.js";
import { yieldGrid, gdpRow, popLine, showPanel } from "./infoPanel.js";

/**
 * ctx: {w, nation, cities, onClose, onPedia, onState(stateIndex), onCity(city)}
 */
export function openRealmPanel(realm, ctx) {
  const { w, nation } = ctx;
  const lore = w.lore;
  const totals = realm.totals || {};
  const count = lore.realms.length;

  const lands = realm.states
    .map((fips) => w.raw.states.findIndex((s) => s.fips === fips))
    .filter((idx) => idx >= 0)
    .map((idx) => {
      const st = w.raw.states[idx];
      return `<button class="chip" data-state="${idx}" title="${esc(lore.realName(st))}">${esc(st.name)}</button>`;
    })
    .join("");

  // cities.json is sorted by population, so the first eight of the realm are its largest.
  const cities = (ctx.cities || []).filter((c) => lore.realmOfCity(c) === realm).slice(0, 8);
  const cityRows = cities.length
    ? `<div class="city-list">${cities
        .map((c) => `<button class="city-row" data-city="${esc(c.id)}" title="${esc(c.full || c.name)}">
            <span class="cr-name">${isCapital(c) ? "★ " : ""}${esc(c.name)}${c.id === realm.capital ? ` <span class="muted">· chief city</span>` : ""}</span>
            <span class="cr-pop">${popShort(c.population)}</span><span class="cr-go" aria-hidden="true">›</span></button>`)
        .join("")}</div>`
    : `<p class="muted">No metro or micro areas in this realm's data.</p>`;

  showPanel({
    kind: "realm",
    kindLabel: "Realm",
    stripe: realm.colors[0],
    title: realm.name,
    sub: esc(realm.gloss),
    headExtra: totals.population != null ? popLine(totals) : "",
    sections: [
      totals.yields && { title: `Yields · rank among the ${count} realms`, html: `<div class="yield-grid">${yieldGrid(nation, totals.yields, realm.ranks, count)}</div>` },
      totals.gdp != null && { title: "Wealth", html: gdpRow({ gdp: totals.gdp, gdp_year: nation.nation?.gdp_year, population: totals.population }) },
      { title: `Lands · ${realm.states.length}`, html: `<div class="chips">${lands}</div>` },
      { title: "Biggest cities", html: cityRows },
    ],
    foot: `A realm is a reading of the map, not a unit of government. Its figures are sums over its states.
      Source: ${esc(nation.vintage)}${nation.gdp_vintage ? `; GDP: ${esc(nation.gdp_vintage)}` : ""}. Ranks are among the ${count} realms (1 = largest).`,
    onClose: ctx.onClose,
    onPedia: ctx.onPedia,
    wire(panel) {
      panel.querySelectorAll("[data-state]").forEach((b) => (b.onclick = () => ctx.onState(+b.dataset.state)));
      panel.querySelectorAll("[data-city]").forEach((b) => {
        b.onclick = () => {
          const c = ctx.cities.find((x) => x.id === b.dataset.city);
          if (c) ctx.onCity(c);
        };
      });
    },
  });
}
