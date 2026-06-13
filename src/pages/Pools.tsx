import { useState, useEffect, useRef } from 'react'
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
  const [poolMembers, setPoolMembers] = useState<Record<string, { name: string; points: number }[]>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (player) loadPlayerPools(player).then(setMyPools)
    loadPoolLeaderboard().then(data => {
      setPoolBoard(data.leaderboard || [])
      setPoolMembers(data.poolMembers || {})
    })
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

      {myPools.length > 0 && Object.keys(poolMembers).length > 0 && (
        <>
          <h2 className="pool-table-title">Your Pool Rankings</h2>
          {myPools.filter(p => poolMembers[p]).map(pool => {
            const members = poolMembers[pool]
            const userIdx = members.findIndex(m => m.name === player)
            const isGoat = userIdx === 0 && members.length > 1
            return (
              <PoolTable key={pool} pool={pool} members={members} player={player} userIdx={userIdx} isGoat={isGoat} />
            )
          })}
        </>
      )}

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

function PoolTable({ pool, members, player, isGoat }: { pool: string; members: { name: string; points: number }[]; player: string | null; userIdx: number; isGoat: boolean }) {
  const rowRef = useRef<HTMLTableRowElement>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (rowRef.current) rowRef.current.scrollIntoView({ block: 'nearest' })
    if (isGoat) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3000) }
  }, [isGoat])

  return (
    <div className="pool-member-table">
      <h3>{pool} {showConfetti && '🎉🎊🏆'}</h3>
      <div className={`pool-member-scroll${members.length >= 10 ? ' pool-scrollable' : ''}`}>
        <table className="leaderboard-table">
          <thead><tr><th>#</th><th>Player</th><th>Pts</th></tr></thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.name} ref={m.name === player ? rowRef : undefined} className={m.name === player ? 'pool-mine' : ''}>
                <td>{i === 0 ? '🐐' : i + 1}</td>
                <td>{m.name}</td>
                <td>{m.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
