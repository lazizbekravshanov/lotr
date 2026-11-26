import { css } from "../color.js";
import { esc } from "../format.js";
import { isCapital } from "../world.js";
import { yieldGrid, amenities, industries, gdpRow, popLine, growthSpan, showPanel, hidePanel, loreCard, realmChip } from "./infoPanel.js";

/**
 * ctx: {w, nation, onClose, onPedia, onState(stateIndex)}
 */
export function openCityPanel(city, ctx) {
  const { w, nation } = ctx;
  const n = nation.nation;
  const owner = city.cell != null ? w.raw.owner[city.cell] : -1;
  const lore = w.lore;
  const legend = lore?.ok && lore.tongue === "legend";
  const col = css(lore?.cityColor(city) || w.stateColor[owner] || [190, 190, 190]);
  const why = loreCard(lore, lore?.entry("places", city.id), lore?.realName(city));

  // The city's states as links to their state panels.
  const states = (city.states || [])
    .map((abbr) => ({ abbr, i: w.raw.states.findIndex((s) => s.abbr === abbr) }))
    .map(({ abbr, i }) => (i >= 0 && ctx.onState
      ? `<button class="chip" data-state="${i}" title="Open ${esc(w.raw.states[i].name)}">${esc(abbr)}</button>`
      : `<span class="chip">${esc(abbr)}</span>`))
    .join("") + (legend ? realmChip(lore.realmOfCity(city)) : "");

  const growth = growthSpan(city, n);

  showPanel({
    kind: "city",
    stripe: col,
    title: city.name,
    titleHtml: `${isCapital(city) ? `<span class="cap" title="National capital">★</span> ` : ""}${esc(city.name)}`,
    sub: `${esc(city.full || "")}${states ? `<div class="chips">${states}</div>` : ""}`,
    headExtra: popLine(city, growth),
    sections: [
      why && { title: "Why this name", html: why },
      { title: "Yields", html: `<div class="yield-grid">${yieldGrid(nation, city.yields)}</div>` },
      { title: "Amenities &amp; Housing", html: amenities(city, n) + gdpRow(city) },
      { title: "Districts · where people work", html: industries(city, nation) },
    ],
    foot: `Source: ${esc(nation.vintage)} (tables C24030, B19025, B19013, B25064, B25077, B23025)${nation.gdp_vintage ? `; GDP: ${esc(nation.gdp_vintage)}` : ""}.
      Green ×N = this industry's share of jobs is N× the U.S. share.`,
    onClose: ctx.onClose,
    onPedia: ctx.onPedia,
    wire(panel) {
      panel.querySelectorAll("[data-state]").forEach((b) => (b.onclick = () => ctx.onState(+b.dataset.state)));
      panel.querySelectorAll("[data-realm]").forEach((b) => (b.onclick = () => ctx.onRealm?.(b.dataset.realm)));
    },
  });
}

export const closeCityPanel = hidePanel;
