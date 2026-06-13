import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import fixtures from '../data/fixtures.json'
import { getFlagUrl } from '../data/flags'
import { loadLeaderboard, loadPoolLeaderboard, loadPredictions } from '../api'
import { useAuth } from '../components/AuthProvider'
import MatchModal from '../components/MatchModal'

const TAGLINES = [
  'May your predictions age better than your knees. 🦵',
  'Where overconfidence meets spreadsheets. 📊',
  "You miss 100% of the predictions you don't make. 🐸",
  'Bold predictions. Zero accountability. 🎯',
  'The only place where 0-0 is never boring. 😴',
  "Trust the process. Blame the ref. 🟨",
  'Group stage vibes. Knockout dreams. 💭',
]

interface Match {
  MatchNumber: number
  RoundNumber: number
  DateUtc: string
  Location: string
  HomeTeam: string
  AwayTeam: string
  Group: string | null
}

function getTodaysMatches() {
  const today = new Date().toISOString().split('T')[0]
  return (fixtures as Match[]).filter(f => f.DateUtc.startsWith(today) && f.Group)
}

export default function Home() {
  const todaysMatches = getTodaysMatches()
  const { player } = useAuth()
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [goat, setGoat] = useState<{ name: string; points: number } | null>(null)
  const [goatPool, setGoatPool] = useState<{ name: string; points: number } | null>(null)
  const [results, setResults] = useState<Record<string, { homeScore: number; awayScore: number }>>({})
  const [predictions, setPredictions] = useState<Record<string, { homeScore: number; awayScore: number }>>({})

  useEffect(() => {
    loadLeaderboard().then(lb => { if (lb.length) setGoat(lb[0]) })
    loadPoolLeaderboard().then(data => { if (data.leaderboard?.length) setGoatPool(data.leaderboard[0]) })
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/results`).then(r => r.ok ? r.json() : {}).then(setResults).catch(() => {})
    if (player) loadPredictions(player).then(setPredictions)
  }, [player])

  return (
    <div className="page home">
      <div className="home-hero">
        <h1>TourneyPool</h1>
        <h2>World Cup 2026 Predictor</h2>
        <p className="subtitle">{TAGLINES[Math.floor(Math.random() * TAGLINES.length)]}</p>
      </div>

      {todaysMatches.length > 0 && (
        <div className="today-section">
          <h2 className="today-title">Today's Matches</h2>
          <div className="today-matches">
            {todaysMatches.map(m => {
              const time = new Date(m.DateUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              const result = results[String(m.MatchNumber)]
              return (
                <div key={m.MatchNumber} className={`fixture-card${result ? ' fixture-completed' : ''}`} onClick={() => setSelectedMatch(m)}>
                  <img className="flag-bg flag-bg-left" src={getFlagUrl(m.HomeTeam)} alt="" />
                  <img className="flag-bg flag-bg-right" src={getFlagUrl(m.AwayTeam)} alt="" />
                  <div className="fixture-meta">
                    {m.Group && <span className="fixture-group">{m.Group}</span>}
                    <span className="fixture-date">{time}</span>
                  </div>
                  <div className="fixture-teams">
                    <span className="team">{m.HomeTeam}</span>
                    {result ? (
                      <span className="fixture-score">{result.homeScore} - {result.awayScore}</span>
                    ) : (
                      <span className="vs">vs</span>
                    )}
                    <span className="team">{m.AwayTeam}</span>
                  </div>
                  <div className="fixture-venue">{m.Location}</div>
                  {!result && predictions[String(m.MatchNumber)] && (
                    <span className="pred-badge">✓ {predictions[String(m.MatchNumber)].homeScore} - {predictions[String(m.MatchNumber)].awayScore}</span>
                  )}
                  {!result && !predictions[String(m.MatchNumber)] && (
                    <span className="pred-badge pred-missing">⚠ No prediction</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {(goat || goatPool) && (
        <div className="today-section">
          <h2 className="today-title">Today's Leaders</h2>
          <div className="goat-section">
            {goat && <div className="goat-card">🐐 <strong>{goat.name}</strong> · {goat.points} pts</div>}
            {goatPool && <div className="goat-card">🏆 <strong>{goatPool.name}</strong> · {goatPool.points} pts</div>}
          </div>
        </div>
      )}

      <div className="home-cards">
        <Link to="/fixtures" className="card">
          <h3>Fixtures</h3>
          <p>104 matches across 16 venues</p>
        </Link>
        <Link to="/predictions" className="card">
          <h3>Predict</h3>
          <p>Call the score before kickoff</p>
        </Link>
        <Link to="/leaderboard" className="card">
          <h3>Leaderboard</h3>
          <p>Who's the prediction GOAT?</p>
        </Link>
      </div>
      {selectedMatch && <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
    </div>
  )
}
