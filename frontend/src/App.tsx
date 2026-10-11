import { useState, type FormEvent } from 'react'

/* ── Types ────────────────────────────────────────────────────────── */
interface ApiResponse {
  generated_sql: string
  results: Record<string, unknown>[]
  error?: string
}

/* ── Example queries shown as clickable chips ─────────────────────── */
const EXAMPLE_QUERIES = [
  'Show me easy trails under 3 miles with shade',
  'Parks in Austin that allow dogs',
  'Run clubs that meet on Saturday',
  'All trails in Atlanta, GA',
  'Parks with restrooms in New York',
]

/* ── Icon SVGs (inline for zero dependencies) ─────────────────────── */
function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
    </svg>
  )
}

function LeafIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21C7 17 3 13 3 8a5 5 0 0110 0h0a5 5 0 0110 0c0 5-4 9-9 13h-2z" />
    </svg>
  )
}

function TreeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l-7 8h4l-3 5h5v5h2v-5h5l-3-5h4L12 3z" />
    </svg>
  )
}

/* ── Loading dots component ──────────────────────────────────────── */
function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-2 py-16">
      <div className="w-3 h-3 rounded-full bg-moss-400 loading-dot" />
      <div className="w-3 h-3 rounded-full bg-moss-400 loading-dot" />
      <div className="w-3 h-3 rounded-full bg-moss-400 loading-dot" />
      <span className="ml-3 text-moss-300 text-sm font-medium">Searching the great outdoors…</span>
    </div>
  )
}

/* ── Format cell values for display ──────────────────────────────── */
function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  // Boolean-ish columns
  if (['has_shade', 'has_restrooms', 'allows_dogs'].includes(key)) {
    return value === 1 || value === true ? '✅ Yes' : '❌ No'
  }
  // Miles columns
  if (key.includes('miles') && typeof value === 'number') {
    return `${value} mi`
  }
  // Difficulty badge
  if (key === 'difficulty' && typeof value === 'string') {
    return value.charAt(0).toUpperCase() + value.slice(1)
  }
  return String(value)
}

/* ── Difficulty badge color ──────────────────────────────────────── */
function difficultyColor(val: string): string {
  switch (val.toLowerCase()) {
    case 'easy': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    case 'moderate': return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    case 'hard': return 'bg-red-500/20 text-red-300 border-red-500/30'
    default: return 'bg-moss-500/20 text-moss-300 border-moss-500/30'
  }
}

