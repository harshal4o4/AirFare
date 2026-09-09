"""
normalize_and_load.py
─────────────────────
Phase 2 Pipeline: Raw scrape → Clean DataFrame → PostgreSQL

Input : Scraped_dataset.csv  (8 messy columns)
Output: Appends clean rows to airfare_db.flight_records,
        skipping duplicates on (flight_code, date_of_journey, source).

Usage:
    python normalize_and_load.py
    python normalize_and_load.py --csv path/to/Scraped_dataset.csv
    python normalize_and_load.py --chunk-size 2000 --dry-run
"""

import argparse
import sys
import time
from pathlib import Path

import pandas as pd
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from database import engine, Base
from models import FlightRecord  # noqa: F401 — registers FlightRecord with Base.metadata

# ────────────────────────────────────────────────────────────────────────────
# CLI
# ────────────────────────────────────────────────────────────────────────────

DEFAULT_CSV = Path(__file__).parent / "Scraped_dataset.csv"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Normalize raw scraped CSV and load into airfare_db")
    p.add_argument("--csv",        type=Path, default=DEFAULT_CSV)
    p.add_argument("--chunk-size", type=int,  default=1_000)
    p.add_argument("--dry-run",    action="store_true",
                   help="Parse and clean data but do NOT write to DB")
    return p.parse_args()


# ────────────────────────────────────────────────────────────────────────────
# Step 1 — Parsing helpers
# ────────────────────────────────────────────────────────────────────────────

def parse_airline_class(series: pd.Series) -> pd.DataFrame:
    """
    Input : 'SpiceJet \nSG-8169\nECONOMY'
    Output: Airline='SpiceJet', Flight_code='SG-8169', Class='ECONOMY'
    """
    split = series.str.strip().str.split(r"\n", expand=True)
    # Normalise each part: strip whitespace and internal spaces in flight code
    airline     = split[0].str.strip()
    flight_code = split[1].str.replace(r"\s+", "", regex=True).str.strip()
    cls         = split[2].str.strip().str.title()   # ECONOMY → Economy
    return pd.DataFrame({
        "Airline":     airline,
        "Flight_code": flight_code,
        "Class":       cls,
    })


def split_time_city(series: pd.Series):
    """
    Input : '20:00\nDelhi'
    Output: (time_series='20:00', city_series='Delhi')
    """
    split = series.str.strip().str.split(r"\n", n=1, expand=True)
    return split[0].str.strip(), split[1].str.strip()


def time_to_bucket(time_series: pd.Series) -> pd.Series:
    """
    Map 'HH:MM' strings to the same 4-bucket scheme used in Cleaned_dataset:
        Before 6 AM  → 00:00–05:59
        6 AM - 12 PM → 06:00–11:59
        12 PM - 6 PM → 12:00–17:59
        After 6 PM   → 18:00–23:59
    """
    hour = time_series.str.split(":").str[0].astype(float, errors="ignore")
    hour = pd.to_numeric(hour, errors="coerce")

    buckets = pd.cut(
        hour,
        bins=[-1, 5.999, 11.999, 17.999, 24],
        labels=["Before 6 AM", "6 AM - 12 PM", "12 PM - 6 PM", "After 6 PM"],
    )
    return buckets.astype(str).replace("nan", None)


def parse_duration(series: pd.Series) -> pd.Series:
    """
    Input : '02h 05m'
    Output: 2.0833  (decimal hours, rounded to 4 dp)
    """
    h = series.str.extract(r"(\d+)h", expand=False).astype(float).fillna(0)
    m = series.str.extract(r"(\d+)m", expand=False).astype(float).fillna(0)
    return (h + m / 60).round(4)


def clean_stops(series: pd.Series) -> pd.Series:
    """
    Strip the trailing Via-city noise from Total Stops:
        '1-stop\n\t\t\tVia Indore' → '1-stop'
    """
    return series.str.split(r"\n").str[0].str.strip()


def parse_price(series: pd.Series) -> pd.Series:
    """'5,335' → 5335 (integer)"""
    return series.str.replace(",", "", regex=False).str.strip().astype(int)


def calc_days_left(booking: pd.Series, journey: pd.Series) -> pd.Series:
    """
    Days between booking date and journey date.
    Negative values are clipped to 0 (data artefacts).
    """
    diff = (journey - booking).dt.days
    return diff.clip(lower=0).astype("Int64")


def journey_day_name(journey: pd.Series) -> pd.Series:
    """Return the weekday name for each journey date."""
    return journey.dt.day_name()


# ────────────────────────────────────────────────────────────────────────────
# Step 1 — Master transform
# ────────────────────────────────────────────────────────────────────────────

