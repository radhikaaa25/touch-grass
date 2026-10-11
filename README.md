# 🌿 Touch Grass — Text-to-SQL Outdoor Activities Finder

Ask natural language questions about local trails, parks, and run clubs. An AI agent converts your question into a SQL query, runs it against an SQLite database, and returns the results — all in a beautiful, outdoor-themed UI.

![Tech Stack](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Tech Stack](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Tech Stack](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Tech Stack](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

---

## 📁 Project Structure

```
touch-grass/
├── backend/
│   ├── main.py            # FastAPI app with /api/ask endpoint
│   ├── agent.py           # Text-to-SQL AI agent (litellm)
│   ├── database.py        # SQLite setup, seeding, schema helper
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
└── README.md
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
cd backend

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
cd frontend

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
  -d '{"question": "Show me easy trails under 3 miles with shade"}'
```

### Expected Response

```json
{
  "generated_sql": "SELECT name, difficulty, length_miles, has_shade, location FROM trails WHERE LOWER(difficulty) = 'easy' AND length_miles < 3 AND has_shade = 1",
  "results": [
    {
      "name": "Sunset Ridge Loop",
      "difficulty": "easy",
      "length_miles": 1.8,
      "has_shade": 1,
      "location": "Austin, TX"
    },
    {
      "name": "Lady Bird Lake Trail",
      "difficulty": "easy",
      "length_miles": 1.3,
      "has_shade": 1,
      "location": "Austin, TX"
    },
    {
      "name": "Piedmont Park Loop",
      "difficulty": "easy",
      "length_miles": 2.4,
      "has_shade": 1,
      "location": "Atlanta, GA"
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
| `trails`    | `id`, `name`, `difficulty`, `length_miles`, `has_shade`, `location` |
| `parks`     | `id`, `name`, `has_restrooms`, `allows_dogs`, `location`  |
| `run_clubs` | `id`, `name`, `meeting_day`, `distance_miles`, `location` |

The database is seeded with **20 rows** of realistic data across Austin TX, Atlanta GA, Los Angeles CA, Brooklyn NY, Manhattan NY, and Houston TX.

---

## ⚙️ Configuration

| Environment Variable | Default                    | Description                          |
| -------------------- | -------------------------- | ------------------------------------ |
| `GEMINI_API_KEY`     | —                          | API key for Google Gemini (free tier)|
| `GROQ_API_KEY`       | —                          | API key for Groq (optional)          |
| `OPENAI_API_KEY`     | —                          | API key for OpenAI models            |
| `ANTHROPIC_API_KEY`  | —                          | API key for Anthropic models         |
| `LLM_MODEL`         | `gemini/gemini-1.5-flash`  | litellm model identifier             |

See [litellm docs](https://docs.litellm.ai/docs/providers) for all supported providers.

---

## 📝 Example Questions

- "Show me easy trails under 3 miles with shade"
- "Parks in Austin that allow dogs"
- "Run clubs that meet on Saturday"
- "All trails in Atlanta, GA"
- "Parks with restrooms in New York"
- "What are the hardest trails?"
- "Find me a run club with a short distance"

---

## 📄 License

MIT
