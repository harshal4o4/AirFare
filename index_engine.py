"""
index_engine.py
───────────────
Airfare Price Index calculation service.

All public functions accept a SQLAlchemy Session and return plain Python
dicts / lists so they can be serialised by FastAPI with zero extra work.

Index methodology
─────────────────
  • Daily geometric-mean fare across all domestic routes, weighted by
    route frequency (number of flights observed that day).
  • Base date = earliest journey date in the dataset  →  Index = 100.
  • Percentage-change and 7-day rolling average are derived from the
    index series and returned alongside the raw values.
"""

from __future__ import annotations

import math
from typing import Optional

from sqlalchemy import Float, func, case
from sqlalchemy.orm import Session

from models import FlightRecord


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _apply_route_filters(
    query,
    source: Optional[str] = None,
    destination: Optional[str] = None,
    flight_class: Optional[str] = None,
    airline: Optional[str] = None,
):
    """Attach optional WHERE clauses to any query object."""
    if source:
        query = query.filter(FlightRecord.source.ilike(f"%{source}%"))
    if destination:
        query = query.filter(FlightRecord.destination.ilike(f"%{destination}%"))
    if flight_class:
        query = query.filter(FlightRecord.flight_class.ilike(f"%{flight_class}%"))
    if airline:
        query = query.filter(FlightRecord.airline.ilike(f"%{airline}%"))
    return query


def _geometric_mean(values: list[float]) -> float:
    """Compute geometric mean of a list of positive floats."""
    if not values:
        return 0.0
    log_sum = sum(math.log(v) for v in values if v and v > 0)
    return math.exp(log_sum / len(values))


def _pct_change(current: float, previous: float) -> Optional[float]:
    if previous and previous != 0:
        return round((current - previous) / previous * 100, 4)
    return None


def _rolling_avg(series: list[float], window: int = 7) -> list[Optional[float]]:
    """Return a list of rolling averages (None for the first window-1 items)."""
    result: list[Optional[float]] = []
    for i, _ in enumerate(series):
        if i < window - 1:
            result.append(None)
        else:
            chunk = series[i - window + 1 : i + 1]
            result.append(round(sum(chunk) / len(chunk), 4))
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 1. Global Price Index Time-series
# ─────────────────────────────────────────────────────────────────────────────

def compute_index_timeseries(db: Session) -> list[dict]:
    """
    Returns a list of daily index data points:
      {
        date, avg_fare, flight_count,
        index_value,           # baseline-100
        pct_change,            # day-over-day % change in index
        rolling_avg_7d         # 7-day rolling average of index
      }
    """
    # Aggregate: daily mean fare + flight count
    # Use SUM(LN(fare)) / COUNT to compute geometric mean entirely in the DB.
    rows = (
        db.query(
            FlightRecord.date_of_journey.label("dt"),
            func.avg(FlightRecord.fare).label("avg_fare"),
            func.count(FlightRecord.id).label("flight_count"),
            func.sum(
                func.ln(FlightRecord.fare.cast(Float))
            ).label("log_sum"),
        )
        .group_by(FlightRecord.date_of_journey)
        .order_by(FlightRecord.date_of_journey)
        .all()
    )

    if not rows:
        return []

    # Compute geometric mean per day from DB-aggregated log-sum
    geo_means = [
        math.exp(r.log_sum / r.flight_count) if r.flight_count and r.log_sum else 0.0
        for r in rows
    ]

    # Base = first date's geometric mean → index = 100
    base = geo_means[0] if geo_means[0] else 1.0
    index_values = [round(g / base * 100, 4) for g in geo_means]
    rolling = _rolling_avg(index_values, window=7)

    result = []
    for i, r in enumerate(rows):
        result.append(
            {
                "date":           str(r.dt),
                "avg_fare":       round(float(r.avg_fare), 2),
                "flight_count":   r.flight_count,
                "index_value":    index_values[i],
                "pct_change":     _pct_change(index_values[i], index_values[i - 1]) if i > 0 else None,
                "rolling_avg_7d": rolling[i],
            }
        )
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 2. Route Trends
# ─────────────────────────────────────────────────────────────────────────────

def compute_route_trends(
    db: Session,
    source: Optional[str] = None,
    destination: Optional[str] = None,
    flight_class: Optional[str] = None,
) -> list[dict]:
    """
    Daily price trend for a specific route (or all routes if no filter).
    Returns min / max / avg fare and flight count per day.
    """
    q = db.query(
        FlightRecord.date_of_journey.label("dt"),
        func.min(FlightRecord.fare).label("min_fare"),
        func.max(FlightRecord.fare).label("max_fare"),
        func.avg(FlightRecord.fare).label("avg_fare"),
        func.count(FlightRecord.id).label("flight_count"),
    )
    q = _apply_route_filters(q, source=source, destination=destination, flight_class=flight_class)

    rows = q.group_by(FlightRecord.date_of_journey).order_by(FlightRecord.date_of_journey).all()

    avg_fares = [round(float(r.avg_fare), 2) for r in rows]
    prev_avgs = [None] + avg_fares[:-1]

    return [
        {
            "date":         str(r.dt),
            "min_fare":     r.min_fare,
            "max_fare":     r.max_fare,
            "avg_fare":     avg_fares[i],
            "flight_count": r.flight_count,
            "pct_change":   _pct_change(avg_fares[i], prev_avgs[i]),
        }
        for i, r in enumerate(rows)
    ]


