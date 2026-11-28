# The Reunited States: design

Status: draft v0 for approval, 25 November 2026. Nothing is built yet.
Visual companion: `docs/design/concept/` (published privately as "Reunited States Design Atlas").
Seed content: `docs/design/concept/legendarium-draft.json`.

"The Reunited States" is a working name. See section 11 for why the public name should not use Tolkien's trademarks.

## 1. Intent

Build a Tolkien edition of Andrej Karpathy's usaciv. usaciv draws the real lower-48 United States as a 4X strategy map from public data. This edition shows the same country, the same data and the same features, recast as Middle-earth: realms instead of state colours, Tolkien's place-names on real cities, his landmarks on real landmarks, and original art in the idiom of his world.

What the owner asked for, in his words: "build the civilization of Tolkien's World", "The Lord of the Rings but on the US Map", "show what Karpathy's project showing in Tolkien's version", interactive, deployable to a domain, "at its full capacity", drawing on The Lord of the Rings, The Hobbit and The Rings of Power.

Who it is for: people who like both Tolkien and maps of real data. The hook is personal: find your home town in Middle-earth, then find out why it is what it is.

## 2. Goals, non-goals, anti-goals

Goals

1. Parity. Every usaciv feature exists in this edition: hex map, yields, banners, improvements, military, wonders, trade routes, lenses, City View, Advisors, Almanac, search, sharing, URL state, art gallery, trailer maker, phone layout.
2. A reason for every match, visible in the app.
3. Real numbers stay intact and traceable. One switch shows real names everywhere.
4. Its own look. Original, code-drawn art. It must not read as usaciv with new labels.
5. Three Ages of the same map: Second (The Rings of Power), Third (The Hobbit and the War of the Ring), Fourth.
6. Still a static site: no framework, no npm, no build step, deployable to any static host.

Non-goals

- Not a game. No turns, combat or win conditions.
- Not a map of Middle-earth's own geography. The land is always the real United States.
- No Alaska or Hawaii (inherited from usaciv), no backend, no accounts, no translations.
- No new real-data sources in the first release.

Anti-goals (these would make it a failure even if it works)

- Invented or altered numbers.
- Casting any real community as a people of the tales. Lands are matched to lands only.
- A film or TV look-alike: no film or series assets, fonts, designs or music, and no copied map furniture from the published maps.
- Long quotations from the books.
- Ads, sales or anything that could pass as official.

## 3. What exists today

usaciv (MIT, © 2026 Andrej Karpathy) as shipped in `usaciv-source.zip`:

- World: Albers projection, pointy-top odd-r hex grid, 117 x 90 = 10,530 cells of 25 km radius; 4,807 US land cells; 49 "states" (48 plus DC); 3,109 counties; 60 river polylines.
- Data files in `web/data/` (about 6 MB): world, cities (524 metro and micro areas), states, nation, counties, lenses (19 in 7 groups), resources (21 types, 618 items), infrastructure (2,392 road links, 1,357 rail links, 136 ports, 368 airports), military (660 installations, 30 ranges), wonders (52 by published rules), trade (40 routes), districts (10 kinds), citizens, disasters, sources (31).
- Browser: plain ES modules and Canvas 2D. `web/js/main.js` is the shell; `render/art/*` holds all tile art; `ext/` holds City View, Advisors and map layers, built on a small app API.
- Pipeline: Python standard library only. Sources produce interims; builders produce `web/data/*.json`; `check.py` gates on a contract in `docs/DATA_CONTRACTS.md`. 176 unit tests.
- The zip ships built `web/data` but not `data/raw` (about 500 MB of downloads) or `data/interim`. A full rebuild works but needs those downloads.

Facts that shape this design:

- Much visible text and colour comes from data files, not code (yield labels, lens names, district names, resource types, cover colours).
- Real names drive pipeline logic (state sort order, state-capital detection, city placement). They must never be overwritten.
- Many files key on postal abbreviation, others on FIPS, CBSA or GEOID. Real ids must stay the keys.
- One serif font stack is duplicated in six places; fonts must be loaded before canvas sprites are cached.

