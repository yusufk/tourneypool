import { useState, useEffect } from 'react'
import { getFlag } from '../data/flags'
import { useAuth } from './AuthProvider'
import { savePredictions, loadPredictions } from '../api'
import { useCountdown } from '../hooks/useCountdown'

interface Match {
  MatchNumber: number
  RoundNumber: number
  DateUtc: string
  Location: string
  HomeTeam: string
  AwayTeam: string
  Group: string | null
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

export default function MatchModal({ match, onClose }: { match: Match; onClose: () => void }) {
  const { player } = useAuth()
  const d = new Date(match.DateUtc)
  const date = d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  const kickedOff = new Date() >= d
  const countdown = useCountdown(match.DateUtc)

  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [result, setResult] = useState<{ homeScore: number; awayScore: number } | null>(null)

  useEffect(() => {
    if (player) {
      loadPredictions(player).then((preds) => {
        const p = preds[match.MatchNumber]
        if (p) {
          setHome(String(p.homeScore ?? ''))
          setAway(String(p.awayScore ?? ''))
        }
      })
    }
    fetch('/api/api/results')
      .then(r => r.ok ? r.json() : {})
      .then((results: Record<string, { homeScore: number; awayScore: number }>) => {
        const r = results[String(match.MatchNumber)]
        if (r) setResult(r)
      })
      .catch(() => {})
  }, [player, match.MatchNumber])

  const handleSave = async () => {
    if (!player || kickedOff) return
    setSaving(true)
    await savePredictions(player, { [match.MatchNumber]: { homeScore: parseInt(home) || 0, awayScore: parseInt(away) || 0 } })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const outcome = (h: number, a: number) => h > a ? 'H' : h < a ? 'A' : 'D'

  const pts = (() => {
    if (!result || !home || !away) return 'none'
    const ph = parseInt(home), pa = parseInt(away)
    if (ph === result.homeScore && pa === result.awayScore) return 'exact'
    if (outcome(ph, pa) === outcome(result.homeScore, result.awayScore)) return 'correct'
    return 'zero'
  })()

  const getPointsLabel = () => {
    if (pts === 'exact') return '🎯 Exact! +3 pts'
    if (pts === 'correct') return '✅ Correct result! +1 pt'
    return '❌ 0 pts'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content${pts === 'exact' ? ' modal-confetti' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          {match.Group && <span className="fixture-group">{match.Group}</span>}
          <span className="modal-round">{ROUND_NAMES[match.RoundNumber]}</span>
        </div>
        <div className="modal-teams">
          <div className="modal-team">
            <span className="modal-flag">{getFlag(match.HomeTeam)}</span>
            <span>{match.HomeTeam}</span>
          </div>
          <span className="modal-vs">vs</span>
          <div className="modal-team">
            <span className="modal-flag">{getFlag(match.AwayTeam)}</span>
            <span>{match.AwayTeam}</span>
          </div>
        </div>
        <div className="modal-details">
          <div className="modal-detail">📅 {date}</div>
          <div className="modal-detail">⏰ {time} (SA time)</div>
          <div className="modal-detail">🏟️ {match.Location}</div>
          <div className="modal-detail modal-countdown">⏳ {countdown}</div>
        </div>
        {kickedOff ? (
          <div className="modal-locked">
            {result && (
              <div className="modal-result">
                <div className="modal-result-label">Final Score</div>
                <div className="modal-result-score">{result.homeScore} - {result.awayScore}</div>
              </div>
            )}
            {home && away && (
              <div className="modal-prediction-compare">
                <div className="modal-result-label">Your Prediction</div>
                <div className="modal-result-score">{home} - {away}</div>
                {result && <div className={`modal-points ${pts}`}>{getPointsLabel()}</div>}
              </div>
            )}
            {!result && <div className="modal-status">🔴 Kickoff passed — predictions locked</div>}
          </div>
        ) : (
          <div className="modal-predict">
            <div className="modal-predict-label">Your prediction</div>
            <div className="modal-predict-row">
              <input type="number" min="0" max="20" value={home} onChange={(e) => setHome(e.target.value)} placeholder="0" />
              <span className="vs">-</span>
              <input type="number" min="0" max="20" value={away} onChange={(e) => setAway(e.target.value)} placeholder="0" />
            </div>
            <button className="save-btn" onClick={handleSave} disabled={saving || kickedOff}>
              {saved ? '✅ Saved!' : saving ? 'Saving...' : 'Save Prediction'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
