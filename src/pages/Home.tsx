import { useState, useEffect } from 'react'
import { getFlagUrl } from '../data/flags'
import { loadLeaderboard, loadPoolLeaderboard, loadPredictions } from '../api'
import { useAuth } from '../components/AuthProvider'
import MatchModal from '../components/MatchModal'

const TAGLINES = [
  'Why did the footballer bring string? To tie the score! 🧵',
  'VAR ruined my celebration and my marriage. 📺',
  'My predictions age like milk in a heatwave. 🥛',
  'I peaked in the group stage. It\'s been downhill since. 📉',
  'Why don\'t grasshoppers watch football? They prefer cricket! 🦗',
  'Offside is just society rejecting you early. 🚩',
  'My gut feeling has a losing record. 🫠',
  'I used to be a keeper... then the kids came along. 🧤',
  'Bold predictions, zero accountability. The dad way. 💪',
  'The family that predicts together, argues at braai together. 🔥',
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

function getTodaysMatches(matches: Match[]) {
  const today = new Date().toISOString().split('T')[0]
  return matches.filter(f => f.DateUtc.startsWith(today))
}

export default function Home() {
  const { player } = useAuth()
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [goat, setGoat] = useState<{ name: string; points: number } | null>(null)
  const [goatPool, setGoatPool] = useState<{ name: string; points: number } | null>(null)
  const [results, setResults] = useState<Record<string, { homeScore: number; awayScore: number }>>({})
  const [predictions, setPredictions] = useState<Record<string, { homeScore: number; awayScore: number }>>({})

  const API_BASE = import.meta.env.VITE_API_URL || ''

  useEffect(() => {
    fetch(`${API_BASE}/api/schedule`).then(r => r.ok ? r.json() : []).then(setAllMatches)
    loadLeaderboard().then(lb => { if (lb.length) setGoat(lb[0]) })
    loadPoolLeaderboard().then(data => { if (data.leaderboard?.length) setGoatPool(data.leaderboard[0]) })
    fetch(`${API_BASE}/api/results`).then(r => r.ok ? r.json() : {}).then(setResults).catch(() => {})
    if (player) loadPredictions(player).then(setPredictions)
  }, [player])

  const todaysMatches = getTodaysMatches(allMatches)

  return (
    <div className="page home">
      <div className="home-hero">
        <h1>FamilyPool</h1>
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

      {selectedMatch && <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
    </div>
  )
}
