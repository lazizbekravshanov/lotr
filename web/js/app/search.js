// Top-bar search over cities, states and (in the legend tongue) realms. The matching rules live in searchIndex.js:
// prefix matches first, then word-prefix, then substring; ties by population; a renamed place answers to both names.
import { esc, popShort } from "../format.js";
import { icon } from "../ui/icon.js";
import { buildEntries, queryEntries } from "./searchIndex.js";

const value = (v) => (typeof v === "function" ? v() : v);

/**
 * opts: {cities, states (list of {name, abbr, population?}, or a function returning it), realms?, aliases?,
 *        stateWord? (each a value or a function, read again on rebuild()),
 *        onPick({kind: 'city' | 'state' | 'realm', city?, index?, id?})}
 * Returns {focus(), close(), isOpen, rebuild()}: call rebuild() after display names change (js/lore.js).
 */
export function initSearch(opts) {
  const input = document.getElementById("search-input");
  const box = document.getElementById("search-results");
  if (!input || !box) return { focus() {}, close() {}, rebuild() {}, get isOpen() { return false; } };
  // The full placeholder only fits the wide search box; narrower ones say just "Search".
  const narrow = matchMedia("(max-width: 1120px)");
  const setPlaceholder = () => (input.placeholder = narrow.matches ? "Search" : "Search cities & states");
  setPlaceholder();
  narrow.addEventListener?.("change", setPlaceholder);

  let entries = [];
  let results = [];
  let sel = -1;
  const query = (q) => queryEntries(entries, q);

  function rebuild() {
    entries = buildEntries({
      cities: opts.cities, states: value(opts.states), realms: value(opts.realms), aliases: value(opts.aliases),
      stateWord: value(opts.stateWord),
    });
    if (!box.hidden && input.value.trim()) {
      results = query(input.value);
      sel = results.length ? 0 : -1;
      render();
    }
  }

  function position() {
    const r = input.getBoundingClientRect();
    const width = Math.min(Math.max(r.width, 320), window.innerWidth - 16);
    box.style.top = r.bottom + 6 + "px";
    box.style.left = Math.max(8, Math.min(window.innerWidth - width - 8, r.left)) + "px";
    box.style.width = width + "px";
  }

  function render() {
    if (!results.length) {
      box.innerHTML = input.value.trim() ? `<div class="sr-empty">No city or state matches “${esc(input.value.trim())}”</div>` : "";
      box.hidden = !input.value.trim();
      input.setAttribute("aria-expanded", String(!box.hidden));
      input.removeAttribute("aria-activedescendant");
      if (!box.hidden) position();
      return;
    }
    box.innerHTML = results
      .map((e, i) => `<div class="sr-item ${i === sel ? "sel" : ""}" role="option" id="sr-${i}" aria-selected="${i === sel}" data-i="${i}">
        <span class="sr-ic">${e.kind === "city" ? icon("pop", "🏙️", { size: 16 }) : icon(e.kind === "realm" ? "layers" : "terrain", "🗺️", { size: 16 })}</span>
        <span class="sr-main"><b>${esc(e.label)}</b><span class="sr-sub">${esc(e.altLabel && !e.sub.includes(e.altLabel) ? `${e.altLabel} · ${e.sub}` : e.sub)}</span></span>
        <span class="sr-pop">${e.pop ? popShort(e.pop) : ""}</span></div>`)
      .join("");
    box.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (sel >= 0) input.setAttribute("aria-activedescendant", `sr-${sel}`);
    else input.removeAttribute("aria-activedescendant");
    position();
  }

  function choose(i) {
    const e = results[i];
    if (!e) return;
    close();
    input.value = "";
    input.blur();
    opts.onPick(e.kind === "city" ? { kind: "city", city: e.city } : e.kind === "realm" ? { kind: "realm", id: e.id } : { kind: "state", index: e.index });
  }

  function close() {
    box.hidden = true;
    results = [];
    sel = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  input.addEventListener("input", () => {
    results = query(input.value);
    sel = results.length ? 0 : -1;
    render();
  });
  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      results = query(input.value);
      sel = results.length ? 0 : -1;
      render();
    }
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
      render();
      box.querySelector(".sel")?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results.length) choose(Math.max(0, sel));
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (!box.hidden && input.value) { input.value = ""; close(); }
      else { close(); input.blur(); }
    }
  });
  input.addEventListener("blur", () => setTimeout(() => {
    if (document.activeElement !== input) close();
  }, 150));
  box.addEventListener("pointerdown", (e) => e.preventDefault()); // keep focus in the input
  box.addEventListener("click", (e) => {
    const it = e.target.closest(".sr-item");
    if (it) choose(+it.dataset.i);
  });
  box.addEventListener("pointermove", (e) => {
    const it = e.target.closest(".sr-item");
    if (it && +it.dataset.i !== sel) {
      sel = +it.dataset.i;
      box.querySelectorAll(".sr-item").forEach((x, i) => {
        x.classList.toggle("sel", i === sel);
        x.setAttribute("aria-selected", String(i === sel));
      });
    }
  });
  window.addEventListener("resize", () => !box.hidden && position());
  rebuild();

  return {
    rebuild,
    focus() {
      input.focus();
      input.select();
    },
    close() {
      close();
      input.blur();
    },
    query,
    get isOpen() { return document.activeElement === input || !box.hidden; },
  };
}
