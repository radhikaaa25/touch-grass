"""
Database setup and seeding for the Touch Grass outdoor activities database.
Creates and populates trails, parks, and run_clubs tables in SQLite with GPS coordinates.
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
    """Create all tables if they don't already exist or migrate if schema changed."""
    conn = get_connection()
    cursor = conn.cursor()

    # Drop tables to migrate if schema doesn't have latitude or has old length_miles
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='trails'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(trails)")
        columns = [col[1] for col in cursor.fetchall()]
        if "latitude" not in columns or "length_miles" in columns:
            cursor.execute("DROP TABLE IF EXISTS trails")
            cursor.execute("DROP TABLE IF EXISTS parks")
            cursor.execute("DROP TABLE IF EXISTS run_clubs")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'moderate', 'hard')),
            length_km REAL NOT NULL,
            has_shade INTEGER NOT NULL DEFAULT 0,
            location TEXT NOT NULL,
            latitude REAL,
            longitude REAL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS parks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            has_restrooms INTEGER NOT NULL DEFAULT 0,
            allows_dogs INTEGER NOT NULL DEFAULT 0,
            location TEXT NOT NULL,
            latitude REAL,
            longitude REAL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS run_clubs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            meeting_day TEXT NOT NULL,
            distance_km REAL NOT NULL,
            location TEXT NOT NULL,
            latitude REAL,
            longitude REAL
        )
    """)

    conn.commit()
    conn.close()


def seed_db() -> None:
    """
    Populate the database with realistic Indian outdoor mock data including GPS coordinates.
    Only seeds if the tables are empty (idempotent).
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Check if data already exists
    cursor.execute("SELECT COUNT(*) FROM trails")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    # ── Indian Trails & Treks (18 rows with coordinates) ─────────────
    trails = [
        ("Turahalli Forest Trail", "easy", 3.2, 1, "Bengaluru, KA", 12.8864, 77.5195),
        ("Nandi Hills Sunrise Trail", "moderate", 4.5, 0, "Bengaluru, KA", 13.3702, 77.6835),
        ("Bannerghatta Nature Walk", "easy", 2.8, 1, "Bengaluru, KA", 12.8009, 77.5777),
        ("Kanheri Caves Nature Trail (SGNP)", "easy", 3.5, 1, "Mumbai, MH", 19.2057, 72.9069),
        ("Yeoor Hills Forest Trail", "moderate", 5.0, 1, "Thane, MH", 19.2319, 72.9515),
        ("Sinhagad Fort Trek", "moderate", 4.2, 0, "Pune, MH", 18.3663, 73.7559),
        ("ARAI Hills (Vetal Tekdi) Loop", "easy", 3.0, 1, "Pune, MH", 18.5284, 73.8189),
        ("Rajmachi Fort Trek", "moderate", 6.5, 0, "Lonavala, MH", 18.8269, 73.3995),
        ("Aravalli Biodiversity Park Trail", "easy", 3.8, 1, "Gurugram, HR", 28.4816, 77.1006),
        ("Asola Bhatti Wildlife Sanctuary Trail", "moderate", 5.5, 1, "New Delhi, DL", 28.4907, 77.2514),
        ("Jahanpanah City Forest Trail", "easy", 4.0, 1, "New Delhi, DL", 28.5323, 77.2343),
        ("Triund Ridge Trek", "hard", 9.0, 0, "Dharamshala, HP", 32.2575, 76.3534),
        ("Nag Tibba Summit Hike", "hard", 8.0, 1, "Mussoorie, UK", 30.5847, 78.1528),
        ("Chembra Peak Heart Lake Trek", "moderate", 4.5, 0, "Wayanad, KL", 11.5126, 76.0869),
        ("Doddabetta Peak Forest Walk", "easy", 2.2, 1, "Ooty, TN", 11.4011, 76.7360),
        ("Ananthagiri Hills Forest Trail", "moderate", 4.0, 1, "Vikarabad, TS", 17.3113, 77.8687),
        ("Mullayanagiri Peak Hike", "hard", 5.0, 0, "Chikkamagaluru, KA", 13.3912, 75.7214),
        ("Kasarsai Dam Lake Circuit", "easy", 3.5, 0, "Pune, MH", 18.6657, 73.6934),
    ]
    cursor.executemany(
        "INSERT INTO trails (name, difficulty, length_km, has_shade, location, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)",
        trails,
    )

    # ── Indian Parks (16 rows with coordinates) ──────────────────────
    parks = [
        ("Cubbon Park", 1, 1, "Bengaluru, KA", 12.9763, 77.5929),
        ("Lalbagh Botanical Garden", 1, 0, "Bengaluru, KA", 12.9507, 77.5848),
        ("Sanjay Gandhi National Park", 1, 0, "Mumbai, MH", 19.2288, 72.9182),
        ("Shivaji Park", 1, 1, "Mumbai, MH", 19.0269, 72.8375),
        ("Hanging Gardens (Pherozeshah Mehta)", 1, 0, "Mumbai, MH", 18.9566, 72.8052),
        ("Lodhi Gardens", 1, 1, "New Delhi, DL", 28.5933, 77.2197),
        ("Deer Park (Hauz Khas)", 1, 1, "New Delhi, DL", 28.5529, 77.1950),
        ("Sunder Nursery Heritage Park", 1, 1, "New Delhi, DL", 28.5916, 77.2435),
        ("KBR National Park (Jubilee Hills)", 1, 0, "Hyderabad, TS", 17.4259, 78.4184),
        ("Sanjeevaiah Children & Dog Park", 1, 1, "Hyderabad, TS", 17.4332, 78.4795),
        ("Semmozhi Poonga Botanical Garden", 1, 0, "Chennai, TN", 13.0506, 80.2520),
        ("Tholkappia Poonga (Adyar Eco Park)", 1, 0, "Chennai, TN", 13.0185, 80.2642),
        ("Pu La Deshpande Garden (Okayama)", 1, 0, "Pune, MH", 18.4947, 73.8344),
        ("Kamala Nehru Park", 1, 1, "Pune, MH", 18.5173, 73.8329),
        ("Central Park (Kharghar)", 1, 0, "Navi Mumbai, MH", 19.0560, 73.0691),
        ("Rabindra Sarobar Lake Park", 1, 0, "Kolkata, WB", 22.5117, 88.3548),
    ]
    cursor.executemany(
        "INSERT INTO parks (name, has_restrooms, allows_dogs, location, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)",
        parks,
    )

    # ── Indian Run Clubs (15 rows with coordinates) ──────────────────
    run_clubs = [
        ("Cubbon Park Pacers", "Sunday", 5.0, "Bengaluru, KA", 12.9763, 77.5929),
        ("Koramangala Runners", "Wednesday", 6.0, "Bengaluru, KA", 12.9352, 77.6245),
        ("Indiranagar Running Squad", "Saturday", 7.5, "Bengaluru, KA", 12.9719, 77.6412),
        ("Mumbai Road Runners", "Saturday", 10.0, "Mumbai, MH", 18.9220, 72.8347),
        ("Marine Drive Striders", "Sunday", 5.0, "Mumbai, MH", 18.9432, 72.8230),
        ("Bandra Bandstand Runners", "Tuesday", 4.0, "Mumbai, MH", 19.0506, 72.8214),
        ("Delhi Runners Group", "Sunday", 6.0, "New Delhi, DL", 28.6139, 77.2090),
        ("Lodhi Walkers & Runners Club", "Saturday", 5.0, "New Delhi, DL", 28.5933, 77.2197),
        ("Gurgaon Road Runners", "Sunday", 10.0, "Gurugram, HR", 28.4595, 77.0266),
        ("Pune Running Beyond Myself", "Saturday", 5.0, "Pune, MH", 18.5204, 73.8567),
        ("Vetal Tekdi Trail Runners", "Sunday", 6.5, "Pune, MH", 18.5284, 73.8189),
        ("Hyderabad Runners Society", "Saturday", 8.0, "Hyderabad, TS", 17.4259, 78.4184),
        ("Chennai Runners (Marina Chapter)", "Sunday", 5.0, "Chennai, TN", 13.0500, 80.2824),
        ("Kolkata Running Squad", "Sunday", 5.0, "Kolkata, WB", 22.5117, 88.3548),
        ("Goa Beach Runners", "Saturday", 5.0, "Panaji, Goa", 15.4989, 73.8278),
    ]
    cursor.executemany(
        "INSERT INTO run_clubs (name, meeting_day, distance_km, location, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)",
        run_clubs,
    )

    conn.commit()
    conn.close()
    print("[OK] Database seeded with Indian outdoor activities data (trails, parks, run clubs with coordinates).")


