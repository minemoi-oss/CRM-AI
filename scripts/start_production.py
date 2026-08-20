"""Start Mine CRM AI with the production-safe single-worker profile."""

from __future__ import annotations

import os

import uvicorn


def trusted_proxy_ips() -> str:
    value = os.getenv("UVICORN_FORWARDED_ALLOW_IPS", "127.0.0.1").strip()
    entries = [entry.strip() for entry in value.split(",") if entry.strip()]
    if not entries or "*" in entries:
        raise SystemExit(
            "UVICORN_FORWARDED_ALLOW_IPS doit lister explicitement les proxys approuvés."
        )
    return ",".join(entries)


def main() -> None:
    if os.getenv("APP_ENV", "").strip().casefold() != "production":
        raise SystemExit("APP_ENV=production est requis pour le démarrage de production.")

    port = int(os.getenv("PORT", "8000"))
    forwarded_allow_ips = trusted_proxy_ips()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        workers=1,
        proxy_headers=True,
        forwarded_allow_ips=forwarded_allow_ips,
        server_header=False,
        timeout_keep_alive=5,
        log_level=os.getenv("LOG_LEVEL", "info").casefold(),
    )


if __name__ == "__main__":
    main()
