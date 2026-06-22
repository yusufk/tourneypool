import { useState, useEffect } from 'react'
import { SingleEliminationBracket, Match as BracketMatch, SVGViewer } from '@stradivarit/react-tournament-brackets'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Match { MatchNumber: number; RoundNumber: number; HomeTeam: string; AwayTeam: string; DateUtc: string }
interface Result { homeScore: number; awayScore: number }
interface Prediction { homeScore: number; awayScore: number }

export default function Bracket() {
  const [schedule, setSchedule] = useState<Match[]>([])
  const [results, setResults] = useState<Record<string, Result>>({})
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
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

  const roundMatches: Record<number, Match[]> = {}
  for (const m of knockout) {
    if (!roundMatches[m.RoundNumber]) roundMatches[m.RoundNumber] = []
    roundMatches[m.RoundNumber].push(m)
  }
  const rounds = [4, 5, 6, 7, 8].filter(r => roundMatches[r]?.length)

  const matches = knockout.map((m) => {
    const r = results[String(m.MatchNumber)]
    const pred = predictions[String(m.MatchNumber)]
    const nextRound = rounds[rounds.indexOf(m.RoundNumber) + 1]
    const nextMatches = nextRound ? roundMatches[nextRound] : []
    const posInRound = roundMatches[m.RoundNumber].indexOf(m)
    const nextMatch = nextMatches[Math.floor(posInRound / 2)]

    return {
      id: m.MatchNumber,
      name: pred ? `✓ ${m.MatchNumber}` : `M${m.MatchNumber}`,
      nextMatchId: nextMatch?.MatchNumber || null,
      tournamentRoundText: String(m.RoundNumber - 3),
      startTime: m.DateUtc,
      state: r ? 'DONE' : 'SCHEDULED',
      participants: [
        {
          id: m.HomeTeam,
          name: m.HomeTeam || 'TBD',
          resultText: r ? String(r.homeScore) : pred ? `(${pred.homeScore})` : '',
          isWinner: r ? r.homeScore > r.awayScore : false,
          status: r ? 'DONE' : null,
        },
        {
          id: m.AwayTeam,
          name: m.AwayTeam || 'TBD',
          resultText: r ? String(r.awayScore) : pred ? `(${pred.awayScore})` : '',
          isWinner: r ? r.awayScore > r.homeScore : false,
          status: r ? 'DONE' : null,
        }
      ]
    }
  })

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
      <div style={{ overflow: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', padding: '1rem' }}>
        <SingleEliminationBracket
          matches={matches}
          matchComponent={({ match, ...props }: any) => (
            <div onClick={() => {
              const m = knockout.find(k => k.MatchNumber === match.id)
              if (m && !results[String(m.MatchNumber)]) {
                setSelected(m)
                const pred = predictions[String(m.MatchNumber)]
                setHomeScore(pred ? String(pred.homeScore) : '')
                setAwayScore(pred ? String(pred.awayScore) : '')
              }
            }} style={{ cursor: results[String(match.id)] ? 'default' : 'pointer' }}>
              <BracketMatch match={match} {...props} />
            </div>
          )}
          svgWrapper={({ children, ...props }: any) => (
            <SVGViewer
              width={Math.min(1200, window.innerWidth - 40)}
              height={700}
              background="transparent"
              SVGBackground="transparent"
              {...props}
            >
              {children}
            </SVGViewer>
          )}
        />
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelected(null)}>
          <div style={{ background: '#1a2a1a', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', minWidth: 280 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Predict Match {selected.MatchNumber}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.9rem', width: 80, textAlign: 'right' }}>{selected.HomeTeam}</span>
              <input type="number" min="0" value={homeScore} onChange={e => setHomeScore(e.target.value)} style={{ width: 50, textAlign: 'center', padding: '0.4rem', borderRadius: '0.3rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <span>-</span>
              <input type="number" min="0" value={awayScore} onChange={e => setAwayScore(e.target.value)} style={{ width: 50, textAlign: 'center', padding: '0.4rem', borderRadius: '0.3rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <span style={{ fontSize: '0.9rem', width: 80 }}>{selected.AwayTeam}</span>
            </div>
            <button onClick={savePrediction} style={{ width: '100%', padding: '0.6rem', marginTop: '0.5rem' }}>Save Prediction</button>
          </div>
        </div>
      )}
    </div>
  )
}
