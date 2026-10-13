import { useState, useEffect, type FormEvent } from 'react'
import LeafletMap, { type OutdoorItem } from './components/LeafletMap'

/* ── Types ────────────────────────────────────────────────────────── */
interface ApiResponse {
  generated_sql: string
  results: Record<string, unknown>[]
  error?: string
}

/* ── Suggested query chips ────────────────────────────────────────── */
const EXAMPLE_QUERIES = [
  'Easy shaded trails in Bengaluru under 5 km',
  'Parks in Mumbai and Delhi that allow dogs',
  'Run clubs in Mumbai and Pune that meet on Sunday',
  'Scenic treks and trails near Pune and Lonavala',
  'Parks with restrooms in New Delhi and Bengaluru',
]

const QUICK_CATEGORIES = [
  { label: 'All Outdoors', icon: '🌿', query: 'Show all trails, parks, and run clubs in India' },
  { label: 'Treks & Trails', icon: '🥾', query: 'Show all scenic trails and treks with difficulty and length' },
  { label: 'Parks & Gardens', icon: '🌳', query: 'Show parks and gardens with restrooms and shade' },
  { label: 'Run Clubs', icon: '🏃', query: 'Show all local run clubs and their meeting days' },
  { label: 'Dog Friendly', icon: '🐕', query: 'Show parks that allow dogs' },
]

/* ── Icons ────────────────────────────────────────────────────────── */
function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-moss-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
    </svg>
  )
}

function TreeIcon() {
  return (
    <svg className="w-6 h-6 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l-7 8h4l-3 5h5v5h2v-5h5l-3-5h4L12 3z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

/* ── Loading Animation ────────────────────────────────────────────── */
function LoadingDots() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 bg-moss-900/40 rounded-2xl border border-moss-700/20 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 loading-dot" />
        <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 loading-dot" />
        <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 loading-dot" />
      </div>
      <span className="text-moss-200 text-sm font-medium tracking-wide">
        Converting your question to SQL & searching India outdoor spots…
      </span>
    </div>
  )
}

/* ── Format cell values ───────────────────────────────────────────── */
function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (['has_shade', 'has_restrooms', 'allows_dogs'].includes(key)) {
    return value === 1 || value === true ? '✅ Yes' : '❌ No'
  }
  if ((key.includes('km') || key.includes('distance') || key.includes('length')) && typeof value === 'number') {
    return `${value} km`
  }
  if (key === 'difficulty' && typeof value === 'string') {
    return value.charAt(0).toUpperCase() + value.slice(1)
  }
  return String(value)
}

function difficultyColor(val: string): string {
  switch (val.toLowerCase()) {
    case 'easy':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    case 'moderate':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    case 'hard':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    default:
      return 'bg-moss-500/20 text-moss-300 border-moss-500/40'
  }
}

