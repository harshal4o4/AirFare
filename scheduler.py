"""
scheduler.py
────────────
APScheduler automation for National Airfare Price Index scraper (SIH26056).

Schedules nightly scraping at 00:00 UTC and logs run metrics to scraper_logs.log.
"""

from __future__ import annotations

import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from scraper_engine import run_scraper

# Log file path
LOG_FILE = Path(__file__).parent / "scraper_logs.log"

# Setup logger for scraper_logs.log
logger = logging.getLogger("scraper_scheduler")
logger.setLevel(logging.INFO)

if not logger.handlers:
    file_handler = logging.FileHandler(LOG_FILE, mode="a", encoding="utf-8")
    formatter = logging.Formatter(
        "[%(asctime)s UTC] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ"
    )
    formatter.converter = time.gmtime  # Use UTC for logging timestamps
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)


def scheduled_scrape_job() -> dict:
    """Executes the daily scraper run and logs results to scraper_logs.log."""
    start_time = datetime.now(timezone.utc)
    logger.info("Starting scheduled 00:00 UTC airfare scraping job...")

    try:
        result = run_scraper()
        success = result.get("success", False)
        inserted = result.get("inserted", 0)
        total_scraped = result.get("total_records", 0)
        skipped = result.get("skipped", 0)
        elapsed = result.get("elapsed_s", 0.0)

        if success:
            logger.info(
                f"Scrape completed successfully | Records Scraped: {total_scraped} | "
                f"Records Ingested: {inserted} | Skipped/Dupes: {skipped} | Duration: {elapsed:.2f}s"
            )
        else:
            err = result.get("error", "Unknown error")
            logger.error(
                f"Scrape completed with warnings/errors | Records Scraped: {total_scraped} | "
                f"Records Ingested: {inserted} | Error: {err} | Duration: {elapsed:.2f}s"
            )
        return result

    except Exception as exc:
        logger.error(f"Scheduled scraping job failed with exception: {exc}", exc_info=True)
        return {
            "success": False,
            "error": str(exc),
            "inserted": 0,
            "timestamp": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }


_scheduler: Optional[BackgroundScheduler] = None


def get_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(timezone="UTC")
        _scheduler.add_job(
            scheduled_scrape_job,
            trigger=CronTrigger(hour=0, minute=0, timezone="UTC"),
            id="nightly_scrape_job",
            name="Nightly 00:00 UTC Airfare Scraper",
            replace_existing=True,
        )
    return _scheduler


def start_scheduler() -> None:
    sched = get_scheduler()
    if not sched.running:
        sched.start()
        logger.info("BackgroundScheduler started successfully (Cron: 00:00 UTC daily).")


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("BackgroundScheduler stopped.")
        _scheduler = None


if __name__ == "__main__":
    start_scheduler()
    logger.info("Scheduler process running. Press Ctrl+C to exit.")
    try:
        while True:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        stop_scheduler()
