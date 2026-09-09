"""
migrate_add_fare_decomposition.py
──────────────────────────────────
One-time schema migration: adds base_fare, taxes_and_surcharges, total_fare
columns to flight_records and back-fills them from the existing fare column.

Tax estimation methodology (India domestic aviation, GST regime):
  Economy / Premium Economy : GST  5%  on base fare  →  total = base × 1.05
  Business / First          : GST 12%  on base fare  →  total = base × 1.12
  Additional fixed surcharges (UDF/ADF/PSF) estimated at ₹450/ticket
  base_fare = ROUND((fare - 450) / gst_multiplier)
  taxes     = fare - base_fare

Run once:
    source .venv/bin/activate
    python migrate_add_fare_decomposition.py
"""

import sys
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from database import engine

MIGRATION_SQL = """
-- 1. Add columns (idempotent via IF NOT EXISTS)
ALTER TABLE flight_records
    ADD COLUMN IF NOT EXISTS base_fare            INTEGER,
    ADD COLUMN IF NOT EXISTS taxes_and_surcharges INTEGER,
    ADD COLUMN IF NOT EXISTS total_fare           INTEGER;

-- 2. Set total_fare = existing fare
UPDATE flight_records SET total_fare = fare WHERE total_fare IS NULL;

-- 3. Estimate base_fare and taxes by cabin class
--    Economy / Premium Economy : GST 5%  + ₹450 fixed surcharges
--    Business / First          : GST 12% + ₹450 fixed surcharges
UPDATE flight_records
SET
    base_fare = CASE
        WHEN "class" IN ('Economy', 'Premium Economy')
            THEN GREATEST(ROUND((fare - 450) / 1.05), 1)
        ELSE
            GREATEST(ROUND((fare - 450) / 1.12), 1)
    END,
    taxes_and_surcharges = CASE
        WHEN "class" IN ('Economy', 'Premium Economy')
            THEN fare - GREATEST(ROUND((fare - 450) / 1.05), 1)
        ELSE
            fare - GREATEST(ROUND((fare - 450) / 1.12), 1)
    END
WHERE base_fare IS NULL;

-- 4. Create index for fast aggregation on new columns
CREATE INDEX IF NOT EXISTS idx_fr_base_fare  ON flight_records (base_fare);
CREATE INDEX IF NOT EXISTS idx_fr_total_fare ON flight_records (total_fare);
"""

VERIFY_SQL = """
SELECT
    "class",
    COUNT(*)                           AS records,
    ROUND(AVG(fare))                   AS avg_total_fare,
    ROUND(AVG(base_fare))              AS avg_base_fare,
    ROUND(AVG(taxes_and_surcharges))   AS avg_taxes,
    ROUND(AVG(taxes_and_surcharges::float / NULLIF(fare,0) * 100), 1) AS tax_pct
FROM flight_records
GROUP BY "class"
ORDER BY avg_total_fare DESC;
"""

def run():
    print("🔧  Running fare decomposition migration …")
    try:
        with engine.begin() as conn:
            conn.execute(text(MIGRATION_SQL))
        print("✅  Migration complete.")

        print("\n📊  Verification — fare decomposition by class:")
        with engine.connect() as conn:
            rows = conn.execute(text(VERIFY_SQL)).fetchall()
            print(f"  {'Class':<20} {'Records':>8}  {'Total':>8}  {'Base':>8}  {'Taxes':>8}  {'Tax%':>6}")
            print("  " + "─" * 68)
            for r in rows:
                print(f"  {(r[0] or 'N/A'):<20} {r[1]:>8,}  ₹{r[2]:>7,}  ₹{r[3]:>7,}  ₹{r[4]:>7,}  {r[5]:>5}%")

    except SQLAlchemyError as exc:
        print(f"❌  Migration failed:\n    {exc}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    run()
