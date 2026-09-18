# Contributing

Thanks for taking a look at HANDOFF. The project is aimed at an international audience — please keep issues, pull requests, and code comments in **English**.

## Ground rules

- This layer is a **filter**, not an order. Do not add buy/sell language, path forecasts inside NY, or blend Gravity / ANVIL / COIL into `pContinue`.
- `source` is only `"live"` or `"demo"`. Never a venue id.
- Live pits rank ahead of higher-volume demo pits. Default venue is the first live pit.
- Memory overlay may only veto a lean to `unclear`. It never upgrades a lean.
- `n < 40` is thin. Do not emit a side from a thin bucket.

## Setup

```bash
npm install
npm test
npm run typecheck
npm run dev
```

## Pull requests

1. Open an issue first for behavior changes to the lean rule, memory key, or desk API.
2. Add or update tests under `src/handoff/*.test.ts` and `src/lib/venues/rank.test.ts`.
3. Keep the public desk card shape stable (`/api/desk` flattened fields).
4. Write commit messages in English, present tense: `Rank live pits ahead of demo Binance`.

## Code style

TypeScript, existing file layout, no extra abstraction for one-off logic. Comments in English only.
