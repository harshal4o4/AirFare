"""
logger.py
─────────
Structured audit logger for the National Airfare Price Index (SIH26056).

Writes machine-readable JSON-Lines to  audit.log  and human-readable
colour output to stdout simultaneously.

Audit events captured
─────────────────────
  • API requests     — method, endpoint, status_code, duration_ms, client_ip
  • API errors       — 4xx / 5xx with detail message
  • DB inserts       — table, rows_inserted, duration_s, source_type
  • Scraper runs     — route, window, provenance_flag, record_count, elapsed_s
  • System startup   — service, version, db_record_count
  • NSO exports      — frequency, format, record_count, requester_ip

Usage
─────
  from logger import audit                  # use the module-level singleton

  audit.api_request("GET", "/api/v1/index/timeseries", 200, 142.3, "127.0.0.1")
  audit.db_insert("flight_records", 300, 1.42, "Synthetic_Backup")
  audit.scraper_run("Delhi", "Mumbai", 7, "Synthetic_Backup", 10, 48.1)
  audit.nso_export("weekly", "csv", 8, "10.0.0.5")
  audit.error("GET", "/api/v1/nso/export", 403, "Invalid API key")
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

LOG_FILE = Path(os.environ.get("AUDIT_LOG_PATH", "audit.log"))
SERVICE_NAME    = "NAPI"           # National Airfare Price Index
SERVICE_VERSION = "1.0.0-SIH26056"

# ANSI colours for stdout
_C = {
    "reset":   "\033[0m",
    "bold":    "\033[1m",
    "green":   "\033[32m",
    "yellow":  "\033[33m",
    "red":     "\033[31m",
    "cyan":    "\033[36m",
    "blue":    "\033[34m",
    "magenta": "\033[35m",
    "dim":     "\033[90m",
}


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _level_colour(level: str) -> str:
    return {
        "INFO":    _C["cyan"],
        "WARN":    _C["yellow"],
        "ERROR":   _C["red"],
        "OK":      _C["green"],
        "SCRAPER": _C["magenta"],
        "DB":      _C["blue"],
        "EXPORT":  _C["green"] + _C["bold"],
        "STARTUP": _C["cyan"] + _C["bold"],
    }.get(level, _C["reset"])


# ─────────────────────────────────────────────────────────────────────────────
# AuditLogger class
# ─────────────────────────────────────────────────────────────────────────────

class AuditLogger:
    """
    Thread-safe, dual-output (file + stdout) structured audit logger.
    Every event is written as a single JSON-Lines record to audit.log.
    """

    def __init__(self, log_file: Path = LOG_FILE) -> None:
        self._lock    = Lock()
        self._log_file = log_file
        self._counters: dict[str, int] = {
            "api_requests": 0,
            "api_errors":   0,
            "db_inserts":   0,
            "scraper_runs": 0,
            "nso_exports":  0,
        }

        # Python stdlib logger for file handler
        self._logger = logging.getLogger("napi_audit")
        self._logger.setLevel(logging.DEBUG)
        self._logger.propagate = False

        if not self._logger.handlers:
            fh = logging.FileHandler(str(log_file), encoding="utf-8")
            fh.setLevel(logging.DEBUG)
            fh.setFormatter(logging.Formatter("%(message)s"))   # raw JSON lines
            self._logger.addHandler(fh)

    # ── Core write ────────────────────────────────────────────────────────

    def _write(self, level: str, event_type: str, payload: dict) -> None:
        record: dict = {
            "ts":      _now_utc(),
            "service": SERVICE_NAME,
            "version": SERVICE_VERSION,
            "level":   level,
            "event":   event_type,
            **payload,
        }
        line = json.dumps(record, ensure_ascii=False, default=str)
        with self._lock:
            self._logger.info(line)

        # Human-readable stdout
        col   = _level_colour(level)
        reset = _C["reset"]
        dim   = _C["dim"]
        ts    = record["ts"]

        # Pick the most informative summary field
        summary_parts = []
        for key in ("endpoint", "route", "table", "frequency", "message"):
            if key in payload:
                summary_parts.append(f"{key}={payload[key]!r}")
        for key in ("status_code", "rows", "records", "record_count"):
            if key in payload:
                summary_parts.append(f"{key}={payload[key]}")
        for key in ("duration_ms", "duration_s", "elapsed_s"):
            if key in payload and payload[key] is not None:
                summary_parts.append(f"{key}={payload[key]}")

        summary = "  ".join(summary_parts[:4])
        print(f"{dim}[{ts}]{reset} {col}[{level:7s}]{reset} {event_type:<22} {summary}", flush=True)

    # ── Public API ────────────────────────────────────────────────────────

    def startup(self, db_record_count: int) -> None:
        """Log service startup with current DB state."""
        self._write("STARTUP", "service.startup", {
            "service_name":    SERVICE_NAME,
            "version":         SERVICE_VERSION,
            "db_record_count": db_record_count,
            "log_file":        str(self._log_file.resolve()),
        })

    def api_request(
        self,
        method:      str,
        endpoint:    str,
        status_code: int,
        duration_ms: float,
        client_ip:   str = "unknown",
    ) -> None:
        """Log every API request (called from FastAPI middleware)."""
        with self._lock:
            self._counters["api_requests"] += 1
            if status_code >= 400:
                self._counters["api_errors"] += 1

        level = "ERROR" if status_code >= 500 else "WARN" if status_code >= 400 else "INFO"
        self._write(level, "api.request", {
            "method":      method,
            "endpoint":    endpoint,
            "status_code": status_code,
            "duration_ms": round(duration_ms, 2),
            "client_ip":   client_ip,
            "req_total":   self._counters["api_requests"],
            "err_total":   self._counters["api_errors"],
            "error_rate":  round(
                self._counters["api_errors"] / max(self._counters["api_requests"], 1) * 100, 2
            ),
        })

    def error(
        self,
        method:      str,
        endpoint:    str,
        status_code: int,
        detail:      str,
        client_ip:   str = "unknown",
    ) -> None:
        """Log an explicit API error (4xx / 5xx)."""
        with self._lock:
            self._counters["api_errors"] += 1
        self._write("ERROR", "api.error", {
            "method":      method,
            "endpoint":    endpoint,
            "status_code": status_code,
            "detail":      detail,
            "client_ip":   client_ip,
        })

    def db_insert(
        self,
        table:       str,
        rows:        int,
        duration_s:  float,
        source_type: str = "Cleaned_CSV",
    ) -> None:
        """Log a database bulk insert operation."""
        with self._lock:
            self._counters["db_inserts"] += rows
        self._write("DB", "db.insert", {
            "table":       table,
            "rows":        rows,
            "duration_s":  round(duration_s, 3),
            "source_type": source_type,
            "rows_per_s":  round(rows / max(duration_s, 0.001)),
            "total_inserted_session": self._counters["db_inserts"],
        })

    def scraper_run(
        self,
        source:      str,
        destination: str,
        days_ahead:  int,
        provenance:  str,
        record_count: int,
        elapsed_s:   float,
    ) -> None:
        """Log a single scraper route-window run."""
        with self._lock:
            self._counters["scraper_runs"] += 1
        self._write("SCRAPER", "scraper.route_run", {
            "route":        f"{source}→{destination}",
            "window_days":  days_ahead,
            "provenance":   provenance,
            "records":      record_count,
            "elapsed_s":    round(elapsed_s, 2),
            "run_sequence": self._counters["scraper_runs"],
        })

    def scraper_session(
        self,
        routes_attempted:  int,
        live_routes:       int,
        synthetic_routes:  int,
        total_records:     int,
        inserted:          int,
        elapsed_s:         float,
    ) -> None:
        """Log a complete scraper session summary."""
        self._write("SCRAPER", "scraper.session_end", {
            "routes_attempted": routes_attempted,
            "live_routes":      live_routes,
            "synthetic_routes": synthetic_routes,
            "total_records":    total_records,
            "inserted":         inserted,
            "elapsed_s":        round(elapsed_s, 2),
            "live_pct":         round(live_routes / max(routes_attempted, 1) * 100, 1),
        })

    def nso_export(
        self,
        frequency:    str,
        fmt:          str,
        record_count: int,
        client_ip:    str = "unknown",
    ) -> None:
        """Log a successful NSO/MoSPI export call."""
        with self._lock:
            self._counters["nso_exports"] += 1
        self._write("EXPORT", "nso.export", {
            "frequency":    frequency,
            "format":       fmt,
            "record_count": record_count,
            "client_ip":    client_ip,
            "export_total": self._counters["nso_exports"],
        })

    # ── Statistics ────────────────────────────────────────────────────────

    def stats(self) -> dict:
        """Return current session counters (for /health endpoint)."""
        with self._lock:
            c = dict(self._counters)
        c["error_rate_pct"] = round(
            c["api_errors"] / max(c["api_requests"], 1) * 100, 2
        )
        return c

    def snapshot(self) -> dict:
        """Return a full audit snapshot — used by the project metrics exporter."""
        return {
            "generated_at": _now_utc(),
            "service":      SERVICE_NAME,
            "version":      SERVICE_VERSION,
            "log_file":     str(self._log_file.resolve()),
            "session_counters": self.stats(),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Module-level singleton — import this everywhere
# ─────────────────────────────────────────────────────────────────────────────

audit = AuditLogger()