## 4. Approaches

### 4.1 How to lay Middle-earth over America

A. The applicability map (chosen, pending approval). Each land goes to the realm it most resembles, geography first and character second. Every large city gets a strong identity and no home is an insult. Cost: story distances bend (Gondor and Mordor are far apart).

B. The mirror map. Flip Tolkien's map east to west so the Sea is the Atlantic, and keep its order: Shire in the Midwest, Rivendell at Boulder, Moria under the Continental Divide, the Great River is the Colorado, Minas Tirith is Phoenix, Mordor is Nevada. The Quest traces well along I-70. Cost: the East and South, where most people live, fall on Tolkien's empty lands, Washington is not the White City, and the ten largest metros get weak names.

C. The scale overlay. Lay the true-scale outline over the country and read off what falls where. Honest about size, arbitrary about meaning, and it drops Mordor on real communities. Rejected as the main layout; possible later as an optional ghost outline.

The layout is data (section 6.2). Choosing differently later means editing lore tables, not code.

### 4.2 How to build it

1. Fork usaciv and re-theme it in place (chosen). Keeps parity for free and keeps the "no build" property. Cost: the art modules are large and must be rewritten painter by painter.
2. Rewrite on a framework or WebGL. Rejected: months of work to regain parity, and no benefit the owner asked for.
3. A runtime skin over an untouched usaciv. Rejected: it cannot change the art, so it fails goal 4.

## 5. The world

### 5.1 Principles

1. The real numbers never change. Only names, art and stories do.
2. Lands are matched to lands, never peoples to peoples.
3. A place whose listing is itself an Indigenous community or heritage site keeps its own name (Taos Pueblo, Cahokia Mounds). Landmarks on or beside Native nations' lands may take a landform name from the tales (a gorge, a range, a river's springs), never the name of a monster or of an enemy stronghold. The builder enforces the kept list.
4. Every match states its basis: `place` (geography), `likeness` (form or character), `name` (the real name already echoes the tale), `new` (our invention, always marked), or `none` (kept as it is).
5. Cities without a strong match keep their real names. Tolkien's conceit is that the tales are told in the Common Speech, so real English names are in keeping.
6. The framing is playful applicability, stated on the page. It is not a claim about what Tolkien meant.

### 5.2 Realms

