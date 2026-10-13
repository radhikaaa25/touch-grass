# Touch Grass: Natural Language AI Outdoor Discovery Engine (India Edition) 🌿🇮🇳

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*

---

## 🏞️ Cover Image

> **Cover Image File:** Saved in `submission/cover.jpg`.  
> *Upload `submission/cover.jpg` as your post's cover image on DEV.to!*

---

## What I Built

Modern life has a habit of trapping us behind glowing rectangles. As developers, we spend hours scouring complex map layers, hiking forums, and club sign-up sheets just to figure out where to go outside after a long coding sprint. The cognitive friction of planning keeps us glued to our desks.

**Touch Grass (India Edition)** is an open-source, AI-powered Text-to-SQL exploration engine that turns plain-English questions into outdoor adventures across India in seconds.

Instead of navigating bloated menus and ad-heavy trail directories, users simply ask questions in natural human language:
- *"Show me easy shaded trails under 5 km"*
- *"Which parks in Bengaluru have restrooms and allow dogs?"*
- *"Find me a weekend run club in Mumbai that runs 5k or 10k"*
- *"What are the best treks and scenic trails near Pune?"*

The application's AI agent parses the request, dynamically generates an accurate SQLite `SELECT` query, executes it safely against a curated database of Indian trails, treks, parks, and run clubs, and formats the results into an interactive, outdoor-themed dashboard. 

The screen is intentional, minimal, and fast—designed so that the interaction lasts **under 10 seconds** before you pack your shoes and step outside.

---

## Demo

### 💻 Live Experience & Architecture Preview

1. **Natural Language Search Bar**: Powered by instant keyboard submission and quick-start chip queries tailored for Indian cities (Bengaluru, Mumbai, Pune, New Delhi, Hyderabad, Chennai, Kolkata, and beyond).
2. **Transparent Query Inspector**: The agent surfaces the exact SQL query it generated, complete with a terminal-style SQLite badge, ensuring full transparency in AI decision-making.
3. **Responsive Outdoors Table**: Displays trail difficulty tags with color-coded badges (Emerald for Easy, Amber for Moderate, Red for Hard), human-friendly boolean icons (`✅ Yes` / `❌ No`), and metric distance markers in kilometers (`km`).
4. **Resilient Status Flow**: Features a self-healing retry pipeline—if the LLM generates an invalid SQL query on first pass, the backend captures the error and feeds it back to the model for an instant automated correction.

```
+-------------------------------------------------------------+
|               🌿 TOUCH GRASS — INDIA EDITION 🇮🇳              |
| Ask anything about local trails, treks, parks, and run clubs|
+-------------------------------------------------------------+
| [ "Show me easy trails under 5 km with shade"   ] [ FIND ]  |
+-------------------------------------------------------------+
| > Generated SQL:                                            |
|   SELECT name, difficulty, length_km, has_shade, location   |
|   FROM trails WHERE difficulty = 'easy' AND length_km < 5   |
|   AND has_shade = 1                                         |
+-------------------------------------------------------------+
| Trails Found:                                               |
| - Turahalli Forest Trail    | 3.2 km | ✅ Shade | Bengaluru |
| - Bannerghatta Nature Walk  | 2.8 km | ✅ Shade | Bengaluru |
| - Kanheri Caves Nature Trail| 3.5 km | ✅ Shade | Mumbai, MH|
| - ARAI Hills Loop           | 3.0 km | ✅ Shade | Pune, MH  |
+-------------------------------------------------------------+
```

*(You can add a 30-second Loom or MP4 recording / GIF of your running screen here!)*

---

## Code

The complete source code is fully open-source and structured as a clean full-stack monorepo:

📁 **GitHub Repository:** `https://github.com/<your-username>/touch-grass`

### Architecture & Tech Stack

| Layer | Technologies | Role |
| :--- | :--- | :--- |
| **Backend** | Python 3.11+, FastAPI, Uvicorn | Async REST API & lifecycles |
| **AI Agent** | `litellm`, Google Gemini / Open-weight Llama | Schema-grounded Text-to-SQL translation with self-healing retry |
| **Database** | SQLite3 (C-native engine) | Curated Indian trails, parks, and run clubs dataset |
| **Frontend** | React 19, Vite, Tailwind CSS v4 | High-performance, earth-toned UI with metric units |
| **Tooling** | Pydantic v2, TypeScript | Strict type safety & request validation |

