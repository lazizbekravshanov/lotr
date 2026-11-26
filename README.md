# The Reunited States

The real United States, drawn as Middle-earth. This is a Tolkien edition of Andrej Karpathy's
[usaciv](https://karpathy.ai/usaciv): the same land, the same public data and the same hex map, with new names,
and a stated reason for every match. One switch shows the real names again.

"The Reunited States" is a working name. Nothing here is a game; it is a visualizer.

## Quick start

You need [uv](https://docs.astral.sh/uv/). Nothing else needs installing.

```bash
uv run python -m pipeline serve        # http://127.0.0.1:8765
```

The built data in `web/data/` is included. `web/` is a self-contained static site.

```bash
uv run python -m unittest discover -s tests     # the tests
uv run python -m pipeline check                 # validate web/data
uv run python -m pipeline build legendarium     # rebuild the Middle-earth layer from pipeline/lore/
node web/dev/selftest.mjs                       # browser-module self-test (optional; also at /dev/selftest.html)
```

## How it works

Everything usaciv does is kept: 31 public data sources (Census, BEA, BLS, EIA, NOAA, USGS, DoD, NPS, FAA, FEMA,
CDC and others) reconciled onto one 25 km hex grid, with yields, lenses, a City View, Advisors and an Almanac.
See [docs/usaciv-README.md](docs/usaciv-README.md) for the original description and
[docs/DATA_CONTRACTS.md](docs/DATA_CONTRACTS.md) for the data shapes.

This edition adds one layer on top, the legendarium:

- `pipeline/lore/` holds hand-written tables: which states make up each realm, what each land, city, river and
  wonder is called, and why.
- `pipeline/build/legendarium.py` checks those tables against the real data and writes `web/data/legendarium.json`.
- `web/js/lore.js` shows those names in the browser. Real numbers are never changed, and the upstream data files
  are never edited: `tests/test_upstream_data.py` fails if one is.

In the app, the **Names** button in the top bar switches between Middle-earth names and real names; `#names=real`
in the address does the same. Click a city, a state or a wonder to see the reason for its name. Click a state's realm
chip, or search for a realm, to see the realm as a whole.

The design is in [docs/superpowers/specs/2026-11-25-reunited-states-design.md](docs/superpowers/specs/2026-11-25-reunited-states-design.md).

## Rules of the map

- The real numbers never change. Only names, art and stories do.
- Lands are matched to lands, never peoples to peoples.
- A place that is itself an Indigenous community or heritage site keeps its own name.
- Every match states its basis: by place, by likeness, by name, or new-made.
- Cities without a strong match keep their real names.

## Credits and terms

- Built on **usaciv** by Andrej Karpathy (MIT licence). His copyright notice is kept in [LICENSE](LICENSE).
- The code is MIT-licensed. That licence covers the code only, not the data.
- Most of the data comes from U.S. federal agencies and is in the public domain. Natural Earth is public domain.
  The faith lenses are derived from the 2020 U.S. Religion Census (© 2022 ASARB), used under the ARDA terms, which
  ask for credit to the Association of Statisticians of American Religious Bodies and the Association of Religion
  Data Archives. Please keep that credit if you reuse them. The in-app sources list gives every file, URL and checksum.
- This is an unofficial, non-commercial fan project. It is not affiliated with or endorsed by the Tolkien Estate,
  Middle-earth Enterprises, Warner Bros., New Line Cinema or Amazon. All artwork is original and drawn in code;
  nothing is taken from the films, the series or the published maps.
