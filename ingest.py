"""
ingest.py
---------
Bulk-ingests Cleaned_dataset.csv into the PostgreSQL `flight_records` table.

Usage:
    python ingest.py                          # expects CSV in the same folder
    python ingest.py --csv path/to/file.csv   # explicit path

Strategy:
    pandas.DataFrame.to_sql  with method="multi" executes a single
    multi-row INSERT per chunk, which is dramatically faster than
    row-by-row inserts while staying within psycopg2's parameter limit.
"""

import argparse
import sys
import time
from pathlib import Path

import pandas as pd
from sqlalchemy.exc import SQLAlchemyError

from database import engine, Base
import models  # noqa: F401 — registers FlightRecord with Base.metadata


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DEFAULT_CSV = Path(__file__).parent / "Cleaned_dataset.csv"

# Number of rows per INSERT statement.  Tune between 500-5000 based on RAM.
CHUNK_SIZE = 1_000

# Explicit mapping: CSV column name → ORM attribute name (snake_case)
CSV_TO_ORM: dict[str, str] = {
    "Date_of_journey": "date_of_journey",
    "Journey_day":     "journey_day",
    "Airline":         "airline",
    "Flight_code":     "flight_code",
    "Class":           "class",        # quoted column in DB
    "Source":          "source",
    "Departure":       "departure",
    "Total_stops":     "total_stops",
    "Arrival":         "arrival",
    "Destination":     "destination",
    "Duration_in_hours": "duration_in_hours",
    "Days_left":       "days_left",
    "Fare":            "fare",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest Cleaned_dataset.csv into airfare_db.flight_records"
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV,
        help="Path to Cleaned_dataset.csv (default: same directory as script)",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=CHUNK_SIZE,
        help=f"Rows per INSERT batch (default: {CHUNK_SIZE})",
    )
    parser.add_argument(
        "--if-exists",
        choices=["fail", "replace", "append"],
        default="append",
        help="Behaviour if flight_records table already has data (default: append)",
    )
    return parser.parse_args()


def load_and_clean(csv_path: Path) -> pd.DataFrame:
    """Read CSV, rename columns, and coerce dtypes to match the ORM schema."""

    print(f"📂  Reading CSV: {csv_path.resolve()}")
    df = pd.read_csv(csv_path, parse_dates=["Date_of_journey"])

    # Validate all expected columns are present
    missing = set(CSV_TO_ORM.keys()) - set(df.columns)
    if missing:
        raise ValueError(
            f"CSV is missing expected columns: {missing}\n"
            f"Found columns: {list(df.columns)}"
        )

    # Rename to match DB column names
    df = df.rename(columns=CSV_TO_ORM)

    # --- Type coercions ---
    df["date_of_journey"]  = pd.to_datetime(df["date_of_journey"], errors="coerce").dt.date
    df["duration_in_hours"] = pd.to_numeric(df["duration_in_hours"], errors="coerce")
    df["days_left"]         = pd.to_numeric(df["days_left"], errors="coerce").astype("Int64")
    df["fare"]              = pd.to_numeric(df["fare"], errors="coerce").astype("Int64")

    # Drop rows where critical fields are null
    before = len(df)
    df = df.dropna(subset=["date_of_journey", "airline", "fare"])
    dropped = before - len(df)
    if dropped:
        print(f"⚠️   Dropped {dropped} rows with null values in critical columns.")

    print(f"✅  Loaded {len(df):,} clean rows from CSV.")
    return df


def ensure_schema() -> None:
    """Create tables if they do not yet exist (idempotent)."""
    print("🔧  Ensuring database schema exists …")
    Base.metadata.create_all(bind=engine)
    print("✅  Schema ready.")


def ingest(df: pd.DataFrame, chunk_size: int, if_exists: str) -> int:
    """
    Bulk-insert the DataFrame into flight_records.

    Returns the number of rows successfully written.
    """
    print(
        f"🚀  Ingesting {len(df):,} rows in chunks of {chunk_size:,} "
        f"(if_exists='{if_exists}') …"
    )
    t0 = time.perf_counter()

    try:
        with engine.begin() as conn:
            df.to_sql(
                name="flight_records",
                con=conn,
                if_exists=if_exists,
                index=False,        # do NOT write the pandas index as a column
                chunksize=chunk_size,
                method="multi",     # single multi-row INSERT per chunk
            )
    except SQLAlchemyError as exc:
        print(f"\n❌  Database error during ingestion:\n    {exc}", file=sys.stderr)
        sys.exit(1)

    elapsed = time.perf_counter() - t0
    rows_per_sec = len(df) / elapsed if elapsed > 0 else float("inf")

    return len(df), elapsed, rows_per_sec


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()

    # 1. Validate CSV path
    if not args.csv.exists():
        print(
            f"❌  CSV file not found: {args.csv.resolve()}\n"
            "    Place Cleaned_dataset.csv next to ingest.py, or pass --csv <path>.",
            file=sys.stderr,
        )
        sys.exit(1)

    # 2. Prepare schema
    ensure_schema()

    # 3. Load & clean data
    df = load_and_clean(args.csv)

    # 4. Ingest
    rows_inserted, elapsed, rate = ingest(df, args.chunk_size, args.if_exists)

    # 5. Report
    print("\n" + "=" * 50)
    print("  ✈️   Ingestion Complete")
    print("=" * 50)
    print(f"  Rows inserted : {rows_inserted:>10,}")
    print(f"  Time elapsed  : {elapsed:>10.2f} s")
    print(f"  Throughput    : {rate:>10,.0f} rows/s")
    print("=" * 50)


if __name__ == "__main__":
    main()
