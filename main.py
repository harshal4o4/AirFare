"""
main.py
───────
FastAPI application — Real-time Airfare Price Index API  (v1)

Endpoints
─────────
  GET /                              Health ping
  GET /health                        DB health + record count

  GET /api/v1/filters                Dropdown metadata for UI
  GET /api/v1/index/timeseries       Global price index (baseline-100)
  GET /api/v1/index/leadtime         Booking-window pricing curve
  GET /api/v1/index/apix             DGCA traffic-weighted APIx          [Phase 5]
  GET /api/v1/routes/trends          Daily price trend for a route
  GET /api/v1/airlines/comparison    Per-airline market share & fares
  GET /api/v1/fares/decomposition    Base-fare vs. tax breakdown          [Phase 5]
  GET /api/v1/flights/search         Paginated raw flight search
  GET /api/v1/nso/export             Structured NSO/MoSPI export (JSON/CSV) [Phase 5]

Run:
  uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import csv
import io
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import engine, get_db
from index_engine import (
    compute_airline_comparison,
    compute_dgca_weighted_index,
    compute_fare_decomposition,
    compute_filter_metadata,
    compute_index_timeseries,
    compute_leadtime_curve,
    compute_route_trends,
    build_nso_export_payload,
    compute_price_distribution,
    compute_data_quality_metrics,
    compute_geographic_hierarchy,
    compute_route_summary_cards,
)
from models import FlightRecord
from logger import audit

# ─────────────────────────────────────────────────────────────────────────────
# Security — API key for protected NSO & Admin endpoints
# Set env var NSO_API_KEY before running; defaults to dev key for local use.
# ─────────────────────────────────────────────────────────────────────────────
_NSO_API_KEY = os.environ.get("NSO_API_KEY", "nso-dev-key-2024")

def _require_api_key(x_api_key: str = Header(default="", alias="X-API-Key")) -> None:
    """FastAPI dependency — rejects requests without a valid X-API-Key header."""
    if x_api_key != _NSO_API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing X-API-Key. Contact NSO Data Infrastructure team.",
        )

# ─────────────────────────────────────────────────────────────────────────────
# App bootstrap
# ─────────────────────────────────────────────────────────────────────────────

import time as _time
from contextlib import asynccontextmanager
from fastapi import Request

@asynccontextmanager
async def _lifespan(application):
    """Log service startup with live DB record count and start background scraper scheduler."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            count = conn.execute(text("SELECT COUNT(*) FROM flight_records")).scalar()
    except Exception:
        count = -1
    audit.startup(count)

    # Start APScheduler for nightly scraper
    try:
        from scheduler import start_scheduler, stop_scheduler
        start_scheduler()
    except Exception as exc:
        print(f"Failed to start scraper scheduler: {exc}")

    yield   # application runs here

    try:
        from scheduler import stop_scheduler
        stop_scheduler()
    except Exception:
        pass

app = FastAPI(
    title="✈️ Real-time Airfare Price Index API",
    description=(
        "Computes baseline-relative airfare price indices, route trend analysis, "
        "airline market comparison, and booking-window pricing curves from live "
        "PostgreSQL data."
    ),
    version="1.0.0-SIH26056",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=_lifespan,
)

# CORS — allow both Vite (5173) and CRA / Next.js (3000) dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Audit middleware — times every request, logs to audit.log
# ─────────────────────────────────────────────────────────────────────────────

@app.middleware("http")
async def _audit_middleware(request: Request, call_next):
    t0  = _time.perf_counter()
    response = await call_next(request)
    ms  = round((_time.perf_counter() - t0) * 1000, 2)
    ip  = request.client.host if request.client else "unknown"
    # Skip noisy Swagger/OpenAPI calls from the audit log
    if not request.url.path.startswith(("/docs", "/redoc", "/openapi")):
        audit.api_request(request.method, request.url.path, response.status_code, ms, ip)
    return response


