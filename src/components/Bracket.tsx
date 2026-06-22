import { useState, useEffect } from 'react'
import { getFlagUrl } from '../data/flags'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Match { MatchNumber: number; RoundNumber: number; HomeTeam: string; AwayTeam: string; DateUtc: string }
interface Result { homeScore: number; awayScore: number }

const ROUND_NAMES: Record<number, string> = { 4: 'Round of 32', 5: 'Round of 16', 6: 'Quarter-Finals', 7: 'Semi-Finals', 8: 'Final' }

function isPlaceholder(team: string) {
  return !team || team === 'To be announced' || /^\d[A-L]$/.test(team) || /^3[A-Z]{4,}$/.test(team)
}

function MatchCard({ match, result }: { match: Match; result?: Result }) {
  const hp = isPlaceholder(match.HomeTeam), ap = isPlaceholder(match.AwayTeam)
  const hw = result && result.homeScore > result.awayScore
  const aw = result && result.awayScore > result.homeScore
  return (
    <div className="bk-match">
      <div className={`bk-team${hw ? ' win' : ''}${hp ? ' tbd' : ''}`}>
        {!hp && <img src={getFlagUrl(match.HomeTeam)} alt="" className="bk-flag" />}
        <span className="bk-name">{match.HomeTeam}</span>
        {result && <span className="bk-score">{result.homeScore}</span>}
      </div>
      <div className={`bk-team${aw ? ' win' : ''}${ap ? ' tbd' : ''}`}>
        {!ap && <img src={getFlagUrl(match.AwayTeam)} alt="" className="bk-flag" />}
        <span className="bk-name">{match.AwayTeam}</span>
        {result && <span className="bk-score">{result.awayScore}</span>}
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
    <div className="bk-scroll">
      <div className="bk-bracket">
        {rounds.map((round, ri) => {
          const matches = knockout.filter(m => m.RoundNumber === round)
          if (!matches.length) return null
          return (
            <div key={round} className={`bk-round bk-r${round}`}>
              <div className="bk-round-title">{ROUND_NAMES[round]}</div>
              <div className="bk-col">
                {matches.map((m) => (
                  <div key={m.MatchNumber} className="bk-slot">
                    <MatchCard match={m} result={results[String(m.MatchNumber)]} />
                    {ri < rounds.length - 1 && <div className="bk-connector" />}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
