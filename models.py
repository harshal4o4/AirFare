"""
models.py
---------
SQLAlchemy ORM model representing the `flight_records` table.

Mirrors the cleaned CSV structure exactly:
  Date_of_journey | Journey_day | Airline | Flight_code | Class |
  Source | Departure | Total_stops | Arrival | Destination |
  Duration_in_hours | Days_left | Fare
"""

from sqlalchemy import Column, Integer, String, Float, Date
from database import Base


class FlightRecord(Base):
    """
    Maps to the `flight_records` table in airfare_db.

    Each row represents one scraped airfare data point from the
    Cleaned_dataset.csv source file.
    """

    __tablename__ = "flight_records"

    # ------------------------------------------------------------------
    # Primary key — auto-incremented surrogate key (not present in CSV).
    # ------------------------------------------------------------------
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # ------------------------------------------------------------------
    # Journey metadata
    # ------------------------------------------------------------------
    date_of_journey = Column(
        Date,
        nullable=False,
        comment="Scheduled departure date of the flight",
    )
    journey_day = Column(
        String(50),
        nullable=True,
        comment="Day of the week derived from date_of_journey",
    )

    # ------------------------------------------------------------------
    # Carrier & flight identification
    # ------------------------------------------------------------------
    airline = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Operating airline name",
    )
    flight_code = Column(
        String(50),
        nullable=True,
        comment="IATA flight number (e.g. AI-202)",
    )

    # ------------------------------------------------------------------
    # Cabin class
    # ------------------------------------------------------------------
    flight_class = Column(
        "class",          # Use reserved-word-safe quoted column name in DB
        String(100),
        nullable=True,
        comment="Cabin class: Economy, Business, etc.",
    )

    # ------------------------------------------------------------------
    # Route
    # ------------------------------------------------------------------
    source = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Departure city/airport",
    )
    departure = Column(
        String(50),
        nullable=True,
        comment="Scheduled departure time or time band (e.g. 'After 6 PM')",
    )
    total_stops = Column(
        String(50),
        nullable=True,
        comment="Number of stops: non-stop, 1-stop, 2+-stop …",
    )
    arrival = Column(
        String(50),
        nullable=True,
        comment="Scheduled arrival time or time band (e.g. '6 AM - 12 PM')",
    )
    destination = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Arrival city/airport",
    )

    # ------------------------------------------------------------------
    # Duration & availability
    # ------------------------------------------------------------------
    duration_in_hours = Column(
        Float,
        nullable=True,
        comment="Total flight duration in decimal hours",
    )
    days_left = Column(
        Integer,
        nullable=True,
        comment="Days between search date and journey date",
    )

    # ------------------------------------------------------------------
    # Pricing
    # ------------------------------------------------------------------
    fare = Column(
        Integer,
        nullable=False,
        comment="Ticket price in INR",
    )

    def __repr__(self) -> str:
        return (
            f"<FlightRecord id={self.id} airline={self.airline!r} "
            f"date={self.date_of_journey} fare={self.fare}>"
        )
