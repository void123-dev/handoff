# HANDOFF-1.1 API

Auxiliary session-junction card. Filter, not an order. Memory is session geometry only.

## Desk wiring

```text
HANDOFF_API_BASE=<this origin>
GET $HANDOFF_API_BASE/api/desk?symbol=BTC&lookback=180
GET $HANDOFF_API_BASE/api/export?symbol=BTC&lookback=180&format=json
GET $HANDOFF_API_BASE/api/venues
```

An empty `HANDOFF_API_BASE` on a downstream desk should still render the page. This host does not require auth.

## Endpoints

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/handoff` | Raw snapshot |
| GET | `/api/desk` | Compact card for a downstream desk |
| GET | `/api/memory` | Current bucket rows + frequencies |
| GET | `/api/export` | Envelope + snapshot (`format=json\|csv\|schema`) |
| GET | `/api/venues` | Pits, live first |
| OPTIONS | any of the above | 204 |

CORS `*` on GET. No cookies. No Authorization. Invalid query values fall back to defaults (no 400). Poll 15s. Server cache 12s.

## Query

| Param | Allowed | Default |
| --- | --- | --- |
| `symbol` | BTC ETH SOL XRP DOGE BNB | BTC |
| `venue` | binance bybit okx | first **live** pit (`/api/venues`.default) |
| `lookback` | 90 180 360 | 180 |
| `format` | json csv schema | json |

## `source`

- `"live"` = real bars
- `"demo"` = synthetic history
- never a venue id

Demo rows keep `source: "demo"` so a downstream desk does not vote them.

## Desk card (`/api/desk`)

Flattened numbers at the root (also duplicated on `/api/export` `snapshot` and `card`):

```text
lean, awaiting, junction,
pContinue, pInside, pBrokeHigh, pBrokeLow,
n, thin, stuck, headline,
source, venue, symbol
```

`pContinue` / `pInside` / `pBrokeHigh` / `pBrokeLow` are JSON numbers, never nested-only.

## Venues

Sort: live first, then `volumeUsd` desc, then `id`.

`default.venue` = first live pit even if a demo pit has larger volume.

## Envelope (`/api/export?format=json`)

```text
api: "handoff-export"
version: "1.1"
model: "HANDOFF-1.1"
readme.lean: "continue | break | unclear. Filter at the junction, not an order."
snapshot / card: { … }
```

Schema: `GET /api/export?format=schema`

## Copy

English: Session junction. Do not pick a side from this layer while awaiting / unclear / thin / stuck or n < 40.

Russian: Стык сессий. Сторону из этого слоя не выбирать, пока awaiting / unclear / thin / stuck или n < 40.
