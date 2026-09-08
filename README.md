# ✈️ National Airfare Price Index

A full-stack, real-time analytics platform for domestic airfare pricing in India — built with **FastAPI**, **PostgreSQL**, **SQLAlchemy**, **Pandas**, **React**, **Vite**, and **Recharts**.

---

## Architecture

```
Scraped_dataset.csv (raw)
       ↓  normalize_and_load.py
Cleaned_dataset.csv (clean)
       ↓  ingest.py
PostgreSQL · airfare_db · flight_records (452,088 rows)
       ↓  SQLAlchemy ORM
FastAPI :8000  ←  index_engine.py
       ↓  Vite proxy /api
React Dashboard :5173
```

---

## Project Structure

```
AirFare/
├── backend/
│   ├── database.py          # SQLAlchemy engine + session factory
│   ├── models.py            # FlightRecord ORM model
│   ├── index_engine.py      # Price index calculation service
│   ├── main.py              # FastAPI app + all REST endpoints
│   ├── ingest.py            # Bulk-ingest Cleaned_dataset.csv → PostgreSQL
│   ├── normalize_and_load.py# Phase 2: parse raw CSV → clean → PostgreSQL
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── Dashboard.jsx    # Root layout + state management
    │   ├── api.js           # Fetch helpers
    │   └── components/
    │       ├── Navbar.jsx
    │       ├── StatCards.jsx
    │       ├── FilterBar.jsx
    │       ├── IndexChart.jsx       # Composite price index (AreaChart)
    │       ├── RouteTrendsChart.jsx # Min/avg/max area chart per route
    │       ├── AirlineChart.jsx     # Carrier market share bar chart
    │       └── LeadtimeChart.jsx    # Booking-window pricing curve
    ├── index.html
    └── vite.config.js
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node 18+
- PostgreSQL 16 (via Homebrew on Mac)

### 1. Database
```bash
brew services start postgresql@16
psql postgres -c "CREATE DATABASE airfare_db;"
```

### 2. Backend
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Ingest clean dataset
python ingest.py --csv Cleaned_dataset.csv

# (Optional) Ingest raw scraped data with normalization
python normalize_and_load.py --csv Scraped_dataset.csv

# Start API server
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | DB health + record count |
| GET | `/api/v1/filters` | Distinct sources, destinations, airlines, classes |
| GET | `/api/v1/index/timeseries` | Global price index (base = 100) |
| GET | `/api/v1/index/leadtime` | Booking lead-time pricing curve |
| GET | `/api/v1/routes/trends` | Daily min/avg/max fare for a route |
| GET | `/api/v1/airlines/comparison` | Market share & fare comparison per carrier |
| GET | `/api/v1/flights/search` | Paginated flight search with filters |

Interactive docs: **http://localhost:8000/docs**

---

## Dataset

- **452,088** flight records across **7 domestic Indian cities**
- **9 airlines**: Vistara, Air India, IndiGo, SpiceJet, GO FIRST, AirAsia, AkasaAir, StarAir, AllianceAir
- Date range: **Jan 16 – Mar 6, 2023**
- Densest route: **Bangalore → Delhi Economy** (10,536 records)

> ⚠️ CSV data files are excluded from version control (`.gitignore`). Place `Cleaned_dataset.csv` and `Scraped_dataset.csv` in the project root before running ingestion.

---

## Index Methodology

The **Airfare Price Index** uses a **frequency-weighted geometric mean** of daily fares:

- Base period: earliest journey date in the dataset → **Index = 100**
- Each daily index value is computed as `exp(SUM(ln(fare)) / COUNT)` per day
- A **7-day rolling average** smooths short-term volatility
- Day-over-day percentage change is included in the timeseries response

This methodology mirrors CPI construction and is suitable for augmenting inflation dashboards.
