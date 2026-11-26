// App test cases: the whole site in a frame (dev/apptest.html), driven through window.__app and the DOM. These
// cover what the pure self-test (lore.cases.js) cannot: what each screen shows after the Names switch, the
// address-bar keys, and the realm and lens rules of the real tongue.
// Each case is [name, async fn(assert, {open})]; open(hash) loads a fresh copy of the site and resolves {app, win, doc}.

const NYC = "35620"; // New York: Fornost Erain in the legend tongue
const PHILLY = "37980"; // Philadelphia: Michel Delving
const INDY = "26900"; // Indianapolis: Bree

async function until(fn, what, ms = 10000) {
  const t0 = performance.now();
  for (;;) {
    let v = null;
    try { v = fn(); } catch { v = null; }
    if (v) return v;
    if (performance.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 30));
  }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (doc, sel) => doc.querySelector(sel)?.textContent.trim() ?? "";
const stateIdx = (app, abbr) => app.w.raw.states.findIndex((s) => s.abbr === abbr);
// The Names button, used the way a person uses it: focus it, press it.
function pressNames(doc) {
  const b = doc.getElementById("btn-names");
  b.focus();
  b.click();
}
const advisorUp = (app, doc) => app.mode === "advisor" && app.advisors.data() && doc.querySelector(".adv-body") && !doc.querySelector(".adv-loading");

