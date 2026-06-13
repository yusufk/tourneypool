import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthProvider'
import { loadPlayerPools, savePlayerPools, loadPoolLeaderboard } from '../api'

const ALL_POOLS = [
  'Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta',
  'Engineering', 'Design', 'Marketing', 'Sales', 'Product', 'Operations',
  'Squad-Frontend', 'Squad-Backend', 'Squad-Mobile', 'Squad-Platform', 'Squad-Data',
]

export default function Pools() {
  const { player } = useAuth()
  const [myPools, setMyPools] = useState<string[]>([])
  const [poolBoard, setPoolBoard] = useState<{ name: string; points: number; members: number }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (player) loadPlayerPools(player).then(setMyPools)
    loadPoolLeaderboard().then(setPoolBoard)
  }, [player])

  const toggle = async (pool: string) => {
    if (!player) return
    const updated = myPools.includes(pool) ? myPools.filter(p => p !== pool) : [...myPools, pool]
    setMyPools(updated)
    setSaving(true)
    await savePlayerPools(player, updated)
    setSaving(false)
  }

  return (
    <div className="page pools">
      <h1>💀 Pools</h1>
      <p className="subtitle">Join pools to compete as a team {saving && '— saving...'}</p>

      <div className="pool-grid">
        {ALL_POOLS.map(pool => (
          <button key={pool} className={`pool-chip ${myPools.includes(pool) ? 'pool-active' : ''}`} onClick={() => toggle(pool)}>
            {myPools.includes(pool) ? '✓ ' : ''}{pool}
          </button>
        ))}
      </div>

      {poolBoard.length > 0 && (
        <>
          <h2 className="pool-table-title">💀 Pool Standings</h2>
          <table className="leaderboard-table">
            <thead>
              <tr><th>#</th><th>Pool</th><th>Pts</th><th>Members</th><th>Avg</th></tr>
            </thead>
            <tbody>
              {poolBoard.map((p, i) => (
                <tr key={p.name} className={myPools.includes(p.name) ? 'pool-mine' : ''}>
                  <td>{i === 0 ? '🐐' : i + 1}</td>
                  <td>{p.name}</td>
                  <td>{p.points}</td>
                  <td>{p.members}</td>
                  <td>{p.members ? (p.points / p.members).toFixed(1) : '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