# ─────────────────────────────────────────────────────────────────────────────
# 3. Airline Comparison
# ─────────────────────────────────────────────────────────────────────────────

def compute_airline_comparison(
    db: Session,
    source: Optional[str] = None,
    destination: Optional[str] = None,
    flight_class: Optional[str] = None,
) -> list[dict]:
    """
    Per-airline statistics for a given route, including market share.
    Returns: airline, flight_count, market_share_pct, avg / min / max fare,
             avg_duration_hours, stop_breakdown.
    """
    # Main aggregation
    q = db.query(
        FlightRecord.airline.label("airline"),
        func.count(FlightRecord.id).label("flight_count"),
        func.avg(FlightRecord.fare).label("avg_fare"),
        func.min(FlightRecord.fare).label("min_fare"),
        func.max(FlightRecord.fare).label("max_fare"),
        func.avg(FlightRecord.duration_in_hours).label("avg_duration"),
        # Stop breakdown — SQLAlchemy 2.x case() uses keyword-style whens
        func.sum(
            case((FlightRecord.total_stops == "non-stop", 1), else_=0)
        ).label("nonstop_count"),
        func.sum(
            case((FlightRecord.total_stops == "1-stop", 1), else_=0)
        ).label("one_stop_count"),
        func.sum(
            case((FlightRecord.total_stops == "2+-stop", 1), else_=0)
        ).label("multi_stop_count"),
    )
    q = _apply_route_filters(q, source=source, destination=destination, flight_class=flight_class)
    rows = q.group_by(FlightRecord.airline).order_by(func.count(FlightRecord.id).desc()).all()

    if not rows:
        return []

    total_flights = sum(r.flight_count for r in rows)

    return [
        {
            "airline":          r.airline,
            "flight_count":     r.flight_count,
            "market_share_pct": round(r.flight_count / total_flights * 100, 2) if total_flights else 0,
            "avg_fare":         round(float(r.avg_fare), 2),
            "min_fare":         r.min_fare,
            "max_fare":         r.max_fare,
            "avg_duration_hrs": round(float(r.avg_duration), 4) if r.avg_duration else None,
            "stop_breakdown": {
                "non_stop":  int(r.nonstop_count),
                "one_stop":  int(r.one_stop_count),
                "multi_stop": int(r.multi_stop_count),
            },
        }
        for r in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
# 4. Lead-time (days_left) Pricing Curve
# ─────────────────────────────────────────────────────────────────────────────

def compute_leadtime_curve(
    db: Session,
    source: Optional[str] = None,
    destination: Optional[str] = None,
    airline: Optional[str] = None,
    flight_class: Optional[str] = None,
) -> list[dict]:
    """
    Demand-pricing curve: how avg fare changes as days_left decreases.
    Useful for booking-window analysis and CPI augmentation.
    """
    q = db.query(
        FlightRecord.days_left.label("days_left"),
        func.avg(FlightRecord.fare).label("avg_fare"),
        func.min(FlightRecord.fare).label("min_fare"),
        func.max(FlightRecord.fare).label("max_fare"),
        func.count(FlightRecord.id).label("flight_count"),
    ).filter(FlightRecord.days_left.isnot(None))

    q = _apply_route_filters(q, source=source, destination=destination,
                              flight_class=flight_class, airline=airline)

    rows = (
        q.group_by(FlightRecord.days_left)
         .order_by(FlightRecord.days_left)
         .all()
    )

    return [
        {
            "days_left":    r.days_left,
            "avg_fare":     round(float(r.avg_fare), 2),
            "min_fare":     r.min_fare,
            "max_fare":     r.max_fare,
            "flight_count": r.flight_count,
        }
        for r in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
# 5. Filter Metadata (dropdown values)
# ─────────────────────────────────────────────────────────────────────────────

def compute_filter_metadata(db: Session) -> dict:
    """
    Returns all distinct values for UI filter dropdowns, plus date bounds.
    Single query per dimension — no raw record loads.
    """
    def distinct_sorted(col):
        return sorted(
            [r[0] for r in db.query(col).distinct().filter(col.isnot(None)).all()]
        )

    date_bounds = db.query(
        func.min(FlightRecord.date_of_journey),
        func.max(FlightRecord.date_of_journey),
    ).one()

    return {
        "sources":       distinct_sorted(FlightRecord.source),
        "destinations":  distinct_sorted(FlightRecord.destination),
        "airlines":      distinct_sorted(FlightRecord.airline),
        "classes":       distinct_sorted(FlightRecord.flight_class),
        "stops":         distinct_sorted(FlightRecord.total_stops),
        "date_range": {
            "from": str(date_bounds[0]),
            "to":   str(date_bounds[1]),
        },
    }
