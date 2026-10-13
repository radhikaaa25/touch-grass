# 🌿 Touch Grass (India Edition 🇮🇳) — Text-to-SQL Outdoor Activities Finder

Ask natural language questions about local trails, scenic treks, parks, and run clubs across India. An AI agent converts your question into a SQL query, runs it against an SQLite database, and returns the results — all in a beautiful, outdoor-themed UI.

![Tech Stack](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Tech Stack](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Tech Stack](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Tech Stack](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

---
<img width="1912" height="996" alt="image" src="https://github.com/user-attachments/assets/9be96ae0-bac8-4712-8205-a0b09bfa1960" />
<img width="1885" height="902" alt="image" src="https://github.com/user-attachments/assets/7d94145d-d024-45aa-a2cf-e71346762520" />

---

## 📁 Project Structure

```
touch-grass/
└── week1/
    ├── backend/
    │   ├── main.py            # FastAPI app with /api/ask endpoint
    │   ├── agent.py           # Text-to-SQL AI agent (litellm + self-healing retry)
    │   ├── database.py        # SQLite setup, Indian seed dataset, schema helper
    │   ├── requirements.txt   # Python dependencies
    │   └── outdoors.db        # Auto-generated SQLite database
    ├── frontend/
    │   ├── src/
    │   │   ├── App.tsx        # Main React component
    │   │   ├── main.tsx       # React entry point
    │   │   └── index.css      # Tailwind CSS + custom styles
    │   ├── index.html         # HTML shell
    │   ├── vite.config.ts     # Vite + React + Tailwind config
    │   ├── tsconfig.json      # TypeScript configuration
    │   └── package.json       # Node dependencies
    └── submission/
        └── SUBMISSION.md      # Hacktoberfest challenge submission writeup
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- A **free Google Gemini API key** from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (or OpenAI/Groq/Ollama)

### 1. Clone & Navigate

```bash
git clone <your-repo-url>
cd touch-grass
```

### 2. Backend Setup

```bash
cd week1/backend

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Set your Gemini API key (free at https://aistudio.google.com/apikey)
export GEMINI_API_KEY="AIzaSy..."    # Linux/macOS
# $env:GEMINI_API_KEY="AIzaSy..."   # Windows PowerShell

# (Optional) Use a different model/provider
# export LLM_MODEL="openai/gpt-4o-mini"    # requires OPENAI_API_KEY
# export LLM_MODEL="ollama/llama3"          # free, local, no key needed

# Start the API server
uvicorn main:app --reload
```

The backend runs at **http://localhost:8000**.  
The database is auto-created and seeded on first startup.

### 3. Frontend Setup

```bash
cd week1/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend runs at **http://localhost:5173**.

---

## 🧪 Test the API Directly

### cURL

```bash
curl -X POST http://localhost:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Show me easy trails under 5 km with shade"}'
```

### Expected Response

```json
{
  "generated_sql": "SELECT name, difficulty, length_km, has_shade, location FROM trails WHERE LOWER(difficulty) = 'easy' AND length_km < 5 AND has_shade = 1",
  "results": [
    {
      "name": "Turahalli Forest Trail",
      "difficulty": "easy",
      "length_km": 3.2,
      "has_shade": 1,
      "location": "Bengaluru, KA"
    },
    {
      "name": "Bannerghatta Nature Walk",
      "difficulty": "easy",
      "length_km": 2.8,
      "has_shade": 1,
      "location": "Bengaluru, KA"
    },
    {
      "name": "Kanheri Caves Nature Trail (SGNP)",
      "difficulty": "easy",
      "length_km": 3.5,
      "has_shade": 1,
      "location": "Mumbai, MH"
    },
    {
      "name": "ARAI Hills (Vetal Tekdi) Loop",
      "difficulty": "easy",
      "length_km": 3.0,
      "has_shade": 1,
      "location": "Pune, MH"
    }
  ],
  "error": null
}
```

### Health Check

```bash
curl http://localhost:8000/api/health
```

---

## 🗄️ Database Schema

| Table       | Columns                                                   |
| ----------- | --------------------------------------------------------- |
| `trails`    | `id`, `name`, `difficulty`, `length_km`, `has_shade`, `location` |
| `parks`     | `id`, `name`, `has_restrooms`, `allows_dogs`, `location`  |
| `run_clubs` | `id`, `name`, `meeting_day`, `distance_km`, `location`    |

The database is seeded with **49 realistic rows** across Bengaluru, Mumbai, Pune, New Delhi, Gurugram, Hyderabad, Chennai, Kolkata, Dharamshala, and Goa.

---

## ⚙️ Configuration

<<<<<<< HEAD
| Environment Variable | Default                    | Description                          |
| -------------------- | -------------------------- | ------------------------------------ |
| `GEMINI_API_KEY`     | —                          | API key for Google Gemini (free tier)|
| `GROQ_API_KEY`       | —                          | API key for Groq (optional)          |
| `OPENAI_API_KEY`     | —                          | API key for OpenAI models            |
| `ANTHROPIC_API_KEY`  | —                          | API key for Anthropic models         |
| `LLM_MODEL`         | `gemini/gemini-3.5-flash-lite` | litellm model identifier         |
=======
| Environment Variable | Default                        | Description                          |
| -------------------- | ------------------------------ | ------------------------------------ |
| `GEMINI_API_KEY`     | —                              | API key for Google Gemini (free tier)|
| `GROQ_API_KEY`       | —                              | API key for Groq (optional)          |
| `OPENAI_API_KEY`     | —                              | API key for OpenAI models            |
| `ANTHROPIC_API_KEY`  | —                              | API key for Anthropic models         |
| `LLM_MODEL`          | `gemini/gemini-3.5-flash-lite` | litellm model identifier             |
>>>>>>> aca39eafe4d2834d353b43ba6516429687ecac85

See [litellm docs](https://docs.litellm.ai/docs/providers) for all supported providers.

---

## 📝 Example Questions

- "Show me easy trails under 5 km with shade"
- "Parks in Bengaluru that allow dogs"
- "Run clubs in Mumbai that meet on Sunday"
- "Scenic treks and trails near Pune"
- "Parks with restrooms in New Delhi"
- "What are the hardest treks in the database?"
- "Find me a short 5k run club in Hyderabad or Chennai"

---

## 📄 License

MIT
