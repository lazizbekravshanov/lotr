# Design concept page

A sketch for reviewing the design in `docs/superpowers/specs/2026-11-25-reunited-states-design.md`. It is not product code.

- `index.html`: the page, with its drawing script inline. It draws usaciv's real hex world coloured by the draft realm layout.
- `legendarium-draft.json`: the draft layout (realms, lands, places, wonders, legend sites, rivers, labels). This was the seed for the product's lore tables. It is kept as the design-time record and is not updated: the tables in `pipeline/lore/` are the source of truth, and some names and reasons there have since been corrected.
- `hexes.json`: a compact copy of usaciv's hex world, made by `make_hexes.py` from a usaciv checkout.

To view it locally, serve this folder and open it in a browser:

```bash
python3 -m http.server 8777 --directory docs/design/concept
```
