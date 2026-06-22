import { useState, useEffect } from 'react'
import { getFlagUrl } from '../data/flags'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Match {
  MatchNumber: number
  RoundNumber: number
  HomeTeam: string
  AwayTeam: string
  DateUtc: string
}

interface Result { homeScore: number; awayScore: number }

const ROUND_NAMES: Record<number, string> = { 4: 'Round of 32', 5: 'Round of 16', 6: 'Quarter-Finals', 7: 'Semi-Finals', 8: 'Final' }

function isPlaceholder(team: string) {
  return !team || team === 'To be announced' || /^\d[A-L]$/.test(team) || /^3[A-Z]{4,}$/.test(team)
}

function MatchCard({ match, result }: { match: Match; result?: Result }) {
  const homePlaceholder = isPlaceholder(match.HomeTeam)
  const awayPlaceholder = isPlaceholder(match.AwayTeam)
  const homeWin = result && result.homeScore > result.awayScore
  const awayWin = result && result.awayScore > result.homeScore

  return (
    <div className="bracket-match">
      <div className={`bracket-team ${homeWin ? 'winner' : ''} ${homePlaceholder ? 'placeholder' : ''}`}>
        {!homePlaceholder && <img src={getFlagUrl(match.HomeTeam)} alt="" className="bracket-flag" />}
        <span className="bracket-name">{match.HomeTeam}</span>
        {result && <span className="bracket-score">{result.homeScore}</span>}
      </div>
      <div className={`bracket-team ${awayWin ? 'winner' : ''} ${awayPlaceholder ? 'placeholder' : ''}`}>
        {!awayPlaceholder && <img src={getFlagUrl(match.AwayTeam)} alt="" className="bracket-flag" />}
        <span className="bracket-name">{match.AwayTeam}</span>
        {result && <span className="bracket-score">{result.awayScore}</span>}
      </div>
    </div>
  )
}

export default function Bracket() {
  const [schedule, setSchedule] = useState<Match[]>([])
  const [results, setResults] = useState<Record<string, Result>>({})

  useEffect(() => {
    fetch(`${API_BASE}/api/schedule`).then(r => r.ok ? r.json() : []).then(setSchedule)
    fetch(`${API_BASE}/api/results`).then(r => r.ok ? r.json() : {}).then(setResults)
  }, [])

  const knockout = schedule.filter(m => m.RoundNumber >= 4)
  if (!knockout.length) return <p className="subtitle">Knockout bracket appears after group stage.</p>

  const rounds = [4, 5, 6, 7, 8]

  return (
    <div className="bracket-container">
      <div className="bracket-scroll">
        <div className="bracket">
          {rounds.map(round => {
            const matches = knockout.filter(m => m.RoundNumber === round)
            if (!matches.length) return null
            return (
              <div key={round} className="bracket-round">
                <h4 className="bracket-round-title">{ROUND_NAMES[round]}</h4>
                <div className="bracket-matches">
                  {matches.map(m => (
                    <MatchCard key={m.MatchNumber} match={m} result={results[String(m.MatchNumber)]} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
