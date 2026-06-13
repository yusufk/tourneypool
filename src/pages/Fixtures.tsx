import { useState, useEffect } from 'react'
import fixtures from '../data/fixtures.json'
import { getFlagUrl } from '../data/flags'
import MatchModal from '../components/MatchModal'
import Countdown from '../components/Countdown'
import { useAuth } from '../components/AuthProvider'
import { loadPredictions } from '../api'

interface Match {
  MatchNumber: number
  RoundNumber: number
  DateUtc: string
  Location: string
  HomeTeam: string
  AwayTeam: string
  Group: string | null
  HomeTeamScore: number | null
  AwayTeamScore: number | null
}

const ROUND_NAMES: Record<number, string> = {
  1: 'Group Stage — Round 1',
  2: 'Group Stage — Round 2',
  3: 'Group Stage — Round 3',
  4: 'Round of 32',
  5: 'Round of 16',
  6: 'Quarter-Finals',
  7: 'Semi-Finals',
  8: 'Final',
}

function formatDate(utc: string): string {
  const d = new Date(utc)
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(utc: string): string {
  const d = new Date(utc)
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function Fixtures() {
  const { player } = useAuth()
  const allMatches = fixtures as Match[]
  const rounds = [...new Set(allMatches.map((f) => f.RoundNumber))].sort((a, b) => a - b)
  const [currentRound, setCurrentRound] = useState(rounds[0])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [results, setResults] = useState<Record<string, { homeScore: number; awayScore: number }>>({})
  const [predictions, setPredictions] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (player) loadPredictions(player).then(setPredictions)
    fetch(`${API_BASE}/api/leaderboard`).catch(() => {})
    // Fetch results by checking a known endpoint - reuse the results stored in KV
    fetch(`${API_BASE}/api/results`).then(r => r.ok ? r.json() : {}).then(setResults).catch(() => {})
  }, [])

  const roundMatches = allMatches.filter((f) => f.RoundNumber === currentRound)
  const roundIdx = rounds.indexOf(currentRound)

  return (
    <div className="page fixtures">
      <h1>📅 Fixtures</h1>
      <div className="round-nav">
        <button disabled={roundIdx === 0} onClick={() => setCurrentRound(rounds[roundIdx - 1])}>‹</button>
        <span className="round-nav-title">{ROUND_NAMES[currentRound] || `Round ${currentRound}`}</span>
        <button disabled={roundIdx === rounds.length - 1} onClick={() => setCurrentRound(rounds[roundIdx + 1])}>›</button>
      </div>
      <p className="subtitle">{roundMatches.length} matches</p>
      <div className="fixture-list">
        {roundMatches.map((f) => {
          const result = results[String(f.MatchNumber)]
          return (
            <div key={f.MatchNumber} className={`fixture-card${result ? ' fixture-completed' : ''}`} onClick={() => setSelectedMatch(f)}>
              <img className="flag-bg flag-bg-left" src={getFlagUrl(f.HomeTeam)} alt="" />
              <img className="flag-bg flag-bg-right" src={getFlagUrl(f.AwayTeam)} alt="" />
              <div className="fixture-meta">
                {f.Group && <span className="fixture-group">{f.Group}</span>}
                <span className="fixture-date">{formatDate(f.DateUtc)} • {formatTime(f.DateUtc)}</span>
              </div>
              <div className="fixture-teams">
                <span className="team">{f.HomeTeam}</span>
                {result ? (
                  <span className="fixture-score">{result.homeScore} - {result.awayScore}</span>
                ) : (
                  <span className="vs">vs</span>
                )}
                <span className="team">{f.AwayTeam}</span>
              </div>
              <div className="fixture-venue">{f.Location}</div>
              {!result && <Countdown dateUtc={f.DateUtc} />}
              {!result && predictions[String(f.MatchNumber)] && <span className="pred-badge">✓ Predicted</span>}
              {!result && !predictions[String(f.MatchNumber)] && <span className="pred-badge pred-missing">⚠ No prediction</span>}
            </div>
          )
        })}
      </div>
      {selectedMatch && <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
    </div>
  )
}