# ─────────────────────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"], summary="Root ping")
def root():
    return {"status": "ok", "service": "Airfare Price Index API", "version": "1.0.0"}


@app.get("/health", tags=["Health"], summary="Database health check")
def health(db: Session = Depends(get_db)):
    """Returns service health and the total number of flight records in DB."""
    try:
        count = db.query(func.count(FlightRecord.id)).scalar()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"DB unavailable: {exc}")
    return {
        "status":        "healthy",
        "total_records": count,
        "audit":         audit.stats(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Filters — must come BEFORE parametric routes to avoid path ambiguity
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/filters",
    tags=["Filters"],
    summary="UI filter metadata",
    description=(
        "Returns distinct values for sources, destinations, airlines, classes, "
        "and stops — ideal for populating frontend dropdown menus. "
        "Also returns the date bounds of the dataset."
    ),
)
def get_filters(db: Session = Depends(get_db)):
    return compute_filter_metadata(db)


# ─────────────────────────────────────────────────────────────────────────────
# Index endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/index/timeseries",
    tags=["Price Index"],
    summary="Global airfare price index time-series",
    description=(
        "Computes a baseline-relative Airfare Price Index (base = 100 on the "
        "earliest journey date). Uses a frequency-weighted geometric mean of daily "
        "fares. Returns daily index values, percentage change, and 7-day rolling average."
    ),
)
def index_timeseries(
    range: Optional[str] = Query(None, description="Time range filter: 24H, 7D, 30D, 90D, YTD"),
    db: Session = Depends(get_db),
):
    data = compute_index_timeseries(db, range_val=range)
    if not data:
        raise HTTPException(status_code=404, detail="No flight records found")
    return {
        "base_value": 100,
        "base_date":  data[0]["date"],
        "data_points": len(data),
        "series": data,
    }


@app.get(
    "/api/v1/index/leadtime",
    tags=["Price Index"],
    summary="Booking lead-time pricing curve",
    description=(
        "Shows how average fare changes as days_left decreases — the classic "
        "demand-pricing curve. Optional filters: source, destination, airline, class."
    ),
)
def index_leadtime(
    source:       Optional[str] = Query(None, description="Origin city, e.g. Delhi"),
    destination:  Optional[str] = Query(None, description="Destination city, e.g. Mumbai"),
    airline:      Optional[str] = Query(None, description="Airline, e.g. Vistara"),
    flight_class: Optional[str] = Query(None, alias="class", description="Cabin class, e.g. Economy"),
    db: Session = Depends(get_db),
):
    data = compute_leadtime_curve(
        db,
        source=source,
        destination=destination,
        airline=airline,
        flight_class=flight_class,
    )
    if not data:
        raise HTTPException(status_code=404, detail="No data found for the given filters")
    return {"filters": {"source": source, "destination": destination,
                        "airline": airline, "class": flight_class},
            "data_points": len(data), "series": data}


