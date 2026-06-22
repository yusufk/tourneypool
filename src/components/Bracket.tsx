import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Match { MatchNumber: number; RoundNumber: number; HomeTeam: string; AwayTeam: string; DateUtc: string }
interface Result { homeScore: number; awayScore: number }

const ROUND_NAMES: Record<number, string> = { 4: 'Round of 32', 5: 'Round of 16', 6: 'Quarter-Finals', 7: 'Semi-Finals', 8: 'Final' }

function isPlaceholder(t: string) { return !t || t === 'To be announced' || /^\d[A-L]$/.test(t) || /^3[A-Z]{4,}$/.test(t) }

export default function Bracket() {
  const [schedule, setSchedule] = useState<Match[]>([])
  const [results, setResults] = useState<Record<string, Result>>({})
  const [predictions, setPredictions] = useState<Record<string, any>>({})
  const [selected, setSelected] = useState<Match | null>(null)
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')

  const player = localStorage.getItem('tp_player') || ''
  const pin = localStorage.getItem('tp_pin') || ''

  useEffect(() => {
    fetch(`${API_BASE}/api/schedule`).then(r => r.ok ? r.json() : []).then(setSchedule)
    fetch(`${API_BASE}/api/results`).then(r => r.ok ? r.json() : {}).then(setResults)
    if (player) fetch(`${API_BASE}/api/predictions/${encodeURIComponent(player)}`).then(r => r.ok ? r.json() : {}).then(setPredictions)
  }, [])

  const knockout = schedule.filter(m => m.RoundNumber >= 4)
  if (!knockout.length) return <p className="subtitle">Knockout bracket appears after group stage.</p>

  const rounds = [4, 5, 6, 7, 8]

  async function savePrediction() {
    if (!selected || !player) return
    const body = { [selected.MatchNumber]: { homeScore: Number(homeScore), awayScore: Number(awayScore) } }
    await fetch(`${API_BASE}/api/predictions/${encodeURIComponent(player)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Pin': pin }, body: JSON.stringify(body)
    })
    setPredictions(p => ({ ...p, [selected.MatchNumber]: { homeScore: Number(homeScore), awayScore: Number(awayScore) } }))
    setSelected(null)
  }

  return (
    <div>
      <div className="bk-scroll">
        <div className="bk-tree">
          {rounds.map(round => {
            const matches = knockout.filter(m => m.RoundNumber === round)
            if (!matches.length) return null
            return (
              <div key={round} className="bk-round" data-round={round}>
                <div className="bk-round-title">{ROUND_NAMES[round]}</div>
                <div className="bk-round-body">
                  {matches.map(m => {
                    const r = results[String(m.MatchNumber)]
                    const pred = predictions[String(m.MatchNumber)]
                    return (
                      <div key={m.MatchNumber} className="bk-seat">
                        <div className={`bk-tie${pred ? ' predicted' : ''}`} onClick={() => {
                          if (!r) { setSelected(m); setHomeScore(pred?.homeScore ?? ''); setAwayScore(pred?.awayScore ?? '') }
                        }}>
                          <div className={`bk-side${r && r.homeScore > r.awayScore ? ' win' : ''}${isPlaceholder(m.HomeTeam) ? ' tbd' : ''}`}>
                            <span className="bk-name">{m.HomeTeam || 'TBD'}</span>
                            <span className="bk-score">{r ? r.homeScore : pred ? `(${pred.homeScore})` : ''}</span>
                          </div>
                          <div className={`bk-side${r && r.awayScore > r.homeScore ? ' win' : ''}${isPlaceholder(m.AwayTeam) ? ' tbd' : ''}`}>
                            <span className="bk-name">{m.AwayTeam || 'TBD'}</span>
                            <span className="bk-score">{r ? r.awayScore : pred ? `(${pred.awayScore})` : ''}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelected(null)}>
          <div style={{ background: '#1a2a1a', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', minWidth: 280 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Match {selected.MatchNumber}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', width: 70, textAlign: 'right' }}>{selected.HomeTeam}</span>
              <input type="number" min="0" value={homeScore} onChange={e => setHomeScore(e.target.value)} style={{ width: 45, textAlign: 'center', padding: '0.4rem', borderRadius: '0.3rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <span>-</span>
              <input type="number" min="0" value={awayScore} onChange={e => setAwayScore(e.target.value)} style={{ width: 45, textAlign: 'center', padding: '0.4rem', borderRadius: '0.3rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <span style={{ fontSize: '0.85rem', width: 70 }}>{selected.AwayTeam}</span>
            </div>
            <button onClick={savePrediction} style={{ width: '100%', padding: '0.6rem', marginTop: '0.5rem' }}>Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
