import { useState, useEffect } from 'react'
import { getFlagUrl } from '../data/flags'
import Bracket from '../components/Bracket'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface TeamEntry {
  team: { name: string; shortName: string; crest: string }
  position: number
  playedGames: number
  won: number
  draw: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

interface StandingsGroup {
  group: string
  table: TeamEntry[]
}

const ALIASES: Record<string, string> = {
  'Bosnia-H.': 'Bosnia and Herzegovina', 'Turkey': 'Türkiye', 'Ivory Coast': "Côte d'Ivoire",
  'Curacao': 'Curaçao', 'DR Congo': 'Congo DR', 'Iran': 'IR Iran', 'Cape Verde': 'Cabo Verde',
}

function teamName(entry: TeamEntry): string {
  const name = entry.team.shortName || entry.team.name
  return ALIASES[name] || name
}

export default function Standings() {
  const [standings, setStandings] = useState<StandingsGroup[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/api/standings`).then(r => r.ok ? r.json() : []).then(setStandings).catch(() => {})
  }, [])

  const groups = standings.filter(s => s.group?.startsWith('Group'))

  if (!groups.length) return (
    <div className="page groups">
      <h1>🏆 Standings</h1>
      <p className="subtitle">Standings will appear once group matches begin.</p>
    </div>
  )

  return (
    <div className="page groups">
      <h1>🏆 Standings</h1>
      <div className="groups-grid">
        {groups.map(g => (
          <div key={g.group} className="group-card">
            <h3>{g.group}</h3>
            <table className="group-table">
              <thead>
                <tr><th></th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
              </thead>
              <tbody>
                {g.table.map((row, i) => (
                  <tr key={row.team.name} className={i < 2 ? 'qualify' : i === 2 ? 'third' : ''}>
                    <td><img src={getFlagUrl(teamName(row))} alt="" className="group-flag" /></td>
                    <td className="group-team-name">{teamName(row)}</td>
                    <td>{row.playedGames}</td>
                    <td>{row.won}</td>
                    <td>{row.draw}</td>
                    <td>{row.lost}</td>
                    <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                    <td className="group-pts">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <h2 style={{ marginTop: '3rem', marginBottom: '1rem' }}>🏟️ Knockout Bracket</h2>
      <Bracket />
    </div>
  )
}
