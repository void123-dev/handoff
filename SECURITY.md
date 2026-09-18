# Security

HANDOFF is a public, unauthenticated read API. There are no user accounts and no secrets in the runtime path.

## Reporting a vulnerability

Please **do not** open a public issue for a security report.

Email the maintainer via the address on the [GitHub profile](https://github.com/void123-dev) and allow a reasonable time for a fix before disclosure.

## Scope

In scope:

- Injection against venue HTTP clients
- Cache poisoning of `/api/*` responses
- Accidental inclusion of credentials in the client bundle

Out of scope:

- Trading losses from following the card (it is a filter, not an order)
- Third-party venue outages (Binance / OKX / Bybit)
- Demo-feed fallback when a pit is unreachable (intentional)

## Notes

- Do not send `Authorization` or cookies to this API.
- `source: "demo"` rows must not be voted as live history.
