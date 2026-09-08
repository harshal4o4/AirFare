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
  GET /api/v1/routes/trends          Daily price trend for a route
  GET /api/v1/airlines/comparison    Per-airline market share & fares
  GET /api/v1/flights/search         Paginated raw flight search

Run:
  uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from index_engine import (
    compute_airline_comparison,
    compute_filter_metadata,
    compute_index_timeseries,
    compute_leadtime_curve,
    compute_route_trends,
)
from models import FlightRecord

# ─────────────────────────────────────────────────────────────────────────────
# App bootstrap
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="✈️ Real-time Airfare Price Index API",
    description=(
        "Computes baseline-relative airfare price indices, route trend analysis, "
        "airline market comparison, and booking-window pricing curves from live "
        "PostgreSQL data."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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
    return {"status": "healthy", "total_records": count}


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
def index_timeseries(db: Session = Depends(get_db)):
    data = compute_index_timeseries(db)
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
            }
            for r in records
        ],
    }
