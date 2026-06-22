import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Match { MatchNumber: number; RoundNumber: number; HomeTeam: string; AwayTeam: string; DateUtc: string }
interface Result { homeScore: number; awayScore: number }

const ROUND_NAMES: Record<number, string> = { 4: 'Round of 32', 5: 'Round of 16', 6: 'Quarter-Finals', 7: 'Semi-Finals', 8: 'Final' }
const MATCH_H = 44 // height of one match card
const GAP = 8 // gap between R32 matches
const COL_W = 200 // width per round column

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
  const roundMatches: Record<number, Match[]> = {}
  for (const m of knockout) {
    if (!roundMatches[m.RoundNumber]) roundMatches[m.RoundNumber] = []
    roundMatches[m.RoundNumber].push(m)
  }

  // Calculate Y positions: R32 items stacked with GAP, later rounds centered between pairs
  const positions: Record<number, number[]> = {}
  const r32Count = roundMatches[4]?.length || 16
  positions[4] = Array.from({ length: r32Count }, (_, i) => i * (MATCH_H + GAP))

  for (let ri = 1; ri < rounds.length; ri++) {
    const round = rounds[ri]
    const prevPositions = positions[rounds[ri - 1]] || []
    const count = roundMatches[round]?.length || 0
    positions[round] = []
    for (let i = 0; i < count; i++) {
      const top = prevPositions[i * 2] ?? 0
      const bot = prevPositions[i * 2 + 1] ?? top
      positions[round].push((top + bot + MATCH_H) / 2 - MATCH_H / 2)
    }
  }

  const totalH = r32Count * (MATCH_H + GAP)
  const totalW = rounds.length * COL_W + 120

  // Champion position
  const finalY = positions[8]?.[0] ?? totalH / 2 - MATCH_H / 2

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
        <div className="bk-tree" style={{ width: totalW, height: totalH }}>
          {rounds.map((round, ri) => {
            const matches = roundMatches[round] || []
            return matches.map((m, mi) => {
              const r = results[String(m.MatchNumber)]
              const pred = predictions[String(m.MatchNumber)]
              const x = ri * COL_W
              const y = positions[round][mi] ?? 0
              return (
                <div key={m.MatchNumber} className="bk-seat" style={{ position: 'absolute', left: x, top: y + 24 }}>
                  {mi === 0 && <div className="bk-round-title" style={{ position: 'absolute', top: -22, width: 170 }}>{ROUND_NAMES[round]}</div>}
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
            })
          })}
          {/* Champion */}
          <div className="bk-winner" style={{ position: 'absolute', left: rounds.length * COL_W, top: finalY + 24 }}>
            <div className="bk-winner-label">🏆</div>
            <div className="bk-winner-name">{(() => {
              const f = knockout.find(m => m.RoundNumber === 8)
              const fr = f ? results[String(f.MatchNumber)] : null
              return fr ? (fr.homeScore > fr.awayScore ? f!.HomeTeam : f!.AwayTeam) : '?'
            })()}</div>
          </div>
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