# ─────────────────────────────────────────────────────────────────────────────
# Route trends
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/routes/trends",
    tags=["Routes"],
    summary="Daily price trend for a route",
    description=(
        "Returns daily min / max / avg fare and flight count for the specified route. "
        "All parameters are optional — omitting them returns aggregate trends across all routes."
    ),
)
def route_trends(
    source:       Optional[str] = Query(None, description="Origin city"),
    destination:  Optional[str] = Query(None, description="Destination city"),
    flight_class: Optional[str] = Query(None, alias="class", description="Cabin class"),
    db: Session = Depends(get_db),
):
    data = compute_route_trends(
        db, source=source, destination=destination, flight_class=flight_class
    )
    if not data:
        raise HTTPException(status_code=404, detail="No data found for the given route")

    # Summary statistics over the series
    avg_fares = [d["avg_fare"] for d in data]
    return {
        "filters": {"source": source, "destination": destination, "class": flight_class},
        "summary": {
            "overall_min_fare":  min(d["min_fare"] for d in data),
            "overall_max_fare":  max(d["max_fare"] for d in data),
            "overall_avg_fare":  round(sum(avg_fares) / len(avg_fares), 2),
            "total_days":        len(data),
            "total_flights":     sum(d["flight_count"] for d in data),
        },
        "series": data,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Airline comparison
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/airlines/comparison",
    tags=["Airlines"],
    summary="Per-airline market share and fare comparison",
    description=(
        "Compares all carriers operating on a route: flight count, market share %, "
        "avg / min / max fare, average duration, and stop breakdown (non-stop / 1-stop / 2+)."
    ),
)
def airline_comparison(
    source:       Optional[str] = Query(None, description="Origin city"),
    destination:  Optional[str] = Query(None, description="Destination city"),
    flight_class: Optional[str] = Query(None, alias="class", description="Cabin class"),
    db: Session = Depends(get_db),
):
    data = compute_airline_comparison(
        db, source=source, destination=destination, flight_class=flight_class
    )
    if not data:
        raise HTTPException(status_code=404, detail="No airline data found for the given filters")
    return {
        "filters":  {"source": source, "destination": destination, "class": flight_class},
        "carriers": len(data),
        "airlines": data,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Raw flight search (paginated)
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/flights/search",
    tags=["Flights"],
    summary="Paginated flight search",
    description="Search individual flight records with optional filters and pagination.",
)
def flights_search(
    source:       Optional[str] = Query(None),
    destination:  Optional[str] = Query(None),
    airline:      Optional[str] = Query(None),
    flight_class: Optional[str] = Query(None, alias="class"),
    min_fare:     Optional[int] = Query(None, ge=0),
    max_fare:     Optional[int] = Query(None, ge=0),
    days_left_min: Optional[int] = Query(None, ge=0),
    days_left_max: Optional[int] = Query(None, ge=0),
    limit:        int           = Query(50, ge=1, le=500),
    offset:       int           = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(FlightRecord)

    if source:
        q = q.filter(FlightRecord.source.ilike(f"%{source}%"))
    if destination:
        q = q.filter(FlightRecord.destination.ilike(f"%{destination}%"))
    if airline:
        q = q.filter(FlightRecord.airline.ilike(f"%{airline}%"))
    if flight_class:
        q = q.filter(FlightRecord.flight_class.ilike(f"%{flight_class}%"))
    if min_fare is not None:
        q = q.filter(FlightRecord.fare >= min_fare)
    if max_fare is not None:
        q = q.filter(FlightRecord.fare <= max_fare)
    if days_left_min is not None:
        q = q.filter(FlightRecord.days_left >= days_left_min)
    if days_left_max is not None:
        q = q.filter(FlightRecord.days_left <= days_left_max)

    total = q.count()
    records = q.order_by(FlightRecord.date_of_journey, FlightRecord.fare).offset(offset).limit(limit).all()

    return {
        "total":   total,
        "offset":  offset,
        "limit":   limit,
        "results": [
            {
                "id":               r.id,
                "date_of_journey":  str(r.date_of_journey),
                "journey_day":      r.journey_day,
                "airline":          r.airline,
                "flight_code":      r.flight_code,
                "class":            r.flight_class,
                "source":           r.source,
                "destination":      r.destination,
                "departure":        r.departure,
                "arrival":          r.arrival,
                "total_stops":      r.total_stops,
                "duration_hours":   r.duration_in_hours,
                "days_left":        r.days_left,
                "fare":             r.fare,
                "base_fare":        r.base_fare,
                "taxes_surcharges": r.taxes_and_surcharges,
                "total_fare":       r.total_fare,
            }
            for r in records
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Phase 5 — DGCA Traffic-Weighted Index (APIx)
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/index/apix",
    tags=["Phase 5 · DGCA Index"],
    summary="DGCA traffic-weighted Airfare Price Index (APIx)",
    description=(
        "Computes the composite Airfare Price Index (APIx) using official DGCA "
        "domestic passenger traffic share weights for 9 major city-pair routes. "
        "Returns daily, weekly, or monthly index values with base_fare / tax "
        "decomposition. Suitable for MoSPI CPI Transport sub-index augmentation."
    ),
)
def dgca_apix(
    frequency: str = Query("daily", enum=["daily", "weekly", "monthly"],
                           description="Aggregation frequency"),
    db: Session = Depends(get_db),
):
    data = compute_dgca_weighted_index(db, frequency=frequency)
    if not data["series"]:
        raise HTTPException(status_code=404, detail="No DGCA basket data found")
    return {
        "frequency":     frequency,
        "data_points":   len(data["series"]),
        "methodology":   data["methodology"],
        "basket_routes": data["basket_routes"],
        "series":        data["series"],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Phase 5 — Fare Decomposition
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/fares/decomposition",
    tags=["Phase 5 · Fare Decomposition"],
    summary="Base fare vs. taxes & surcharges breakdown",
    description=(
        "Returns daily average base_fare, taxes_and_surcharges, and effective "
        "tax rate for the selected route. Filters are optional — omitting them "
        "returns the all-India aggregate. Based on India GST regime: 5%% Economy, "
        "12%% Business/First, plus ₹450 fixed UDF/ADF/PSF surcharges."
    ),
)
def fare_decomposition(
    source:       Optional[str] = Query(None, description="Origin city"),
    destination:  Optional[str] = Query(None, description="Destination city"),
    flight_class: Optional[str] = Query(None, alias="class", description="Cabin class"),
    db: Session = Depends(get_db),
):
    data = compute_fare_decomposition(db, source=source,
                                      destination=destination,
                                      flight_class=flight_class)
    if not data["series"]:
        raise HTTPException(status_code=404, detail="No fare decomposition data found")
    return data


# ─────────────────────────────────────────────────────────────────────────────
# Phase 5 — NSO Export (Secure)
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/nso/export",
    tags=["Phase 5 · NSO Export"],
    summary="Structured NSO/MoSPI export — JSON or CSV",
    description=(
        "**Secured endpoint** — requires `X-API-Key` header.\n\n"
        "Returns a fully structured payload for government inflation monitoring, "
        "combining the composite standard index, the DGCA traffic-weighted APIx, "
        "and the base-fare / tax decomposition at the requested frequency.\n\n"
        "Pass `?format=csv` to download as a UTF-8 CSV file for RBI/NSO systems. "
        "Default response is JSON.\n\n"
        "**Dev key**: `nso-dev-key-2024` (set `NSO_API_KEY` env var in production)."
    ),
    dependencies=[Depends(_require_api_key)],
)
def nso_export(
    frequency: str = Query(
        "daily",
        enum=["daily", "weekly", "monthly"],
        description="Aggregation frequency for the export",
    ),
    format: str = Query(
        "json",
        enum=["json", "csv"],
        description="Response format: 'json' (default) or 'csv' for direct download",
    ),
    db: Session = Depends(get_db),
    _: None = Depends(_require_api_key),   # double-bind for OpenAPI display
):
    payload = build_nso_export_payload(db, frequency=frequency)

    if not payload["series"]:
        raise HTTPException(status_code=404, detail="No data available for NSO export")

    client_ip = "server"

    if format == "json":
        audit.nso_export(frequency, "json", len(payload["series"]), client_ip)
        return payload

    # ── CSV download ────────────────────────────────────────────────────────
    if not payload["series"]:
        raise HTTPException(status_code=404, detail="No series data to export as CSV")

    fieldnames = list(payload["series"][0].keys())
    buf = io.StringIO()

    # Write header block for traceability
    buf.write(f"# {payload['document']['title']}\n")
    buf.write(f"# Classification: {payload['document']['classification']}\n")
    buf.write(f"# Generated: {payload['document']['generated_at']}\n")
    buf.write(f"# Frequency: {frequency}\n")
    buf.write(f"# Base period: {payload['dataset']['base_period']} (Index=100)\n")
    buf.write(f"# Records: {payload['dataset']['total_records']:,}\n")
    buf.write("#\n")

    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(payload["series"])

    filename = f"DAPI_NSO_Export_{frequency}_{payload['dataset']['base_period']}.csv"
    audit.nso_export(frequency, "csv", len(payload["series"]), client_ip)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─────────────────────────────────────────────────────────────────────────────
# 10. Price Distribution Endpoint (Min, P25, Median, Mean, P75, Max)
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/distribution",
    summary="Get 5-number price distribution (Min, P25, Median, Mean, P75, Max)",
)
def get_price_distribution(
    source: Optional[str] = Query(None, description="Departure city"),
    destination: Optional[str] = Query(None, description="Arrival city"),
    cls: Optional[str] = Query(None, alias="class", description="Cabin class"),
    db: Session = Depends(get_db),
):
    return compute_price_distribution(db, source=source, destination=destination, flight_class=cls)