def load_and_normalize(csv_path: Path) -> pd.DataFrame:
    print(f"📂  Reading raw CSV : {csv_path.resolve()}")
    df = pd.read_csv(csv_path)
    raw_count = len(df)
    print(f"    Raw rows loaded : {raw_count:,}")

    # ── Dates ──────────────────────────────────────────────────────────────
    booking = pd.to_datetime(df["Date of Booking"], dayfirst=True, errors="coerce")
    journey = pd.to_datetime(df["Date of Journey"], dayfirst=True, errors="coerce")

    # ── Airline / Flight code / Class ──────────────────────────────────────
    airline_df = parse_airline_class(df["Airline-Class"])

    # ── Departure ──────────────────────────────────────────────────────────
    dep_time, source = split_time_city(df["Departure Time"])

    # ── Arrival ────────────────────────────────────────────────────────────
    arr_time, destination = split_time_city(df["Arrival Time"])

    # ── Build clean DataFrame ──────────────────────────────────────────────
    clean = pd.DataFrame({
        "date_of_journey":   journey.dt.date,
        "journey_day":       journey_day_name(journey),
        "airline":           airline_df["Airline"],
        "flight_code":       airline_df["Flight_code"],
        "class":             airline_df["Class"],
        "source":            source,
        "departure":         time_to_bucket(dep_time),
        "total_stops":       clean_stops(df["Total Stops"]),
        "arrival":           time_to_bucket(arr_time),
        "destination":       destination,
        "duration_in_hours": parse_duration(df["Duration"]),
        "days_left":         calc_days_left(booking, journey),
        "fare":              parse_price(df["Price"]),
    })

    # ── Drop rows with critical nulls ──────────────────────────────────────
    before = len(clean)
    clean = clean.dropna(subset=["date_of_journey", "airline", "fare"])
    dropped = before - len(clean)
    if dropped:
        print(f"⚠️   Dropped {dropped:,} rows with null values in critical columns.")

    print(f"✅  Normalized {len(clean):,} clean rows.")
    return clean


# ────────────────────────────────────────────────────────────────────────────
# Step 2 — Dedup against existing DB rows
# ────────────────────────────────────────────────────────────────────────────

def dedup_against_db(df: pd.DataFrame) -> pd.DataFrame:
    """
    Pull existing (flight_code, date_of_journey, source) combos from the DB
    and remove any matching rows from df before insertion to prevent duplicates.
    """
    print("🔍  Fetching existing keys from DB for deduplication …")
    try:
        with engine.connect() as conn:
            existing = pd.read_sql(
                text("SELECT flight_code, date_of_journey, source FROM flight_records"),
                conn,
            )
    except SQLAlchemyError as exc:
        print(f"⚠️   Could not fetch existing keys (skipping dedup): {exc}")
        return df

    if existing.empty:
        print("    No existing rows — all records are new.")
        return df

    existing["date_of_journey"] = pd.to_datetime(existing["date_of_journey"]).dt.date

    # Merge to find which incoming rows already exist
    df["_join_key"] = (
        df["flight_code"].astype(str)
        + "|" + df["date_of_journey"].astype(str)
        + "|" + df["source"].astype(str)
    )
    existing["_join_key"] = (
        existing["flight_code"].astype(str)
        + "|" + existing["date_of_journey"].astype(str)
        + "|" + existing["source"].astype(str)
    )

    existing_keys = set(existing["_join_key"])
    before = len(df)
    df = df[~df["_join_key"].isin(existing_keys)].drop(columns=["_join_key"])
    dupes = before - len(df)
    print(f"    Skipped {dupes:,} duplicate rows | {len(df):,} new rows to insert.")
    return df


# ────────────────────────────────────────────────────────────────────────────
# Step 2 — DB insertion
# ────────────────────────────────────────────────────────────────────────────

def ensure_schema() -> None:
    print("🔧  Ensuring schema exists …")
    _ = FlightRecord  # Ensures model is registered with Base.metadata
    Base.metadata.create_all(bind=engine)
    print("✅  Schema ready.")


def insert_to_db(df: pd.DataFrame, chunk_size: int) -> tuple[int, float]:
    if df.empty:
        print("ℹ️   Nothing new to insert — database is already up to date.")
        return 0, 0.0

    print(f"🚀  Inserting {len(df):,} rows in chunks of {chunk_size:,} …")
    t0 = time.perf_counter()

    try:
        with engine.begin() as conn:
            df.to_sql(
                name="flight_records",
                con=conn,
                if_exists="append",
                index=False,
                chunksize=chunk_size,
                method="multi",
            )
    except SQLAlchemyError as exc:
        print(f"\n❌  Database error:\n    {exc}", file=sys.stderr)
        sys.exit(1)

    elapsed = time.perf_counter() - t0
    return len(df), elapsed


# ────────────────────────────────────────────────────────────────────────────
# Entry point
# ────────────────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()

    if not args.csv.exists():
        print(
            f"❌  CSV not found: {args.csv.resolve()}\n"
            "    Pass --csv <path> or place Scraped_dataset.csv next to this script.",
            file=sys.stderr,
        )
        sys.exit(1)

    # 1. Normalize
    df = load_and_normalize(args.csv)

    if args.dry_run:
        print("\n🔎  Dry-run mode — sample of cleaned data:")
        print(df.head(10).to_string(index=False))
        print(f"\nDtypes:\n{df.dtypes}")
        print("\n⚡  Dry run complete. No data written to DB.")
        return

    # 2. Schema
    ensure_schema()

    # 3. Dedup
    df = dedup_against_db(df)

    # 4. Insert
    rows_inserted, elapsed = insert_to_db(df, args.chunk_size)

    # 5. Report
    rate = rows_inserted / elapsed if elapsed > 0 else float("inf")
    print("\n" + "=" * 52)
    print("  ✈️   Phase 2 Pipeline Complete")
    print("=" * 52)
    print(f"  Rows inserted  : {rows_inserted:>10,}")
    print(f"  Time elapsed   : {elapsed:>10.2f} s")
    print(f"  Throughput     : {rate:>10,.0f} rows/s")
    print("=" * 52)


if __name__ == "__main__":
    main()
