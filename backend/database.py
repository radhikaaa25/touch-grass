"""
Database setup and seeding for the Touch Grass outdoor activities database.
Creates and populates trails, parks, and run_clubs tables in SQLite.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "outdoors.db")


def get_connection() -> sqlite3.Connection:
    """Return a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create all tables if they don't already exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'moderate', 'hard')),
            length_miles REAL NOT NULL,
            has_shade INTEGER NOT NULL DEFAULT 0,
            location TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS parks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            has_restrooms INTEGER NOT NULL DEFAULT 0,
            allows_dogs INTEGER NOT NULL DEFAULT 0,
            location TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS run_clubs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            meeting_day TEXT NOT NULL,
            distance_miles REAL NOT NULL,
            location TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


def seed_db() -> None:
    """
    Populate the database with realistic mock data.
    Only seeds if the tables are empty (idempotent).
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Check if data already exists
    cursor.execute("SELECT COUNT(*) FROM trails")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    # ── Trails (8 rows) ──────────────────────────────────────────────
    trails = [
        ("Sunset Ridge Loop", "easy", 1.8, 1, "Austin, TX"),
        ("Barton Creek Greenbelt", "moderate", 5.2, 1, "Austin, TX"),
        ("Lady Bird Lake Trail", "easy", 1.3, 1, "Austin, TX"),
        ("Mount Bonnell Steps", "hard", 0.6, 0, "Austin, TX"),
        ("Piedmont Park Loop", "easy", 2.4, 1, "Atlanta, GA"),
        ("Kennesaw Mountain Trail", "hard", 4.8, 0, "Marietta, GA"),
        ("Silver Comet Trail", "easy", 3.1, 1, "Smyrna, GA"),
        ("Runyon Canyon Fire Road", "moderate", 3.5, 0, "Los Angeles, CA"),
    ]
    cursor.executemany(
        "INSERT INTO trails (name, difficulty, length_miles, has_shade, location) VALUES (?, ?, ?, ?, ?)",
        trails,
    )

    # ── Parks (7 rows) ───────────────────────────────────────────────
    parks = [
        ("Zilker Metropolitan Park", 1, 1, "Austin, TX"),
        ("Pease District Park", 1, 0, "Austin, TX"),
        ("Prospect Park", 1, 1, "Brooklyn, NY"),
        ("Central Park", 1, 1, "Manhattan, NY"),
        ("Griffith Park", 1, 1, "Los Angeles, CA"),
        ("Piedmont Park", 1, 1, "Atlanta, GA"),
        ("Discovery Green", 1, 0, "Houston, TX"),
    ]
    cursor.executemany(
        "INSERT INTO parks (name, has_restrooms, allows_dogs, location) VALUES (?, ?, ?, ?)",
        parks,
    )

    # ── Run Clubs (5 rows) ───────────────────────────────────────────
    run_clubs = [
        ("Austin Trail Runners", "Saturday", 5.0, "Austin, TX"),
        ("Peachtree Road Runners", "Sunday", 3.0, "Atlanta, GA"),
        ("Brooklyn Run Club", "Wednesday", 4.0, "Brooklyn, NY"),
        ("LA Leggers", "Saturday", 6.0, "Los Angeles, CA"),
        ("Bayou City Striders", "Tuesday", 3.5, "Houston, TX"),
    ]
    cursor.executemany(
        "INSERT INTO run_clubs (name, meeting_day, distance_miles, location) VALUES (?, ?, ?, ?)",
        run_clubs,
    )

    conn.commit()
    conn.close()
    print("✅  Database seeded with 20 rows of outdoor activity data.")


def get_schema_string() -> str:
    """Return a human-readable string of the full database schema for LLM context."""
    return """
TABLE: trails
  id            INTEGER PRIMARY KEY AUTOINCREMENT
  name          TEXT NOT NULL
  difficulty    TEXT NOT NULL  -- one of: 'easy', 'moderate', 'hard'
  length_miles  REAL NOT NULL
  has_shade     INTEGER NOT NULL  -- 0 = no, 1 = yes
  location      TEXT NOT NULL

TABLE: parks
  id            INTEGER PRIMARY KEY AUTOINCREMENT
  name          TEXT NOT NULL
  has_restrooms INTEGER NOT NULL  -- 0 = no, 1 = yes
  allows_dogs   INTEGER NOT NULL  -- 0 = no, 1 = yes
  location      TEXT NOT NULL

TABLE: run_clubs
  id             INTEGER PRIMARY KEY AUTOINCREMENT
  name           TEXT NOT NULL
  meeting_day    TEXT NOT NULL  -- e.g. 'Monday', 'Saturday'
  distance_miles REAL NOT NULL
  location       TEXT NOT NULL
""".strip()