Fifteen realms, each a union of whole states. Whole states keep sums exact and borders simple. A city may carry a different culture from its land (Pittsburgh is a Dwarf-hold inside the Shire's borders).

| Realm | States | People (flavour only) | Device, colours |
|---|---|---|---|
| Lindon | ME NH VT MA RI CT | Elves | stars, blue and silver |
| Arnor | NY OH IN IL WI | Men of the West | one star, indigo |
| The Shire | PA NJ DE | Hobbits | leaf, green and yellow |
| Ered Luin | WV KY | Dwarves | anvil, steel blue and copper |
| Gondor | MD DC VA NC SC GA FL AL MS LA TN AR | Men of the West | white tree, silver and black |
| Rohan | TX OK | Horse-lords | white horse, green |
| The Iron Hills | MI | Dwarves | hammer, rust |
| Forochel | MN | Snowmen | snowflake, ice blue |
| Rhovanion | IA MO KS NE SD ND MT | Northmen | bear, tawny |
| The Misty Mountains | CO WY ID UT | Dwarves and Elves | three peaks, grey-violet |
| Nan Curunír | NM | Wizards | white hand, ash grey |
| Harondor | AZ | Men | sun, terracotta |
| Mordor | NV | Freed folk of Nurn (after the War) | red eye, black |
| Lothlórien | CA | Elves | mallorn, gold |
| Erebor and Dale | WA OR | Dwarves, Men, Wood-elves | lone mountain, teal and gold |

Each state also has a land name inside its realm (Pennsylvania is the Shire, New Jersey is Buckland, Florida is Belfalas, Virginia is Lossarnach, Colorado is Khazad-dûm, and so on). All 49 are in the draft file with basis and reason.

Known weak spots, stated honestly: Gondor does not border Mordor (only Harondor, "South Gondor", does); Minas Tirith is 1,200 km from the Great River; Lothlórien lies beyond Mordor. These follow from choosing approach A.

### 5.3 Names

- Tier 1, named places: about 50 metros in the draft, to grow to roughly 80 to 120 after a pass against the Third Age gazetteer. Each has a canonical name, basis and a one-line reason. Examples: Washington is Minas Tirith, New York is Fornost Erain, Chicago is Annúminas, Boston is Mithlond, Indianapolis is Bree, Lancaster is Hobbiton, Austin is Edoras, San Antonio is the Hornburg, El Paso is the Fords of Isen, New Orleans is Pelargir, Memphis is Osgiliath, Miami is Dol Amroth, Tampa is Umbar, Denver is Khazad-dûm, Las Vegas is Barad-dûr, San Francisco is Ost-in-Edhil, Los Angeles is Caras Galadhon, Seattle is Esgaroth, Portland is Dale.
- Tier 2, everything else: real name, drawn in the banner style of its realm.
- No coined Elvish in the first release. A coined name is allowed only with basis `new`.
- A canonical name is used once, except where the tales themselves repeat it (two Harlonds).
- Rivers, ranges, seas and wastes get cartographic labels: the Mississippi is Anduin, the Missouri is Langwell, the Arkansas is Entwash, the Rio Grande is Isen, the Ohio is Gwathló, the Columbia is Celduin, the Rockies are Hithaeglir, the Appalachians are Ered Luin (north) and Ered Nimrais (south), the Sierra Nevada is Ephel Dúath, the Atlantic is Belegaer, the Gulf is the Bay of Belfalas.

### 5.4 Wonders, legend sites, hosts

- usaciv's 52 wonders stay, chosen by the same published rules. Thirty get a name from the tales (Great Smoky Mountains: the Beacons of Gondor; Zion: Imladris; Mount Rushmore: the Argonath; the Alamo: the Hornburg; Cape Canaveral: the Quays of Edhellond; Lake Mead: the Sea of Núrnen; the National Mall: the Court of the Fountain). The 20 universities keep their names and become Houses of Lore. Taos Pueblo and Cahokia Mounds keep their names on principle 3.
- Legend sites are new: about 20 curated landmarks that usaciv's rules do not select but the tales need (Mount Rainier: Erebor; the St. Helens blast zone: the Desolation of Smaug; Lunar Crater, Nevada: Orodruin; Los Alamos: Orthanc; Niagara Falls: Rauros; Mammoth Cave: the Glittering Caves; Kennett Square: Bamfurlong). They are decoration with a real-place card. They carry no statistics.
- The 660 installations keep their real names. Their service decides the art and the type name (section 5.5). A handful of flagships may get epithets.

### 5.5 Vocabulary

Every themed label shows its plain real definition directly beneath it. The legend, caveats and sources of each number are unchanged.

| usaciv | This edition |
|---|---|
| Yields: Food, Production, Gold, Science, Culture | Harvest, Craft, Gold, Lore, Song |
| Population, Unemployment | Folk, Idle hands |
| Lenses | Seeing-stones |
| Lens groups: People, Prosperity, Knowledge, Daily life, Faith, Hazards, Land | Folk, Hearth and hoard, Lore, Days, Faith, Perils, Land |
| Districts: Campus, Commercial hub, Industrial zone, Harbor, Theater square, Entertainment complex, Aerodrome, Government plaza, Encampment, Aqueduct | House of Lore, Counting-house, Forges, Havens, Hall of Song, Inn and fairground, Eyrie, Citadel, Muster-field, Mill and water-works |
| City badges (26 labels), e.g. Tech city, Silicon city, Motor city, Casino city, Film capital, College town | Same rule, themed label, real label on hover: City of Smiths, Ring-makers' town, Wainwrights' town, Dicing-town, City of the Mirror, Lore-town |
| Roads: Interstate, major highway | Great Roads (paved), cart-roads |
| Railroads | Dwarf-roads |
| Ports; airports | Havens and quays; Eyries of the Eagles |
| Services: Army, Navy, Air and Space Force, Marines, Guard, Reserve | Host, Fleet, Eagles, Sea-guard, Muster, Reserve |
| Installation tiers: major, base, site; ranges | Great fortress, keep, watch-post; forbidden ground |
| Trade modes: truck, rail, water, air, pipeline | Wains, Dwarf-road wains, barges and ships, Eagles, conduits |
| Resources (21) | Plain craft names: Sun-furnace (nuclear), Great dam, Windmills, Sun-fields, Coal delving, Black-oil field, Fire-vents (gas), Hot springs; silver and platinum are marked as the jest "mithril lode" |
| Citizens by occupation (9) | Stewards and reeves; Wrights and reckoners; Loremasters, scribes and minstrels; Healers; Innkeepers and servers; Merchants and clerks; Farmers, fishers and foresters; Masons and menders; Makers and carters |
| Advisors (10) | The Council: Master of the Hoard (Economy), Steward of the Hearth (Prosperity), Harbour-master (Commerce), Master Smith (Energy), Reeve of the Count (People), Loremaster (Knowledge), Ranger (Land), Marshal (Military), Minstrel (Culture), Map-maker (Explorer) |
| Almanac | The Red Book, with new pages: Correspondences, Ages, Credits and terms |
| "Turn 2025" | "Reckoned 2025" plus an Age chip |

The Faith lenses keep their real category names and credits unchanged.

### 5.6 Ages

An Age changes names, lore text, which legend sites show, and some art states. It never changes a number. The top bar always shows the real data year.

- Third Age 3018 (default): the War of the Ring. The Hobbit's places are on the same map.
- Second Age: as compressed by The Rings of Power. Eregion and Khazad-dûm thrive; Lindon is the High King's realm; Mirkwood is Greenwood; Lothlórien is Lórinand; Mordor's tower is rising; Arnor and Gondor are "the shores of the Sea-kings" with their havens (Pelargir, Lond Daer, Umbar); a star-shaped Númenor is drawn in the Atlantic as decoration with no data.
- Fourth Age: the King's peace. The Dark Tower's site is a ruin and Las Vegas is a free city of Nurn; the lore of Annúminas and Osgiliath tells of their rebuilding; the Glittering Caves are a Dwarf colony.

No real city is ever drawn as a ruin, in any Age. Where the tale has a city fallen by the Age shown (Fornost, Annúminas, Osgiliath, Tharbad, Ost-in-Edhil, Khazad-dûm), the map draws it as it stood in its great days and its lore text says so. Ruin and unbuilt states apply only to legend sites and strongholds.

Book canon and show canon are kept apart in the lore text, and show-invented names (the Southlands, Ostirith, Caras Gaer) are not used.

### 5.7 Great Journeys

A new layer that draws canonical journeys along the real road graph, in the manner of trade routes: the Quest of the Ring from Hobbiton (Lancaster) to Orodruin, and There and Back Again from the Shire to Erebor (Mount Rainier). Each shows the straight-line distance summed from stop to stop, labelled as such; the drawn path follows the road graph as a drawing aid, not data, the same caveat usaciv gives for trade routes. Journeys follow the named places in story order, so they also show honestly where approach A bends the story.

## 6. System design

### 6.1 Repository after the fork

```
LICENSE                    MIT with both copyright lines (Karpathy; Ravshanov)
README.md                  ours: credits usaciv, the data publishers, and the fan-work disclaimer
pipeline/                  usaciv's, unchanged except:
  __main__.py              `serve` sends Cache-Control: no-cache, so an edited file shows on reload
  lore/                    NEW hand-written tables, plain Python
    realms.py lands.py places.py wonders.py sites.py rivers.py labels.py
    hosts.py vocab.py ages.py moods.py journeys.py
  build/legendarium.py     NEW builder -> web/data/legendarium.json
tests/test_legendarium.py  NEW
web/
  data/legendarium.json    NEW (generated)
  fonts/                   NEW self-hosted OFL fonts with their licence files
  js/lore.js               NEW names, basis, culture, mood, age
  js/theme.js              NEW one home for canvas fonts and colours
  js/site.js               NEW site name and address in one place
  js/render/art/*          painters rewritten
  dev/selftest.html        NEW in-browser checks for lore.js
docs/DATA_CONTRACTS.md     plus a legendarium section
docs/design/               concept page, art notes
```

Lore tables are Python so they can carry comments and be reviewed line by line. The builder is marked `RUN_LAST`, so it always rebuilds and needs no staleness tracking.

### 6.2 The legendarium contract

One eager file, target under 300 kB. Keys are always usaciv's real ids.

```
version, vintage, sources: []
basis:    {place, likeness, name, new, none: text}
ages:     [{id: "ta"|"sa"|"fa", name, sub, default}]
realms:   [{id, name, label[], gloss, people, culture, colors[2], device,
            states[fips], capital: cbsa, anchor{x,y,size,angle},
            totals{population, gdp, yields{}}, ranks{}, ages{}}]
lands:    {fips:  {name, realm, basis, why, ages{}}}
places:   {cbsa:  {name, basis, why, culture, status, ages{}}}
wonders:  {id:    {name, basis, why, motif, ages{}}}
sites:    [{id, name, real, basis, why, x, y, cell, motif, ages{}}]
rivers:   {realName: {name, basis, why}}
labels:   [{text, sub, kind, x, y, angle, size, ages{}}]
hosts:    {components{id: {name, icon}}, tiers{}, named{installationId: {name, basis, why}}}
vocab:    {yields{}, lens_groups{}, lenses{}, districts{}, badges{}, resources{},
           citizens{}, modes{}, advisors{}, ui{}}   each: id -> {name, plain}
moods:    [{id, name}]
mood:     string, one character per cell, index into moods
journeys: [{id, name, age, stops[{name, cbsa|site}], path[cells], km}]
```

- `ages{}` holds per-Age overrides of any field of its parent. Absent means the Third Age value applies. Sites and strongholds may also carry `status`: `standing`, `ruin`, `unbuilt`, `hidden`. Places never do (see 5.6).
- `culture` is one of: `gondor`, `arnor`, `rohan`, `dale`, `common`, `hobbit`, `haven`, `wood`, `dwarf`, `shadow`, `wizard`, `snow`. A place inherits its realm's culture unless it sets its own.
- `mood` is computed by the builder from realm, land cover, relief and a few named boxes (for example the salt flats). Moods: common, shire, mark, darkwood, goldwood, ash, stone, snow, saltmarsh, sun, downs, whitestone, wizard, haven, wild.
- Realm totals are sums over member states from `states.json`; medians are not summed, they are omitted.
- Site coordinates are given as latitude and longitude in the tables. The builder projects them with the shipped grid's constants (the ones `web/js/render/art/terrain.js` carries as `SHIPPED_PROJ`) and cross-checks them against known city positions in `cities.json`; it fails if the two disagree by more than 15 km.

### 6.3 Builder and checks

`legendarium.py` requires only files in `web/data` (world, states, cities, wonders, military, resources, lenses, districts, infrastructure, trade), so it runs with no downloads: `uv run python -m pipeline build legendarium`. A bare `build` or `all` must not be used without the raw downloads, because the other builders would try to rebuild.

Its `check()` follows usaciv's rules (a missing file is a NOTE) and fails on:

- a key that does not exist in the source data;
- a state in no realm or in two;
- an entry without a basis or a reason;
- a canonical name used twice without an allow-list entry;
- a vocabulary id that the source files do not contain, or one they contain that the vocabulary misses.

It reports coverage as PASS or NOTE lines (named places out of 524, wonders out of 52).

### 6.4 Browser

`lore.js` loads `legendarium.json` with the blocking files and exposes:

- `name(kind, id)`: the display name in the current tongue and Age. Falls back to the real name.
- `real(kind, id)`, `entry(kind, id)`, `realmOf(fips)`, `culture(cbsa)`, `moodAt(cell)`.
- `tongue`: `legend` or `real`. `age`: `ta`, `sa` or `fa`. A change event redraws labels and banners and clears the affected sprite caches.

Rules for the rest of the UI:

- `lore.js` swaps display names in place on the loaded data objects and keeps the real values under `.real`, so existing modules go on reading `.name`. Tooltips and panels show the other tongue as a second line, so nobody is lost.
- What the real tongue shows: usaciv's own names and words, everywhere. Every Tolkien-derived string (names, themed vocabulary, lore text) lives in `legendarium.json` as an override on a plain default held in code, so the real tongue, and the site without the file, read as usaciv does. Things with no real counterpart (realm crests, the Realms lens and panel, range and sea labels, Journeys, the Age chip) are hidden in the real tongue; legend sites show their real names. Art is not a name and stays.
- The top bar gets a Names switch and an Age chip. The address bar gains `names=real` and `age=sa|fa` (omitted when default), and `realm=<id>`.
- Clicking land selects the state, as today. The state panel's header shows the land name, the real state, and a realm crest that opens a realm panel (totals, member lands, chief cities).
- A new categorical Realms lens colours the map politically. In the terrain view, usaciv's state-colour band becomes the realm's colour and state lines become thinner.
- Search matches both tongues and shows both.
- The existing `capital` flag stays (Washington). Each realm also has a capital for its panel and a crest on its banner.
- Share images and the address printed on them come from `site.js`.
- usaciv's data files are not edited. Themed labels come from `vocab`, falling back to the label in the data file.
- A city belongs to the realm of its first-listed state (its principal city's state) unless its entry names a realm, and its banner takes that realm's colour. This settles the 50 metros that span states: Louisville's banner cell lies in Indiana and Cincinnati's in Kentucky.
- The Realms lens is built in the browser from `world.owner` and `realms`; it is not stored in `lenses.json`.
- The default tongue is `legend`. Tongue and Age live only in the address bar, like the rest of usaciv's view state.
- Browser support is the same as usaciv's: current evergreen browsers.

### 6.5 Rendering

The engine keeps its structure: static-layer cache, level of detail, sprite caches, banner placement, layer registry. What changes is what the painters draw.

- `theme.js` replaces the six copies of the font stack and holds canvas colours. Boot waits for `document.fonts.ready` before the first sprite is painted.
- `art/terrain.js`: palettes, textures and stamps are chosen by mood as well as by cover and relief. The real-geography rules (Colorado Plateau mesas, Great Basin ranges, Appalachian ridges, survey-grid fields) stay, because the land is still the United States.
- `art/city.js`: ten settlement styles by culture, each in the five existing size tiers and with the existing multi-hex spill for the largest metros.
- `art/sites.js`: strongholds by service; wonder and legend-site motifs; plaques.
- `art/improvements.js`: paved Great Roads, cart-roads, Dwarf-roads, havens, eyries, caravan markers.
- `art/people.js` and `cityView/figures.js`: folk figures by craft, with a silhouette set per culture.
- `icons.js`: the whole glyph set redrawn (about 110 ids). Ids stay the same so data files need no change.
- `banners.js`: a plate shape and metal per culture; placement and caching unchanged.
- Age states: `ruin` and `unbuilt` are overlays on the settlement sprite, not separate art sets.
- Parchment view: a second static-layer set (paper, ink coastline with waterlines, profile mountains, tree clumps, rubric names) selected like a lens. It reuses hexes, rivers and labels.

Untouched: `hex.js`, `camera.js`, `app/api.js`, `app/urlstate.js`, `render/map.js` structure, `sprites.js`, `lod.js`, water and road geometry, lens mechanics, the Advisors' chart, table and scatter cores, the trailer's MP4 writer.

### 6.6 Budgets and access

- `legendarium.json` under 300 kB. Fonts under 250 kB in total, subset to Latin.
- First draw no more than 10% slower than usaciv on the same machine; sprite-cache budgets unchanged.
- usaciv's ARIA labels, keyboard controls and phone layout are kept. The Names switch is a labelled toggle and announces the change. Rubric red is used only where it keeps at least 4.5:1 contrast; otherwise names are bone or gold on dark.

### 6.7 Testing and verification

- Python: the existing 176 tests keep passing; `test_legendarium.py` covers the builder, the projection fit and every check rule, on a small synthetic dataset like `test_check.py`.
- `uv run python -m pipeline check` stays the gate.
- Browser: usaciv has no JavaScript test runner. We add `web/dev/selftest.html`, a page that runs assertions on `lore.js` (lookups, fallbacks, Age overrides, address-bar round trips) and prints PASS or FAIL. The art gallery at `web/dev/art.html` gains every new mood, settlement style, stronghold, motif, banner and figure at four zoom levels.
- Each milestone is checked in a real browser at desktop and phone widths before it is called done.

### 6.8 Deployment

`web/` is the site. `uv run python -m pipeline package` still produces one zip. On Vercel: a static project with no build command and `web/` as the output directory, then the owner's domain. The site address lives in `site.js`, in `index.html`'s social tags, and in the trailer storyboard.

## 7. Art direction

All art is original and drawn in code. Reference idiom: the hand-drawn maps of the books (black ink for land, red for names, profile mountains, tree clumps, plenty of empty space) carried into a painted strategy map. Kept at a distance: any traced symbol or lettering from a specific published map, the film maps and film calligraphy, and the series' designs.

Palette

| Role | Value |
|---|---|
| Night (panels) | `#0e1512`, raised `#17221d` |
| Bone (text), dim | `#e8e2cf`, `#b3ab92` |
| Old gold (frames), bright | `#c8a252`, `#ecd08e` |
| Rubric red (names, selection) | `#b3331c`; on dark `#e2633f` |
| Mithril (figures, Elvish and Dwarvish accents) | `#c9d6dc` |
| Sea: deep, coast, lake | `#0b2030`, `#1c4c63`, `#2a6884` |
| Paper and inks (Parchment view) | `#f2e8cf`, `#e6d6ae`; ink `#1f1a17`, `#3b2a1e` |

Realm colours are in the draft file. Yield colours stay close to usaciv's so charts remain readable.

Lettering (all SIL Open Font Licence, self-hosted)

- Map names and headings: IM Fell English SC, letter-spaced, as on the book maps' roman capitals.
- Wordmark and Elvish range names only: Uncial Antiqua.
- Reading text: EB Garamond.
- Dense figures: the system sans, as in usaciv.
- Ornament: real Anglo-Saxon runes (Noto Sans Runic or BabelStone Runic) spelling our own English words, as the maps in The Hobbit do. No Tengwar or Cirth: the Estate claims copyright in those scripts.

Banners: one plate shape and metal per culture (Gondor: straight silver on black; Rohan: green swallow-tail; hobbit: round sign-board; haven: arched blue; Dwarf: angular copper; shadow: torn iron with red). The left cap keeps usaciv's population and growth mark. A crest marks realm capitals.

Settlement styles: hobbit (holes, round doors, a mill); Gondor (white stone tiers, a tower); Arnor (grey towers, some overgrown); Rohan (thatched halls behind a dike, a golden hall); haven (quays, slender towers, swan-prowed ships); wood (lamps and flets in great trees); Dwarf (a gate in a cliff, terraces, forge-glow); Dale (timber town, or on piles where on water); common (walled market town); shadow (a dark tower and forges; in the Fourth Age a ruin among new fields); wizard (a ring-wall and tower).

Folk figures are ordinary people in every culture, including `shadow`. No resident of a real place is ever drawn as an Orc or any other monster; monsters appear only as landscape (a dragon's desolation, a dark tower).

Motion is limited to what usaciv has (camera flights, the selection pulse) plus a slow fume over Orodruin and beacon-fires when their layer is on. Reduced-motion settings are respected.

The trailer keeps usaciv's maker with a new storyboard and a new original score. It quotes no film or series music.

## 8. Milestones

Each ends with a working site and the listed proof.

1. Foundation. usaciv imported with licence and credits; local server; 176 tests pass; `check` passes; the site runs unchanged.
2. Legendarium. Lore tables, builder, checks, `lore.js`, Names switch, both-tongue search, realm panel. Proof: every named place and wonder in the draft shows its name and reason; `names=real` reproduces usaciv's labels exactly.
3. Look. Fonts, palette, icons, top bar, banners by culture, Realms lens. Proof: no usaciv glyph or colour token remains in the chrome.
4. Land. Terrain moods, mountains, coasts and rivers repainted. Proof: gallery shows every mood by cover and relief at four zooms.
5. Places. Settlement styles, strongholds, wonder and legend-site motifs, folk figures. Proof: gallery; City View for one city of each culture.
6. Words. The Council, City View text, the Red Book with Correspondences and Credits. Proof, in the legend tongue: no visible string names a usaciv term from the left column of 5.5 except as the plain gloss; in the real tongue the same strings read as usaciv's.
7. Time and roads. Ages, Great Journeys, Parchment view. Proof: switching Age changes no number anywhere (asserted in the self-test).
8. Launch. Share images, social card, trailer, package, deploy to the owner's domain.

## 9. Risks

- Art volume. Five art modules and about 110 icons are rewritten. Mitigation: the milestone order makes the site recognisably this edition after step 2; art lands in slices behind the gallery.
- Lore accuracy. Mitigation: every entry carries its basis and reason; a Third Age gazetteer pass before step 2 closes; book and show canon kept apart.
- Offence. Mitigation: principles 2 and 3, plain copy for Mordor, Harondor and Forochel, and the Fourth Age view.
- Rights. See section 11.
- Font loading on canvas. Mitigation: `document.fonts.ready` gate and a system-serif fallback that keeps layout.

## 10. Questions for the owner

1. Layout: approve approach A, and name any matches to veto or swap.
2. Default Age: Third Age (recommended) or Fourth.
3. Going public: accept the fan-work rules in section 11 and the working name, or supply a name and domain.

## 11. Licences and rights

This section is background, not legal advice.

- Code: MIT. usaciv's copyright notice is kept beside ours.
- Data: mostly US federal public domain and Natural Earth. The Faith lenses derive from the 2020 U.S. Religion Census; the credit to ASARB and ARDA must stay. `sources.json` and the bibliography stay real and unchanged.
- Fonts: SIL OFL families only, with licence files shipped.
- Tolkien's world: the books, maps and scripts are under copyright (Tolkien Estate); many names are trademarks of Middle-earth Enterprises for goods and services; film designs belong to Warner Bros. and New Line, the series' designs to Amazon. The Estate's published position is stricter than its enforcement record: it objects even to non-commercial material that refers to his places. Enforcement has centred on selling things, reproducing the actual maps, marks in titles and domain names, and film assets.
- What this project does about it: stays free with no ads, sales or donations; uses only original art; uses no film or series assets, fonts or music; quotes nothing at length and never the Ring verse; keeps the author's name, the book titles and "Middle-earth" out of the domain, site title and logo; carries a plain disclaimer of affiliation naming the Estate, Middle-earth Enterprises, Warner Bros., New Line and Amazon; keeps every Tolkien-derived name in one file so the site can fall back to real names at once if asked.
- The real-names tongue is a complete, working site on its own.

## 12. Calls made in this design, and what is left to the builder

Calls made (mine, for the owner to overrule): fork in place; stay static with no build step; whole-state realms; fifteen realms as listed; real names for unmatched cities; no coined Elvish; runes instead of Tengwar; three Ages with the Third as default; the font system; Python lore tables; one eager data file; names swapped in place; the real tongue reads as usaciv does; cities never drawn as ruins; a city's realm is its first-listed state's; the working test for principle 3; Journey distances are straight-line.

Left to the builder: the exact wording of each reason; the growth of named places from 50 to about 100; mood rules per cell; the drawing of each painter within the art direction; the realm panel's layout; the Journeys' exact paths; per-Age overrides beyond the examples given.