# ─────────────────────────────────────────────────────────────────────────────
# 11. Data Quality & Reliability Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/quality",
    summary="Get MoSPI/NSO statistical data quality & validation parameters",
)
def get_data_quality(db: Session = Depends(get_db)):
    return compute_data_quality_metrics(db)


# ─────────────────────────────────────────────────────────────────────────────
# 12. Geographic / Regional Hierarchy Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/geography",
    summary="Get airfare index & average fare by geographic region",
)
def get_geography(db: Session = Depends(get_db)):
    return compute_geographic_hierarchy(db)


# ─────────────────────────────────────────────────────────────────────────────
# 13. Top Route Summaries Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/routes/summary",
    summary="Get multi-route comparison grid with index, WoW, MoM, and Min/Max",
)
def get_route_summaries(db: Session = Depends(get_db)):
    return compute_route_summary_cards(db)


# ─────────────────────────────────────────────────────────────────────────────
# 14. Admin Manual Scraper Trigger Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/api/v1/admin/trigger-scrape",
    tags=["Admin"],
    summary="Manually trigger airfare scrape on demand",
    description=(
        "**Secured endpoint** — requires `X-API-Key` header.\n\n"
        "Triggers an on-demand scraping run across DGCA corridors. "
        "Pass `?sync=true` to wait for completion or default to asynchronous background execution."
    ),
    dependencies=[Depends(_require_api_key)],
)
def trigger_scrape(
    background_tasks: BackgroundTasks,
    source: Optional[str] = Query(None, description="Optional single origin city"),
    destination: Optional[str] = Query(None, description="Optional single destination city"),
    windows: Optional[str] = Query(None, description="Comma-separated windows, e.g. '1,7,30'"),
    dry_run: bool = Query(False, description="Dry-run mode without DB insertion"),
    sync: bool = Query(False, description="Run synchronously and wait for results"),
    _: None = Depends(_require_api_key),
):
    from scraper_engine import run_scraper
    from scheduler import logger

    parsed_windows = [int(w.strip()) for w in windows.split(",") if w.strip()] if windows else None

    if sync:
        res = run_scraper(
            source=source,
            destination=destination,
            windows=parsed_windows,
            dry_run=dry_run,
        )
        return {
            "status": "completed",
            "message": "Manual scrape completed.",
            "results": res,
        }

    def _bg_run():
        logger.info("Manual scrape trigger initiated via API endpoint.")
        res = run_scraper(
            source=source,
            destination=destination,
            windows=parsed_windows,
            dry_run=dry_run,
        )
        logger.info(f"Manual trigger finished | Inserted: {res.get('inserted')} | Total Scraped: {res.get('total_records')}")

    background_tasks.add_task(_bg_run)

    return {
        "status": "triggered",
        "message": "Manual scrape job initiated in background.",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "params": {
            "source": source,
            "destination": destination,
            "windows": parsed_windows,
            "dry_run": dry_run,
        },
    }