export const cases = [
  ["address bar: names, realm and unknown values", async (assert, { open }) => {
    let { app, win, doc } = await open("names=real");
    assert.equal(app.lore.tongue, "real");
    ({ app, doc } = await open("realm=gondor"));
    assert.equal(app.state.selectedRealm, "gondor");
    assert.equal(text(doc, "#city-panel .cp-name"), "Gondor");
    ({ app } = await open("realm=gondor&names=real"));
    assert.equal(app.state.selectedRealm, null, "no realms in the real tongue");
    ({ app, win } = await open("names=bogus&age=zz&realm=nowhere"));
    assert.equal([app.lore.tongue, app.lore.age, app.state.selectedRealm], ["legend", "ta", null]);
    app.lore.setTongue("real");
    app.url.flush();
    assert(win.location.hash.includes("names=real"), `the app writes names=real (${win.location.hash})`);
  }],

  ["#state= takes the real state name in either tongue", async (assert, { open }) => {
    for (const hash of ["state=Texas", "names=real&state=Texas", "state=Rohan", "state=TX", "state=48"]) {
      const { app } = await open(hash);
      assert.equal(app.state.selectedState, stateIdx(app, "TX"), hash);
    }
  }],

  ["names switch: reports are built again", async (assert, { open }) => {
    const { app, doc } = await open("");
    const top = () => app.reports.build("population").boards.modes[0].metros.slice(0, 3).map((r) => r.name);
    assert(top().includes("Fornost Erain"), `legend report: ${top()}`);
    pressNames(doc);
    assert(top().includes("New York") && !top().includes("Fornost Erain"), `real report: ${top()}`);
  }],

  ["names switch: an open panel beside an advisor shows the new names", async (assert, { open }) => {
    const { app, doc } = await open("advisor=economy");
    await until(() => advisorUp(app, doc), "the Economy advisor");
    app.selectCity(NYC, { fly: false });
    await until(() => text(doc, "#city-panel .cp-name") === "Fornost Erain", "the quick panel in the legend tongue");
    pressNames(doc);
    await until(() => text(doc, "#city-panel .cp-name") === "New York", `the panel in real names (it says "${text(doc, "#city-panel .cp-name")}")`, 3000);
  }],

  ["names switch: the advisors show the new names", async (assert, { open }) => {
    const { app, doc } = await open("advisor=economy");
    await until(() => advisorUp(app, doc), "the Economy advisor");
    const row = () => app.advisors.data()?.levels.metros.byKey.get(NYC)?.name;
    assert.equal(row(), "Fornost Erain");
    assert(text(doc, ".adv-main").includes("Fornost Erain"), "the legend name is in the dock");
    pressNames(doc);
    await until(() => row() === "New York" && advisorUp(app, doc), `the advisor's rows in real names (row says "${row()}")`, 5000);
    assert(!text(doc, ".adv-main").includes("Fornost Erain"), "no legend name left in the dock");
    assert.equal(app.mode, "advisor");
  }],

  ["names switch: the City View keeps its city, camera and focus", async (assert, { open }) => {
    const { app, doc } = await open(`city=${NYC}&view=city`);
    await until(() => app.mode === "city" && app.cityView.city?.id === NYC, "the City View");
    app.cityView.open(app.cityById.get(PHILLY)); // switch city inside the view, as a banner click does
    await until(() => app.cityView.city?.id === PHILLY, "Philadelphia");
    await wait(100);
    // Where the camera is going (a hidden page draws no frames, so a flight may never land while this runs).
    const aim = () => (app.cam.flight ? [app.cam.flight.x1, app.cam.flight.y1, app.cam.flight.s1] : [app.cam.x, app.cam.y, app.cam.scale]);
    const before = aim();
    pressNames(doc);
    await wait(400);
    assert.equal(app.mode, "city");
    assert.equal(app.cityView.city?.id, PHILLY, "still Philadelphia");
    assert.equal(text(doc, ".cv-dock .cv-name"), "Philadelphia");
    assert.equal(aim(), before, "the camera keeps its course");
    assert.equal(doc.activeElement?.id, "btn-names", "focus stays on the Names button");
  }],

  ["the City View says why a city has its name", async (assert, { open }) => {
    let { app, doc } = await open(`city=${INDY}&view=city`);
    await until(() => app.mode === "city" && doc.querySelector(".cv-dock .cv-name"), "the City View");
    assert.equal(text(doc, ".cv-dock .cv-name"), "Bree");
    assert(text(doc, ".cv-dock .lore-card").includes("crossroads"), `the reason (${text(doc, ".cv-dock .lore-card")})`);
    const chip = doc.querySelector('.cv-dock [data-realm="arnor"]');
    assert(chip, "a realm chip for Arnor");
    chip.click();
    await until(() => app.state.selectedRealm === "arnor" && app.mode == null, "the realm of Arnor, City View closed");
    ({ app, doc } = await open(`city=${INDY}&view=city&names=real`));
    await until(() => app.mode === "city" && doc.querySelector(".cv-dock .cv-name"), "the City View in real names");
    assert.equal(text(doc, ".cv-dock .cv-name"), "Indianapolis");
    assert.equal(doc.querySelector(".cv-dock .lore-card, .cv-dock [data-realm]"), null, "no lore in the real tongue");
  }],

  ["real names: the Realms lens cannot be reached", async (assert, { open }) => {
    let { app, win, doc } = await open("");
    app.setLens("realms");
    assert.equal(app.state.lens?.id, "realms", "the legend tongue has it");
    app.lensDock.remember("realms");
    app.setLens(null);
    pressNames(doc);
    assert.equal(doc.querySelector('#lens-quick [data-id="realms"]'), null, "not in the quick row");
    app.setLens("realms");
    assert.equal(app.state.lens, null, "setLens refuses it");
    for (let k = 0; k < 25; k++) {
      win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "l", shiftKey: k % 2 === 1 }));
      assert(app.state.lens?.id !== "realms", "the L key never lands on it");
    }
    app.lensDock.openPicker();
    assert.equal(doc.querySelector('#lens-picker [data-id="realms"]'), null, "not in the picker");
    app.lensDock.closePicker();
    app.pedia.open("Lenses");
    assert(!text(doc, "#pedia-body").includes("Realms"), "not in the Almanac");
    app.pedia.close();
    ({ app, win } = await open("names=real"));
    win.location.hash = "lens=realms&names=real";
    await wait(150);
    assert.equal(app.state.lens, null, "a lens=realms link is refused in the real tongue");
  }],

  ["a realm leaves other highlights alone", async (assert, { open }) => {
    const { app } = await open("realm=gondor");
    assert.equal(app.state.selectedRealm, "gondor");
    const mine = { cells: new Set([0]) }; // as an extension sets one
    app.setHighlight(mine);
    app.selectCity(NYC, { fly: false });
    assert.equal(app.state.selectedRealm, null);
    assert(app.state.highlight === mine, "selecting a city must not wipe another's highlight");
  }],
];
