import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../components/AuthProvider'
import { loadPlayerPools, savePlayerPools, loadPoolLeaderboard } from '../api'

const DEFAULT_POOLS = ['South Africans', 'Joburgers']

export default function Pools() {
  const { player } = useAuth()
  const [myPools, setMyPools] = useState<string[]>([])
  const [allPools, setAllPools] = useState<string[]>(DEFAULT_POOLS)
  const [poolBoard, setPoolBoard] = useState<{ name: string; points: number; members: number }[]>([])
  const [poolMembers, setPoolMembers] = useState<Record<string, { name: string; points: number }[]>>({})
  const [saving, setSaving] = useState(false)
  const [newPool, setNewPool] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (player) loadPlayerPools(player).then(setMyPools)
    loadPoolLeaderboard().then(data => {
      setPoolBoard(data.leaderboard || [])
      setPoolMembers(data.poolMembers || {})
      // Merge any pools from the leaderboard into allPools
      const existing = new Set(DEFAULT_POOLS)
      for (const p of data.leaderboard || []) existing.add(p.name)
      setAllPools([...existing])
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

  const createPool = async () => {
    const name = newPool.trim()
    if (!name) return
    if (allPools.includes(name)) { setError('Pool already exists'); return }
    // Count user-created pools (pools not in DEFAULT_POOLS that user is in)
    const customCount = myPools.filter(p => !DEFAULT_POOLS.includes(p)).length
    if (customCount >= 3) { setError('Max 3 custom pools'); return }
    setError('')
    setAllPools(prev => [...prev, name])
    const updated = [...myPools, name]
    setMyPools(updated)
    setNewPool('')
    setSaving(true)
    await savePlayerPools(player!, updated)
    setSaving(false)
  }

  return (
    <div className="page pools">
      <h1>💀 Pools</h1>
      <p className="subtitle">Join pools to compete as a team {saving && '— saving...'}</p>

      <div className="pool-grid">
        {allPools.map(pool => (
          <button key={pool} className={`pool-chip ${myPools.includes(pool) ? 'pool-active' : ''}`} onClick={() => toggle(pool)}>
            {myPools.includes(pool) ? '✓ ' : ''}{pool}
          </button>
        ))}
      </div>

      <div className="create-pool">
        <h3>Create a Pool</h3>
        <div className="create-pool-row">
          <input type="text" placeholder="Pool name" value={newPool} onChange={e => setNewPool(e.target.value)} maxLength={30} onKeyDown={e => e.key === 'Enter' && createPool()} />
          <button onClick={createPool}>Create</button>
        </div>
        {error && <p className="sign-in-error">{error}</p>}
        <p className="subtitle">Max 3 custom pools per player</p>
      </div>

      {myPools.length > 0 && Object.keys(poolMembers).length > 0 && (
        <>
          <h2 className="pool-table-title">Your Pool Rankings</h2>
          {myPools.filter(p => poolMembers[p]).map(pool => {
            const members = poolMembers[pool]
            const userIdx = members.findIndex(m => m.name === player)
            const isGoat = userIdx === 0 && members.length > 1
            return <PoolTable key={pool} pool={pool} members={members} player={player} userIdx={userIdx} isGoat={isGoat} />
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