def get_schema_string() -> str:
    """Return a human-readable string of the full database schema for LLM context."""
    return """
TABLE: trails
  id            INTEGER PRIMARY KEY AUTOINCREMENT
  name          TEXT NOT NULL
  difficulty    TEXT NOT NULL  -- one of: 'easy', 'moderate', 'hard'
  length_km     REAL NOT NULL  -- length in kilometers
  has_shade     INTEGER NOT NULL  -- 0 = no, 1 = yes
  location      TEXT NOT NULL  -- e.g. 'Bengaluru, KA', 'Mumbai, MH', 'Pune, MH'
  latitude      REAL           -- GPS latitude for mapping
  longitude     REAL           -- GPS longitude for mapping

TABLE: parks
  id            INTEGER PRIMARY KEY AUTOINCREMENT
  name          TEXT NOT NULL
  has_restrooms INTEGER NOT NULL  -- 0 = no, 1 = yes
  allows_dogs   INTEGER NOT NULL  -- 0 = no, 1 = yes
  location      TEXT NOT NULL  -- e.g. 'New Delhi, DL', 'Bengaluru, KA'
  latitude      REAL           -- GPS latitude for mapping
  longitude     REAL           -- GPS longitude for mapping

TABLE: run_clubs
  id           INTEGER PRIMARY KEY AUTOINCREMENT
  name         TEXT NOT NULL
  meeting_day  TEXT NOT NULL  -- e.g. 'Sunday', 'Saturday', 'Wednesday'
  distance_km  REAL NOT NULL  -- distance in kilometers
  location     TEXT NOT NULL  -- e.g. 'Mumbai, MH', 'Hyderabad, TS'
  latitude     REAL           -- GPS latitude for mapping
  longitude    REAL           -- GPS longitude for mapping
""".strip()
