import { useState, useEffect } from 'react'
import fixtures from '../data/fixtures.json'
import { getFlagUrl } from '../data/flags'
import { useAuth } from '../components/AuthProvider'
import { savePredictions, loadPredictions } from '../api'
import Countdown from '../components/Countdown'

interface Match {
  MatchNumber: number
  RoundNumber: number
  DateUtc: string
  Location: string
  HomeTeam: string
  AwayTeam: string
  Group: string | null
}

interface Prediction {
  homeScore: number
  awayScore: number
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
  return new Date(utc).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Predictions() {
  const { player } = useAuth()
  const allMatches = fixtures as Match[]
  const rounds = [...new Set(allMatches.map((f) => f.RoundNumber))].sort((a, b) => a - b)
  const [currentRound, setCurrentRound] = useState(rounds[0])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [saving, setSaving] = useState(false)

  const roundMatches = allMatches.filter((f) => f.RoundNumber === currentRound)
  const roundIdx = rounds.indexOf(currentRound)

  useEffect(() => {
    if (player) {
      loadPredictions(player).then(setPredictions)
    }
  }, [player])

  const update = (matchNum: number, field: 'homeScore' | 'awayScore', value: string) => {
    setPredictions((prev) => ({
      ...prev,
      [matchNum]: { ...prev[matchNum], [field]: parseInt(value) || 0 },
    }))
  }

  const handleSave = async () => {
    if (!player) return
    setSaving(true)
    await savePredictions(player, predictions)
    setSaving(false)
    alert(`✅ ${Object.keys(predictions).length} predictions saved!`)
  }

  const count = Object.keys(predictions).length

  return (
    <div className="page predictions">
      <h1>🎯 My Predictions</h1>
      <div className="round-nav">
        <button disabled={roundIdx === 0} onClick={() => setCurrentRound(rounds[roundIdx - 1])}>‹</button>
        <span className="round-nav-title">{ROUND_NAMES[currentRound] || `Round ${currentRound}`}</span>
        <button disabled={roundIdx === rounds.length - 1} onClick={() => setCurrentRound(rounds[roundIdx + 1])}>›</button>
      </div>
      <p className="subtitle">{count} / {allMatches.length} total predicted • {roundMatches.length} matches this round</p>
      <div className="prediction-list">
        {roundMatches.map((m) => {
          const locked = new Date() >= new Date(m.DateUtc)
          return (
            <div key={m.MatchNumber} className={`prediction-card${locked ? ' prediction-locked' : ''}`}>
              <img className="flag-bg flag-bg-left" src={getFlagUrl(m.HomeTeam)} alt="" />
              <img className="flag-bg flag-bg-right" src={getFlagUrl(m.AwayTeam)} alt="" />
              <span className="pred-date">{formatDate(m.DateUtc)}{m.Group ? ` • ${m.Group}` : ''}{locked ? ' 🔒' : ''}</span>
              {!locked && <Countdown dateUtc={m.DateUtc} />}
              <div className="prediction-row">
                <span className="team">{m.HomeTeam}</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  disabled={locked}
                  value={predictions[m.MatchNumber]?.homeScore ?? ''}
                  onChange={(e) => update(m.MatchNumber, 'homeScore', e.target.value)}
                />
                <span className="vs">-</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  disabled={locked}
                  value={predictions[m.MatchNumber]?.awayScore ?? ''}
                  onChange={(e) => update(m.MatchNumber, 'awayScore', e.target.value)}
                />
                <span className="team">{m.AwayTeam}</span>
              </div>
            </div>
          )
        })}
      </div>
      <button className="save-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Predictions'}
      </button>
    </div>
  )
}