---

## How I Built It

### 1. Schema Grounding & Prompt Engineering (`backend/agent.py`)
Rather than allowing the LLM to hallucinate database structures, the agent injects an introspected database schema directly into the system prompt with support for Indian cities and aliases:

```python
SYSTEM_PROMPT = f"""You are a SQL query generator for an outdoor activities SQLite database in India.

DATABASE SCHEMA:
{get_schema_string()}

RULES:
1. Output ONLY a single valid SQLite SELECT query. No markdown, no code fences, no explanation.
2. Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or any data-modifying statement.
3. Use correct column names from the schema above. Distances and lengths are in kilometers (length_km, distance_km).
4. Boolean columns (has_shade, has_restrooms, allows_dogs) use 1 for true and 0 for false.
5. Flexible location matching: String comparisons must be case-insensitive using LOWER() and LIKE '%...%' patterns.
   Handle common Indian city names and aliases (Bangalore/Bengaluru, Mumbai/Bombay, Delhi/New Delhi, etc.).
6. Keyword mapping: 'trek', 'treks', 'hikes' map to 'trails'; 'dog friendly' maps to allows_dogs = 1.
7. Always include 'name' and 'location' columns.
8. Limit results to 50 rows maximum.
"""
```

### 2. Universal Open LLM Routing with `litellm`
By utilizing `litellm`, the backend acts as a provider-agnostic router. Developers can seamlessly swap between **Google Gemini**, local open-weight models via **Ollama** (`ollama/llama3`), or cloud-hosted open models on **Groq** by changing a single environment variable:

```python
response = litellm.completion(
    model=self.model,
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ],
    temperature=0.0,
    max_tokens=300,
)
```

### 3. Read-Only SQL Execution Guard
To guarantee safety against prompt injections or accidental data mutation, the engine enforces strict read-only execution:
- Checks that queries strictly begin with `SELECT`.
- Parses and strips any surrounding markdown code fences.
- Wraps execution in standard `try/except sqlite3.Error` blocks with graceful, human-readable feedback.

### 4. Outdoor-Themed Micro-Frontend
The frontend was designed from scratch with a custom earth-tone design system:
- **Color Palette**: Forest moss greens (`#1d3818` to `#8dba7e`), bark browns, and soft sky accents.
- **Glassmorphic Search Bar**: Dynamic glow on focus with smooth micro-animations.
- **Dynamic Table Generation**: Headers and cell formatters are generated automatically from SQLite result keys, with custom badges for difficulty ratings and boolean values.

---

## Why Does Open Innovation Matter?

Open innovation and open-weight models represent a fundamental shift in how we build software for the real world:

1. **Local Privacy for Geolocation Data**: Outdoor apps frequently handle location data and personal habits (when you run, where you walk your dog). With open-source AI frameworks and open weights, users can run models completely offline via Ollama. Your queries never leave your device.
2. **Freedom from Proprietary Lock-in**: Closed AI APIs frequently deprecate models, shift rate limits, or adjust pricing without notice. Using open tools like `litellm`, SQLite, and open architectures ensures this project can run anywhere—even on a solar-powered Raspberry Pi at a trailhead.
3. **Community-Driven Curation**: Proprietary platforms monetize trails with paywalled reviews and sponsored ads. Open models and open databases empower communities to build independent, hyper-local discovery tools that serve people, not advertising algorithms.

---

## My Agent Session

This application was engineered collaboratively in an agentic coding session using DeepMind Antigravity:
- Scaffolded a complete full-stack monorepo from scratch in under 15 minutes.
- Implemented clean error recovery, resolving cross-platform PowerShell execution policies, Python dependency version resolution, and IDE virtual environment interpreter routing.
- Built end-to-end unit and compilation verifications with zero boilerplate placeholders.

---

## Prize Categories

- **Primary Challenge**: Week 1: Touch Grass
- **Featured Categories**: 
  - Best Use of Open-Source AI / Open Weights (`litellm`, multi-provider support including local Ollama/Llama)
  - Full-Stack Developer Experience (FastAPI + React 19 + Tailwind CSS)
