"""
Text-to-SQL AI agent powered by litellm.
Converts natural language questions about outdoor activities into SQL queries,
executes them against the outdoors.db database, and returns structured results with coordinates.
"""

import os
import re
import sqlite3
from typing import Any

import litellm

from database import get_connection, get_schema_string

# Sync Gemini / Google API keys so either works out of the box
if os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]
elif os.getenv("GOOGLE_API_KEY") and not os.getenv("GEMINI_API_KEY"):
    os.environ["GEMINI_API_KEY"] = os.environ["GOOGLE_API_KEY"]

# Suppress litellm's verbose logging in production
litellm.suppress_debug_info = True


SYSTEM_PROMPT = f"""You are a SQL query generator for an outdoor activities SQLite database in India.

DATABASE SCHEMA:
{get_schema_string()}

RULES:
1. Output ONLY a single valid SQLite SELECT query. No markdown, no code fences, no explanation.
2. Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or any data-modifying statement.
3. Use correct column names from the schema above. Distances and lengths are in kilometers (length_km, distance_km).
4. Boolean columns (has_shade, has_restrooms, allows_dogs) use 1 for true and 0 for false.
5. Flexible location matching: String comparisons must be case-insensitive using LOWER() and LIKE '%...%' patterns.
   Handle common Indian city names and aliases:
   - Bangalore or Bengaluru: (LOWER(location) LIKE '%bengaluru%' OR LOWER(location) LIKE '%bangalore%')
   - Mumbai or Bombay: (LOWER(location) LIKE '%mumbai%' OR LOWER(location) LIKE '%bombay%')
   - Delhi or New Delhi: LOWER(location) LIKE '%delhi%'
   - Gurgaon or Gurugram: (LOWER(location) LIKE '%gurgaon%' OR LOWER(location) LIKE '%gurugram%')
   - Pune: LOWER(location) LIKE '%pune%'
   - Hyderabad: LOWER(location) LIKE '%hyderabad%'
   - Chennai or Madras: (LOWER(location) LIKE '%chennai%' OR LOWER(location) LIKE '%madras%')
   - Kolkata or Calcutta: (LOWER(location) LIKE '%kolkata%' OR LOWER(location) LIKE '%calcutta%')
6. Keyword mapping:
   - 'trek', 'treks', 'hike', 'hikes', 'trails', 'walks' map to the 'trails' table.
   - 'dog friendly', 'dogs', 'pets' map to allows_dogs = 1 in the 'parks' table.
   - 'shade' or 'shaded' map to has_shade = 1.
7. If the user's question is ambiguous, make a reasonable assumption and query broadly.
8. Always include 'name', 'location', 'latitude', and 'longitude' in SELECT queries so that items can be displayed on the interactive map. Also include other relevant columns (difficulty, length_km, has_shade, allows_dogs, has_restrooms, meeting_day, distance_km) when applicable.
9. If the question spans multiple tables, use UNION ALL with matching column aliases.
10. Limit results to 50 rows maximum.
"""


def _strip_sql(raw: str) -> str:
    """Remove any markdown code fences or extra whitespace the LLM might add."""
    cleaned = raw.strip()
    # Remove ```sql ... ``` wrappers
    cleaned = re.sub(r"^```(?:sql)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def enrich_coordinates(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Ensure every row with a recognized name has latitude/longitude for Leaflet mapping."""
    if not rows:
        return rows
    needs_coords = [r for r in rows if r.get("latitude") is None or r.get("longitude") is None]
    if not needs_coords:
        return rows

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT name, latitude, longitude, location FROM trails
            UNION ALL
            SELECT name, latitude, longitude, location FROM parks
            UNION ALL
            SELECT name, latitude, longitude, location FROM run_clubs
        """)
        cache = {str(row[0]).strip().lower(): (row[1], row[2], row[3]) for row in cursor.fetchall()}

        for r in rows:
            name_key = str(r.get("name", "")).strip().lower()
            if (r.get("latitude") is None or r.get("longitude") is None) and name_key in cache:
                lat, lng, loc = cache[name_key]
                r["latitude"] = lat
                r["longitude"] = lng
                if not r.get("location"):
                    r["location"] = loc
    except Exception:
        pass
    finally:
        conn.close()

    return rows


class OutdoorAgent:
    """Agent that translates natural language into SQL and queries the outdoors database."""

    def __init__(self, model: str = "gemini/gemini-3.5-flash-lite"):
        """
        Initialize the agent.

        Args:
            model: Any litellm-compatible model string.
        """
        self.model = model

    def generate_sql(self, question: str) -> str:
        """
        Use the LLM to convert a natural language question into a SQL query.

        Args:
            question: The user's natural language question.

        Returns:
            A SQL SELECT query string.
        """
        response = litellm.completion(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
            temperature=0.0,
            max_tokens=300,
        )
        raw_sql = response.choices[0].message.content
        return _strip_sql(raw_sql)

    @staticmethod
    def execute_sql(query: str) -> dict[str, Any]:
        """
        Safely execute a SQL query against the outdoors database.

        Args:
            query: A SQL SELECT query string.

        Returns:
            A dict with keys:
              - "columns": list of column name strings
              - "rows": list of dicts (one per result row)
              - "error": error message string (only present on failure)
        """
        # Safety check: reject anything that isn't a SELECT
        normalized = query.strip().upper()
        if not normalized.startswith("SELECT"):
            return {
                "columns": [],
                "rows": [],
                "error": "Only SELECT queries are allowed.",
            }

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(query)
            columns = [description[0] for description in cursor.description]
            raw_rows = cursor.fetchall()
            rows = [dict(zip(columns, row)) for row in raw_rows]
            rows = enrich_coordinates(rows)
            return {"columns": columns, "rows": rows}
        except sqlite3.Error as exc:
            return {
                "columns": [],
                "rows": [],
                "error": f"SQL execution error: {exc}",
            }
        finally:
            conn.close()

    def ask(self, question: str) -> dict[str, Any]:
        """
        End-to-end pipeline: question -> SQL -> execute -> (self-healing retry on error) -> results.

        Args:
            question: Natural language question from the user.

        Returns:
            Dict with generated_sql, results, and optionally an error.
        """
        try:
            sql = self.generate_sql(question)
        except Exception as exc:
            return {
                "generated_sql": "",
                "results": [],
                "error": f"LLM error: {exc}",
            }

        result = self.execute_sql(sql)

        # Self-healing retry: If the generated SQL failed, pass the error back to the LLM once
        if "error" in result and not result.get("rows"):
            try:
                retry_response = litellm.completion(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": question},
                        {"role": "assistant", "content": sql},
                        {
                            "role": "user",
                            "content": f"The query failed with: {result['error']}. Provide ONLY the corrected SQLite SELECT query.",
                        },
                    ],
                    temperature=0.0,
                    max_tokens=300,
                )
                fixed_sql = _strip_sql(retry_response.choices[0].message.content)
                retry_result = self.execute_sql(fixed_sql)
                if "error" not in retry_result or retry_result.get("rows"):
                    sql = fixed_sql
                    result = retry_result
            except Exception:
                pass

        response: dict[str, Any] = {
            "generated_sql": sql,
            "results": result["rows"],
        }
        if "error" in result:
            response["error"] = result["error"]
        return response
