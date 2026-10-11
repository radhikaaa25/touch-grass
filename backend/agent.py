"""
Text-to-SQL AI agent powered by litellm.
Converts natural language questions about outdoor activities into SQL queries,
executes them against the outdoors.db database, and returns structured results.
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


SYSTEM_PROMPT = f"""You are a SQL query generator for an outdoor activities SQLite database.

DATABASE SCHEMA:
{get_schema_string()}

RULES:
1. Output ONLY a single valid SQLite SELECT query. No markdown, no code fences, no explanation.
2. Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or any data-modifying statement.
3. Use correct column names from the schema above.
4. Boolean columns (has_shade, has_restrooms, allows_dogs) use 1 for true and 0 for false.
5. String comparisons should be case-insensitive using LOWER().
6. If the user's question is ambiguous, make a reasonable assumption and query broadly.
7. Always include the 'name' and 'location' columns in the result so the user can identify the activity.
8. If the question spans multiple tables, use UNION ALL with matching column aliases.
9. Limit results to 50 rows maximum.
"""


def _strip_sql(raw: str) -> str:
    """Remove any markdown code fences or extra whitespace the LLM might add."""
    cleaned = raw.strip()
    # Remove ```sql ... ``` wrappers
    cleaned = re.sub(r"^```(?:sql)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


class OutdoorAgent:
    """Agent that translates natural language into SQL and queries the outdoors database."""

    def __init__(self, model: str = "gemini/gemini-3.5-flash-lite"):
        """
        Initialize the agent.

        Args:
            model: Any litellm-compatible model string.
                   Examples:
                     - "gemini/gemini-1.5-flash"   (Google Gemini, free tier default)
                     - "openai/gpt-4o-mini"         (OpenAI)
                     - "ollama/llama3"              (local Ollama)
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
        End-to-end pipeline: question → SQL → execute → results.

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
        response: dict[str, Any] = {
            "generated_sql": sql,
            "results": result["rows"],
        }
        if "error" in result:
            response["error"] = result["error"]
        return response
