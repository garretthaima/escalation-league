#!/usr/bin/env python3
"""Simple MySQL backup helper for dev/prod databases."""
from __future__ import annotations

import argparse
import datetime as dt
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ENV_FILES = {
    "dev": REPO_ROOT / ".env.dev",
    "prod": REPO_ROOT / ".env.prod",
}
BACKUP_DIR = REPO_ROOT / "backups"
REQUIRED_KEYS = ["DB_HOST", "DB_PORT", "DB_USER", "DB_ROOT_PASSWORD", "DB_NAME"]


def parse_env_file(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' not in line:
            continue
        key, value = line.split('=', 1)
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data


def resolve_connection(config: dict[str, str]) -> tuple[str, str, str, str, str]:
    missing = [key for key in REQUIRED_KEYS if key not in config]
    if missing:
        raise KeyError(f"Missing keys: {', '.join(missing)}")

    host = config.get('DB_HOST_EXTERNAL', config['DB_HOST'])
    port = str(config.get('DB_PORT_EXTERNAL', config['DB_PORT']))
    user = "root"
    password = config['DB_ROOT_PASSWORD']
    database = config['DB_NAME']
    return host, port, user, password, database


def run_backup(env: str, host_override: str | None, port_override: str | None) -> Path:
    env_path = ENV_FILES[env]
    if not env_path.exists():
        raise FileNotFoundError(f"Env file not found: {env_path}")

    config = parse_env_file(env_path)
    host, port, user, password, database = resolve_connection(config)

    if host_override:
        host = host_override
    if port_override:
        port = str(port_override)

    BACKUP_DIR.mkdir(exist_ok=True)
    timestamp = dt.datetime.now().strftime('%Y%m%d-%H%M%S')
    output_path = BACKUP_DIR / f"{env}-{timestamp}.sql"

    cmd = [
        "mysqldump",
        "-h", host,
        "-P", port,
        "-u", user,
        f"-p{password}",
        database,
    ]

    print(f"Backing up {env} database @ {host}:{port} → {output_path}")
    with output_path.open('wb') as fh:
        subprocess.run(cmd, check=True, stdout=fh)

    return output_path


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Backup dev/prod MySQL databases using mysqldump")
    parser.add_argument(
        "--env",
        dest="envs",
        choices=ENV_FILES.keys(),
        action="append",
        help="Environment(s) to back up (default: both)",
    )
    parser.add_argument(
        "--host",
        dest="host_override",
        help="Override DB host for all selected environments",
    )
    parser.add_argument(
        "--port",
        dest="port_override",
        help="Override DB port for all selected environments",
    )
    args = parser.parse_args(argv)

    envs = args.envs or list(ENV_FILES.keys())

    try:
        for env in envs:
            run_backup(env, args.host_override, args.port_override)
    except (subprocess.CalledProcessError, FileNotFoundError, KeyError) as exc:
        print(f"Backup failed: {exc}", file=sys.stderr)
        return 1

    print("All requested backups completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