function prettyHeader(key: string): string {
  if (key === 'length_km') return 'Length (km)'
  if (key === 'distance_km') return 'Distance (km)'
  if (key === 'has_shade') return 'Shaded'
  if (key === 'has_restrooms') return 'Restrooms'
  if (key === 'allows_dogs') return 'Dog Friendly'
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ═══════════════════════════════════════════════════════════════════
   Main App Component
   ═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Record<string, unknown>[]>([])
  const [generatedSql, setGeneratedSql] = useState('')
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedItem, setSelectedItem] = useState<OutdoorItem | null>(null)
  const [viewMode, setViewMode] = useState<'split' | 'cards' | 'table' | 'map'>('split')
  const [copied, setCopied] = useState(false)
  const [showSql, setShowSql] = useState(true)

  // Auto-search a pleasant default on first visit so the map starts alive!
  useEffect(() => {
    handleSearch('Show all scenic trails and parks in Bengaluru and Mumbai')
  }, [])

  async function handleSearch(queryText: string) {
    if (!queryText.trim()) return

    setLoading(true)
    setError('')
    setSelectedItem(null)
    setHasSearched(true)

    try {
      const res = await fetch('http://localhost:8000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText.trim() }),
      })

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`)
      }

      const data: ApiResponse = await res.json()
      setGeneratedSql(data.generated_sql || '')
      setResults(data.results || [])

      if (data.error) {
        setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to the backend server. Is uvicorn running on port 8000?')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    handleSearch(question)
  }

  function handleExampleClick(q: string) {
    setQuestion(q)
    handleSearch(q)
  }

  function handleCopySql() {
    if (!generatedSql) return
    navigator.clipboard.writeText(generatedSql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Cast results to OutdoorItem[] for map
  const outdoorItems: OutdoorItem[] = results.map((r, i) => ({
    id: (r.id as string | number) || i,
    name: String(r.name || 'Outdoor Spot'),
    location: r.location as string | undefined,
    latitude: typeof r.latitude === 'number' ? r.latitude : undefined,
    longitude: typeof r.longitude === 'number' ? r.longitude : undefined,
    difficulty: r.difficulty as string | undefined,
    length_km: typeof r.length_km === 'number' ? r.length_km : undefined,
    distance_km: typeof r.distance_km === 'number' ? r.distance_km : undefined,
    has_shade: r.has_shade as number | boolean | undefined,
    has_restrooms: r.has_restrooms as number | boolean | undefined,
    allows_dogs: r.allows_dogs as number | boolean | undefined,
    meeting_day: r.meeting_day as string | undefined,
    ...r,
  }))

  const columns = results.length > 0 ? Object.keys(results[0]) : []

  return (
    <div className="min-h-screen bg-moss-950 text-white selection:bg-emerald-500 selection:text-white">
      {/* ── Top Header & Hero ─────────────────────────────────────── */}
      <header className="bg-hero-gradient relative overflow-hidden border-b border-moss-800/60 pb-14 pt-10">
        {/* Glowing background blurs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Brand Pill & Title */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-moss-800/80 border border-moss-600/40 text-emerald-300 text-xs font-medium mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Open-Source Text-to-SQL + Leaflet Geospatial Engine</span>
            <span className="text-moss-400">·</span>
            <span className="text-white font-semibold">India 🇮🇳</span>
          </div>

          <div className="flex items-center justify-center gap-3.5 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-moss-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 border border-emerald-400/30">
              <TreeIcon />
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              Touch Grass{' '}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-moss-200 bg-clip-text text-transparent">
                India
              </span>
            </h1>
          </div>

          <p className="text-moss-200/90 text-base md:text-lg max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
            Discover local trails, scenic treks, parks, and run clubs in seconds.
            <br className="hidden md:inline" />
            Ask in plain English — our AI turns it into SQL and maps the spots immediately.
          </p>

          {/* ── Search Bar ────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-5">
            <div className="search-glow flex items-center bg-moss-900/80 backdrop-blur-md border border-moss-600/40 rounded-2xl p-2 pl-4 transition-all duration-300 shadow-xl shadow-black/30">
              <SearchIcon />
              <input
                id="search-input"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Easy trails under 5 km in Bengaluru with shade, or dog parks in Mumbai"
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-moss-400/60 px-3 py-2 text-base md:text-lg font-medium"
              />
              {question && (
                <button
                  type="button"
                  onClick={() => setQuestion('')}
                  className="text-moss-400 hover:text-white px-2 py-1 text-sm font-semibold transition"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
              <button
                id="search-button"
                type="submit"
                disabled={loading || !question.trim()}
                className="bg-gradient-to-r from-emerald-500 to-moss-500 hover:from-emerald-400 hover:to-moss-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 active:scale-95 shadow-md shadow-emerald-500/25 flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Querying…</span>
                  </>
                ) : (
                  <span>Explore</span>
                )}
              </button>
            </div>
          </form>

          {/* ── Quick Categories Pills ─────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {QUICK_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => handleExampleClick(cat.query)}
                className="text-xs flex items-center gap-1.5 bg-moss-900/60 hover:bg-emerald-950/80 border border-moss-700/50 hover:border-emerald-500/50 text-moss-200 hover:text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium"
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* ── Example Suggestion Chips ───────────────────────────── */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
            <span className="text-moss-400/60 font-semibold uppercase tracking-wider text-[11px] mr-1">
              Popular:
            </span>
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleExampleClick(q)}
                className="bg-moss-800/40 hover:bg-moss-700/50 text-moss-300 hover:text-emerald-300 px-2.5 py-1 rounded-lg border border-moss-700/30 transition-all cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main App Content ──────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Loading Spinner */}
        {loading && <LoadingDots />}

        {/* Error Banner */}
        {error && !loading && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 mb-8 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-rose-200 font-semibold">{error}</p>
              <p className="text-rose-300/70 text-xs mt-1">
                Make sure the backend is active on <code className="bg-rose-950/60 px-1.5 py-0.5 rounded text-rose-200">http://localhost:8000</code> with your Gemini/LLM API key set.
              </p>
            </div>
          </div>
        )}

        {/* ── Generated SQL Accordion ───────────────────────────────── */}
        {generatedSql && !loading && (
          <div className="mb-6 bg-moss-900/70 border border-moss-700/40 rounded-2xl overflow-hidden backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between px-5 py-3 bg-moss-900/90 border-b border-moss-700/40">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1.5 ml-2">
                  <span>⚡ AI Generated SQLite Query</span>
                </span>
                <span className="text-[11px] bg-moss-800/80 text-moss-300 px-2 py-0.5 rounded-full border border-moss-600/30 font-mono">
                  {results.length} {results.length === 1 ? 'row' : 'rows'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1 text-xs text-moss-300 hover:text-white bg-moss-800/60 hover:bg-moss-700/70 px-2.5 py-1 rounded-lg border border-moss-700/40 transition"
                  title="Copy SQL query"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSql(!showSql)}
                  className="text-xs text-moss-400 hover:text-white transition px-2 py-1"
                >
                  {showSql ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {showSql && (
              <pre className="p-4 text-xs md:text-sm font-mono text-emerald-200/90 bg-moss-950/70 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                <code>{generatedSql}</code>
              </pre>
            )}
          </div>
        )}

        {/* ── View Mode Switcher & Results Header ───────────────────── */}
        {results.length > 0 && !loading && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-2 border-b border-moss-800/60">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Discovered Spots</span>
                <span className="text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  {results.length}
                </span>
              </h2>
              {selectedItem && (
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Clear Selection (Focusing: {selectedItem.name})
                </button>
              )}
            </div>

            {/* View Selector Tabs */}
            <div className="flex items-center bg-moss-900/90 p-1 rounded-xl border border-moss-700/50 text-xs font-medium self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'split' ? 'bg-emerald-600 text-white font-semibold shadow' : 'text-moss-300 hover:text-white'
                }`}
              >
                <span>🗺️</span>
                <span>Map + Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'cards' ? 'bg-emerald-600 text-white font-semibold shadow' : 'text-moss-300 hover:text-white'
                }`}
              >
                <span>🃏</span>
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'table' ? 'bg-emerald-600 text-white font-semibold shadow' : 'text-moss-300 hover:text-white'
                }`}
              >
                <span>📋</span>
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'map' ? 'bg-emerald-600 text-white font-semibold shadow' : 'text-moss-300 hover:text-white'
                }`}
              >
                <span>🌐</span>
                <span>Map Only</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Results Views ─────────────────────────────────────────── */}
        {results.length > 0 && !loading && (
          <div>
            {/* Split View: Map Left, Cards Right */}
            {viewMode === 'split' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Interactive Leaflet Map (sticky on desktop) */}
                <div className="lg:col-span-7 h-[480px] lg:h-[620px] lg:sticky lg:top-6">
                  <LeafletMap
                    items={outdoorItems}
                    selectedItem={selectedItem}
                    onSelectItem={(item) => setSelectedItem(item)}
                  />
                </div>

                {/* Right: Cards List */}
                <div className="lg:col-span-5 space-y-3.5 max-h-[620px] overflow-y-auto pr-1">
                  {outdoorItems.map((item, idx) => (
                    <SpotCard
                      key={item.id || idx}
                      item={item}
                      isSelected={selectedItem?.name === item.name}
                      onSelect={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Cards Only View */}
            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {outdoorItems.map((item, idx) => (
                  <SpotCard
                    key={item.id || idx}
                    item={item}
                    isSelected={selectedItem?.name === item.name}
                    onSelect={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            )}

            {/* Table Only View */}
            {viewMode === 'table' && (
              <div className="bg-moss-900/60 backdrop-blur-md border border-moss-700/40 rounded-2xl overflow-hidden shadow-xl shadow-black/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-moss-900/90 border-b border-moss-700/40">
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
                    <tbody className="divide-y divide-moss-800/40">
                      {results.map((row, i) => (
                        <tr
                          key={i}
                          onClick={() => {
                            const spot = outdoorItems.find((o) => o.name === row.name)
                            if (spot) setSelectedItem(spot)
                          }}
                          className={`hover:bg-moss-800/40 transition-colors cursor-pointer ${
                            selectedItem?.name === row.name ? 'bg-emerald-950/40 border-l-4 border-emerald-400' : ''
                          }`}
                        >
                          {columns.map((col) => (
                            <td key={col} className="px-5 py-3.5 whitespace-nowrap">
                              {col === 'difficulty' && typeof row[col] === 'string' ? (
                                <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${difficultyColor(row[col] as string)}`}>
                                  {formatCell(col, row[col])}
                                </span>
                              ) : col === 'name' ? (
                                <span className="text-white font-medium flex items-center gap-1.5">
                                  <span>{row[col] as string}</span>
                                </span>
                              ) : (
                                <span className="text-moss-200/80">{formatCell(col, row[col])}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Map Only View */}
            {viewMode === 'map' && (
              <div className="w-full h-[620px]">
                <LeafletMap
                  items={outdoorItems}
                  selectedItem={selectedItem}
                  onSelectItem={(item) => setSelectedItem(item)}
                />
              </div>
            )}
          </div>
        )}

        {/* Empty Search State */}
        {hasSearched && !loading && !error && results.length === 0 && generatedSql && (
          <div className="text-center py-16 bg-moss-900/30 border border-moss-800/40 rounded-2xl p-8">
            <div className="text-5xl mb-4">🏕️</div>
            <p className="text-white font-bold text-lg">No outdoor activities matched your filter</p>
            <p className="text-moss-300/70 text-sm max-w-md mx-auto mt-2">
              Try searching across Bengaluru, Mumbai, Pune, Delhi, Hyderabad, or Ooty with broader distances or categories.
            </p>
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-moss-800/60 py-10 mt-16 text-center text-xs text-moss-400/60">
        <p>Touch Grass India Edition · Powered by Google Gemini & Open-Source Leaflet 🌿🇮🇳</p>
      </footer>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Spot Card Component
   ═══════════════════════════════════════════════════════════════════ */
function SpotCard({
  item,
  isSelected,
  onSelect,
}: {
  item: OutdoorItem
  isSelected: boolean
  onSelect: () => void
}) {
  const isTrail = item.difficulty !== undefined || item.length_km !== undefined || String(item.name).toLowerCase().includes('trail') || String(item.name).toLowerCase().includes('trek')
  const isRunClub = item.meeting_day !== undefined || item.distance_km !== undefined || String(item.name).toLowerCase().includes('runner') || String(item.name).toLowerCase().includes('pacers')

  const badgeType = isTrail
    ? { icon: '🥾', label: 'Trail / Trek', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
    : isRunClub
    ? { icon: '🏃', label: 'Run Club', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
    : { icon: '🌳', label: 'Park & Garden', color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' }

  const googleMapsUrl = item.latitude && item.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ' ' + (item.location || 'India'))}`

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-2xl p-4 transition-all duration-200 cursor-pointer border backdrop-blur-md ${
        isSelected
          ? 'bg-moss-800/90 border-emerald-400/80 ring-2 ring-emerald-400/40 shadow-xl shadow-emerald-950/50'
          : 'bg-moss-900/60 hover:bg-moss-800/60 border-moss-700/40 hover:border-moss-600/60 shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeType.color}`}>
          <span>{badgeType.icon}</span>
          <span>{badgeType.label}</span>
        </span>

        {item.difficulty && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${difficultyColor(item.difficulty)}`}>
            {item.difficulty.toUpperCase()}
          </span>
        )}
      </div>

      <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors mb-1">
        {item.name}
      </h3>

      <p className="text-xs text-moss-300/90 flex items-center gap-1 mb-3">
        <span>📍</span>
        <span>{item.location || 'India'}</span>
      </p>

      {/* Feature Tags */}
      <div className="flex flex-wrap gap-1.5 text-[11px] mb-3">
        {item.length_km !== undefined && (
          <span className="bg-moss-800/70 border border-moss-700/40 text-moss-200 px-2 py-0.5 rounded-md font-mono">
            📏 {item.length_km} km
          </span>
        )}
        {item.distance_km !== undefined && (
          <span className="bg-moss-800/70 border border-moss-700/40 text-moss-200 px-2 py-0.5 rounded-md font-mono">
            🏃 {item.distance_km} km
          </span>
        )}
        {item.meeting_day && (
          <span className="bg-moss-800/70 border border-moss-700/40 text-amber-300 px-2 py-0.5 rounded-md">
            📅 {item.meeting_day}
          </span>
        )}
        {item.has_shade === 1 && (
          <span className="bg-moss-800/70 border border-moss-700/40 text-emerald-300 px-2 py-0.5 rounded-md">
            🌳 Shaded
          </span>
        )}
        {item.allows_dogs === 1 && (
          <span className="bg-moss-800/70 border border-moss-700/40 text-sky-300 px-2 py-0.5 rounded-md">
            🐕 Dog Friendly
          </span>
        )}
        {item.has_restrooms === 1 && (
          <span className="bg-moss-800/70 border border-moss-700/40 text-teal-300 px-2 py-0.5 rounded-md">
            🚻 Restrooms
          </span>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-moss-800/50 text-xs">
        <span className="text-emerald-400 group-hover:underline font-medium text-[11px] flex items-center gap-1">
          <span>🎯 Focus on Map</span>
        </span>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-moss-300 hover:text-white flex items-center gap-1 font-medium bg-moss-800/50 hover:bg-moss-700/60 px-2 py-1 rounded-md transition"
        >
          <span>Directions</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  )
}
