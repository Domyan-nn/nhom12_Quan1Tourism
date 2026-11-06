"""Rehearse init/seed/restore and NFR08 over real loopback HTTP on a disposable DB.

Run with the project venv from any working directory. Never reads SAIGON_DATABASE.
JSON output contains timings and counts, never passwords or authentication tokens.
"""

import json
import os
import platform
import secrets
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
from scripts.backup_db import backup_database
from scripts.seed_db import seed


def snapshot(database):
    with closing(sqlite3.connect(database.as_uri() + "?mode=ro", uri=True)) as db:
        return {
            "version": db.execute("PRAGMA user_version").fetchone()[0],
            "rows": {
                table: db.execute(f'SELECT * FROM "{table}" ORDER BY 1').fetchall()
                for table in ("admin_accounts", "admin_sessions", "categories", "pois", "poi_narrations", "anonymous_sessions", "visit_events")
            },
        }


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    report = {
        "tested_at_utc": datetime.now(timezone.utc).isoformat(),
        "base_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "working_tree": "includes uncommitted handoff changes; see integration-2026-11-06.md",
        "os": platform.platform(), "python": platform.python_version(), "sqlite": sqlite3.sqlite_version,
        "server": "FastAPI main + Uvicorn, loopback HTTP, 1 worker; no external map/TTS requests",
    }
    # A fresh random password exists only in memory and is never printed.
    password = secrets.token_urlsafe(24)
    with tempfile.TemporaryDirectory(prefix="saigon-handoff-") as directory:
        database = Path(directory) / "source.db"
        backup = Path(directory) / "backup.db"
        restored = Path(directory) / "restored.db"
        subprocess.run([sys.executable, str(ROOT / "backend/scripts/init_db.py"), "--database", str(database)], check=True, capture_output=True)
        seed(database, "handoff-test", password)
        seeded = snapshot(database)
        backup_database(database, backup)
        backup_database(backup, restored)
        if seeded != snapshot(restored) or seeded != snapshot(database):
            raise RuntimeError("Snapshot/restore differs from source")
        report["init_seed_restore"] = {
            "result": "passed", "schema_version": seeded["version"],
            "seed_counts": {table: len(rows) for table, rows in seeded["rows"].items()},
            "seed_status": "all 5 draft; placeholder text and NULL images; content unreviewed",
            "restored": "all seven tables and user_version equal; both snapshots passed integrity/foreign-key checks",
        }
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        base = f"http://127.0.0.1:{port}/api/v1"
        # Ignore system proxies for this loopback-only experiment.
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

        def request(path, body=None, token=None):
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            data = None if body is None else json.dumps(body).encode("utf-8")
            req = urllib.request.Request(base + path, data=data, headers=headers)
            with opener.open(req, timeout=10) as response:
                payload = response.read()
                return response.status, json.loads(payload) if payload else None

        env = os.environ.copy()
        env["SAIGON_DATABASE"] = str(restored)
        env.pop("SAIGON_DISABLE_CLEANUP", None)
        with (Path(directory) / "server.log").open("w", encoding="utf-8") as log:
            server = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "app.main:app", "--app-dir", str(ROOT / "backend"),
                 "--host", "127.0.0.1", "--port", str(port), "--no-access-log"],
                cwd=ROOT, env=env, stdout=log, stderr=log,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
            try:
                deadline = time.monotonic() + 20
                while True:
                    try:
                        if request("/health")[0] == 200:
                            break
                    except (OSError, urllib.error.URLError):
                        if server.poll() is not None or time.monotonic() >= deadline:
                            raise RuntimeError("Disposable API did not become ready")
                        time.sleep(0.1)
                status, login = request("/admin/login", {"username": "handoff-test", "password": password})
                token = login["access_token"]
                if status != 200 or request("/pois")[1]["items"]:
                    raise RuntimeError("Restored seed login/public draft isolation failed")
                category = request("/categories")[1]["items"][0]["id"]
                # These five synthetic POIs are test-only. Never publish the seed placeholders.
                for number in range(5):
                    status, poi = request("/admin/pois", {
                        "category_id": category, "name": f"[TEST ONLY] POI {number + 1}",
                        "address": "Synthetic acceptance fixture", "latitude": 10.77 + number * 0.001,
                        "longitude": 106.69, "radius_m": 100,
                    }, token)
                    if status != 201 or poi["status"] != "draft":
                        raise RuntimeError("Create draft failed")
                    request(f'/admin/pois/{poi["id"]}/narrations', {"locale": "vi", "title": "Test only", "body": "Synthetic fixture, not tourism content."}, token)
                    status, published = request(f'/admin/pois/{poi["id"]}/publish', {}, token)
                    if status != 200 or published["status"] != "published":
                        raise RuntimeError("Publish fixture failed")
                samples = []
                for number in range(20):
                    started = time.perf_counter()
                    try:
                        status, payload = request("/pois")
                        valid = status == 200 and len(payload["items"]) == 5
                        error = None
                    except (OSError, urllib.error.URLError, ValueError) as exc:
                        status, valid, error = getattr(exc, "code", None), False, type(exc).__name__
                    elapsed = time.perf_counter() - started
                    samples.append({"request": number + 1, "status": status, "elapsed_ms": round(elapsed * 1000, 3),
                                    "valid_response": valid, "under_3s_success": valid and elapsed < 3, "error": error})
                successful = sum(row["under_3s_success"] for row in samples)
                report["nfr08"] = {
                    "path": "/api/v1/pois", "requests": "20 sequential; no concurrency or retry",
                    "data": "2 categories, 10 POIs: 5 seed draft + 5 synthetic published; 11 narrations; list returns 5",
                    "samples": samples, "successful_under_3s": successful,
                    "result": "passed in this local test" if successful >= 19 else "failed",
                    "limit": "Does not establish concurrent load, LAN/device, production, or map/TTS performance",
                }
                request("/admin/logout", {}, token)
                if successful < 19:
                    raise RuntimeError("NFR08 acceptance threshold not met")
            finally:
                server.terminate()
                try:
                    server.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.wait(timeout=5)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
