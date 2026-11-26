# Design concept page

A sketch for reviewing the design in `docs/superpowers/specs/2026-11-25-reunited-states-design.md`. It is not product code.

- `index.html`: the page, with its drawing script inline. It draws usaciv's real hex world coloured by the draft realm layout.
- `legendarium-draft.json`: the draft layout (realms, lands, places, wonders, legend sites, rivers, labels). This is the seed for the product's lore tables.
- `hexes.json`: a compact copy of usaciv's hex world, made by `make_hexes.py` from a usaciv checkout.

To view it locally, serve this folder and open it in a browser:

```bash
python3 -m http.server 8777 --directory docs/design/concept
```
