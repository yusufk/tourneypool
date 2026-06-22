import { useState, useEffect } from 'react'
import { SingleEliminationBracket, Match as BracketMatch, SVGViewer } from '@stradivarit/react-tournament-brackets'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Match { MatchNumber: number; RoundNumber: number; HomeTeam: string; AwayTeam: string; DateUtc: string }
interface Result { homeScore: number; awayScore: number }

export default function Bracket() {
  const [schedule, setSchedule] = useState<Match[]>([])
  const [results, setResults] = useState<Record<string, Result>>({})

  useEffect(() => {
    fetch(`${API_BASE}/api/schedule`).then(r => r.ok ? r.json() : []).then(setSchedule)
    fetch(`${API_BASE}/api/results`).then(r => r.ok ? r.json() : {}).then(setResults)
  }, [])

  const knockout = schedule.filter(m => m.RoundNumber >= 4)
  if (!knockout.length) return <p className="subtitle">Knockout bracket appears after group stage.</p>

  // Convert to library's data format
  // The library needs a nested structure with nextMatchId
  // Round 4 = R32 (16 matches), Round 5 = R16 (8), Round 6 = QF (4), Round 7 = SF (2), Round 8 = Final (1)
  const roundMatches: Record<number, Match[]> = {}
  for (const m of knockout) {
    if (!roundMatches[m.RoundNumber]) roundMatches[m.RoundNumber] = []
    roundMatches[m.RoundNumber].push(m)
  }

  const rounds = [4, 5, 6, 7, 8].filter(r => roundMatches[r]?.length)

  const matches = knockout.map((m) => {
    const r = results[String(m.MatchNumber)]
    const nextRound = rounds[rounds.indexOf(m.RoundNumber) + 1]
    const nextMatches = nextRound ? roundMatches[nextRound] : []
    // Each pair of matches feeds into one next-round match
    const posInRound = roundMatches[m.RoundNumber].indexOf(m)
    const nextMatch = nextMatches[Math.floor(posInRound / 2)]

    return {
      id: m.MatchNumber,
      name: `Match ${m.MatchNumber}`,
      nextMatchId: nextMatch?.MatchNumber || null,
      tournamentRoundText: String(m.RoundNumber - 3),
      startTime: m.DateUtc,
      state: r ? 'DONE' : 'SCHEDULED',
      participants: [
        {
          id: m.HomeTeam,
          name: m.HomeTeam || 'TBD',
          resultText: r ? String(r.homeScore) : '',
          isWinner: r ? r.homeScore > r.awayScore : false,
          status: r ? 'DONE' : null,
        },
        {
          id: m.AwayTeam,
          name: m.AwayTeam || 'TBD',
          resultText: r ? String(r.awayScore) : '',
          isWinner: r ? r.awayScore > r.homeScore : false,
          status: r ? 'DONE' : null,
        }
      ]
    }
  })

  return (
    <div style={{ overflow: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', padding: '1rem' }}>
      <SingleEliminationBracket
        matches={matches}
        matchComponent={BracketMatch}
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
  )
}