/* ── Pretty column header ────────────────────────────────────────── */
function prettyHeader(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ═══════════════════════════════════════════════════════════════════
   App Component
   ═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Record<string, unknown>[]>([])
  const [generatedSql, setGeneratedSql] = useState('')
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setError('')
    setResults([])
    setGeneratedSql('')
    setHasSearched(true)

    try {
      const res = await fetch('http://localhost:8000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      })

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`)
      }

      const data: ApiResponse = await res.json()

      setGeneratedSql(data.generated_sql)
      setResults(data.results)

      if (data.error) {
        setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  function handleExampleClick(q: string) {
    setQuestion(q)
  }

  const columns = results.length > 0 ? Object.keys(results[0]) : []

  return (
    <div className="min-h-screen bg-moss-900 text-white">
      {/* ── Hero Section ──────────────────────────────────────────── */}
      <header className="bg-hero-gradient relative overflow-hidden">
        {/* Decorative floating elements */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <LeafIcon className="absolute top-12 left-[10%] text-moss-600/20 w-16 h-16 animate-float" />
          <LeafIcon className="absolute top-24 right-[15%] text-moss-500/15 w-12 h-12 animate-float [animation-delay:1s]" />
          <LeafIcon className="absolute bottom-16 left-[25%] text-moss-600/10 w-20 h-20 animate-float [animation-delay:2s]" />
          <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-moss-500/5 rounded-full blur-3xl" />
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
          {/* Logo / Title */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-moss-400 to-moss-600 flex items-center justify-center shadow-lg shadow-moss-500/25">
              <TreeIcon />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-moss-200 via-moss-300 to-emerald-300 bg-clip-text text-transparent">
                Touch Grass
              </span>
            </h1>
          </div>

          <p className="text-moss-300/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Ask anything about local trails, parks, and run clubs.
            <br className="hidden md:block" />
            Our AI converts your question into a database query instantly.
          </p>

          {/* ── Search Bar ────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="search-glow flex items-center bg-moss-800/60 backdrop-blur-md border border-moss-600/30 rounded-2xl px-4 py-2 transition-all duration-300">
              <SearchIcon />
              <input
                id="search-input"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Show me easy trails under 3 miles with shade"
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-moss-400/60 px-3 py-2 text-lg"
              />
              <button
                id="search-button"
                type="submit"
                disabled={loading || !question.trim()}
                className="bg-gradient-to-r from-moss-500 to-moss-600 hover:from-moss-400 hover:to-moss-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-moss-500/20"
              >
                {loading ? 'Searching…' : 'Find'}
              </button>
            </div>
          </form>

          {/* ── Example Queries ────────────────────────────────────── */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-moss-400/50 text-xs uppercase tracking-wider mr-1">Try:</span>
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => handleExampleClick(q)}
                className="text-xs bg-moss-700/30 hover:bg-moss-600/40 border border-moss-600/20 hover:border-moss-500/30 text-moss-300 px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Results Section ───────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Loading State */}
        {loading && <LoadingDots />}

        {/* Error State */}
        {error && !loading && (
          <div id="error-message" className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center mb-8">
            <p className="text-red-300 font-medium">⚠️ {error}</p>
            <p className="text-red-400/60 text-sm mt-1">Try rephrasing your question or check that the backend is running.</p>
          </div>
        )}

        {/* Generated SQL */}
        {generatedSql && !loading && (
          <div id="sql-display" className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-moss-400 animate-pulse" />
              <h2 className="text-sm font-semibold text-moss-300 uppercase tracking-wider">Generated SQL</h2>
            </div>
            <div className="bg-moss-800/40 backdrop-blur-sm border border-moss-600/20 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-moss-800/60 border-b border-moss-600/15">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                <span className="text-moss-400/50 text-xs ml-2 font-mono">SQLite</span>
              </div>
              <pre className="p-4 text-sm font-mono text-moss-200 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                <code>{generatedSql}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && !loading && (
          <div id="results-table">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <h2 className="text-sm font-semibold text-moss-300 uppercase tracking-wider">
                  Results
                </h2>
              </div>
              <span className="text-moss-400/60 text-xs bg-moss-800/40 px-3 py-1 rounded-full">
                {results.length} {results.length === 1 ? 'row' : 'rows'} found
              </span>
            </div>

            <div className="bg-moss-800/30 backdrop-blur-sm border border-moss-600/15 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-moss-800/60 border-b border-moss-600/20">
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="text-left px-5 py-3.5 text-moss-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap"
                        >
                          {prettyHeader(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-moss-700/20">
                    {results.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-moss-700/15 transition-colors duration-150"
                      >
                        {columns.map((col) => (
                          <td key={col} className="px-5 py-3.5 whitespace-nowrap">
                            {col === 'difficulty' && typeof row[col] === 'string' ? (
                              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${difficultyColor(row[col] as string)}`}>
                                {formatCell(col, row[col])}
                              </span>
                            ) : (
                              <span className={
                                col === 'name'
                                  ? 'text-white font-medium'
                                  : 'text-moss-300/80'
                              }>
                                {formatCell(col, row[col])}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {hasSearched && !loading && !error && results.length === 0 && generatedSql && (
          <div id="empty-state" className="text-center py-16">
            <div className="text-5xl mb-4">🏕️</div>
            <p className="text-moss-300 font-medium text-lg">No results found</p>
            <p className="text-moss-400/60 text-sm mt-1">
              Try a different question — there's always more nature to explore!
            </p>
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-moss-700/20 py-8 text-center">
        <p className="text-moss-500/40 text-xs">
          Touch Grass · Text-to-SQL · Powered by AI 🌿
        </p>
      </footer>
    </div>
  )
}
