"""The lore tables: hand-written content for the legendarium (see docs/DATA_CONTRACTS.md, legendarium.json).

Everything here is a reading of the real map, keyed by usaciv's real ids. The rules:
  * every entry states its basis and a reason;
  * lands are matched to lands, never peoples to peoples;
  * a place whose listing is itself an Indigenous community or heritage site keeps its own name (basis "none");
  * landmarks on or beside Native nations' lands may take a landform name from the tales (a gorge, a range, a
    river's springs), never the name of a monster or of an enemy stronghold;
  * no coined Elvish, and no names invented by adaptations (FORBIDDEN).
"""

from .ages import AGES
from .labels import LABELS
from .lands import LANDS
from .places import PLACES
from .realms import REALMS
from .rivers import RIVERS
from .sites import SITES
from .vocab import VOCAB
from .wonders import WONDERS

BASIS = {
    "place": "chosen by geography: it sits where the tale needs it, or the real feature matches",
    "likeness": "chosen by form or character: it looks or behaves like the thing in the tale",
    "name": "the real name already echoes the tale",
    "new": "no counterpart in the tales; our own invention, always marked",
    "none": "kept as it is",
}

# Names that come from games, films or the television series, not from the books. They must never appear.
FORBIDDEN = {"Thorin's Halls", "Tirharad", "Hordern", "Ostirith", "Caras Gaer", "Dúrnost", "Southlands", "Nazgnagôl"}

TABLES = {
    "basis": BASIS,
    "ages": AGES,
    "realms": REALMS,
    "lands": LANDS,
    "places": PLACES,
    "wonders": WONDERS,
    "sites": SITES,
    "rivers": RIVERS,
    "labels": LABELS,
    "vocab": VOCAB,
    "forbidden": FORBIDDEN,
}
