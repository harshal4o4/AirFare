"""
database.py
-----------
SQLAlchemy engine, session factory, and declarative base for the
Real-time Airfare Price Index project.

Connection target: postgresql://localhost/airfare_db
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ---------------------------------------------------------------------------
# Connection URL
# Format: postgresql+psycopg2://<user>:<password>@<host>:<port>/<dbname>
# Adjust USER / PASSWORD to match your local PostgreSQL superuser.
# ---------------------------------------------------------------------------
DATABASE_URL = "postgresql+psycopg2://arnav@localhost:5432/airfare_db"

# ---------------------------------------------------------------------------
# Engine
# pool_pre_ping=True — silently reconnects dropped connections.
# echo=False         — set True to log every SQL statement (dev-friendly).
# ---------------------------------------------------------------------------
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
)

# ---------------------------------------------------------------------------
# Session factory
# autocommit=False & autoflush=False are SQLAlchemy best-practice defaults.
# ---------------------------------------------------------------------------
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

# ---------------------------------------------------------------------------
# Declarative base — all ORM models inherit from this.
# ---------------------------------------------------------------------------
Base = declarative_base()


# ---------------------------------------------------------------------------
# Dependency helper (FastAPI-style)
# Usage in a route:  db: Session = Depends(get_db)
# ---------------------------------------------------------------------------
def get_db():
    """Yield a database session and guarantee cleanup after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
