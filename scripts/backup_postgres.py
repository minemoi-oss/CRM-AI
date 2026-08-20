"""Create a compressed PostgreSQL backup without printing database secrets."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import shutil
import subprocess

from sqlalchemy import make_url

from app.database.session import DATABASE_URL


def main() -> None:
    configured_directory = os.getenv("BACKUP_DIRECTORY", "").strip()
    if not configured_directory:
        raise SystemExit("BACKUP_DIRECTORY doit pointer vers un stockage persistant sécurisé.")

    backup_directory = Path(configured_directory).expanduser().resolve()
    backup_directory.mkdir(parents=True, exist_ok=True)
    retention_days = max(1, int(os.getenv("BACKUP_RETENTION_DAYS", "14")))
    pg_dump = shutil.which(os.getenv("PG_DUMP_BINARY", "pg_dump"))
    if not pg_dump:
        raise SystemExit("pg_dump est introuvable sur cette machine.")

    database_url = make_url(DATABASE_URL)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    destination = backup_directory / f"mine_crm_{timestamp}.dump"
    temporary = backup_directory / f".{destination.name}.tmp"

    process_environment = os.environ.copy()
    if database_url.host:
        process_environment["PGHOST"] = database_url.host
    if database_url.port:
        process_environment["PGPORT"] = str(database_url.port)
    if database_url.username:
        process_environment["PGUSER"] = database_url.username
    if database_url.password:
        process_environment["PGPASSWORD"] = database_url.password
    if database_url.database:
        process_environment["PGDATABASE"] = database_url.database
    sslmode = database_url.query.get("sslmode")
    if sslmode:
        process_environment["PGSSLMODE"] = str(sslmode)

    try:
        subprocess.run(
            [
                pg_dump,
                "--format=custom",
                "--compress=6",
                "--no-owner",
                "--no-privileges",
                "--file",
                str(temporary),
            ],
            env=process_environment,
            check=True,
        )
        if not temporary.exists() or temporary.stat().st_size == 0:
            raise RuntimeError("pg_dump a produit un fichier vide.")
        temporary.replace(destination)
    finally:
        if temporary.exists():
            temporary.unlink()

    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    for candidate in backup_directory.glob("mine_crm_*.dump"):
        resolved_candidate = candidate.resolve()
        if resolved_candidate.parent != backup_directory:
            continue
        modified_at = datetime.fromtimestamp(candidate.stat().st_mtime, timezone.utc)
        if modified_at < cutoff:
            candidate.unlink()

    print(f"Backup PostgreSQL créé : {destination.name}")


if __name__ == "__main__":
    main()
