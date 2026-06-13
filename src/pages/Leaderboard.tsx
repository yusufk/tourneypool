import { useState, useEffect } from 'react'
import { loadLeaderboard, loadPoolLeaderboard } from '../api'

export default function Leaderboard() {
  const [players, setPlayers] = useState<{ name: string; points: number }[]>([])
  const [pools, setPools] = useState<{ name: string; points: number; members: number }[]>([])

  useEffect(() => {
    loadLeaderboard().then(setPlayers)
    loadPoolLeaderboard().then(setPools)
  }, [])

  return (
    <div className="page leaderboard">
      <h1>🏅 Leaderboard</h1>
      <p className="subtitle">Xbl Prediction League</p>
      {players.length === 0 ? (
        <p className="subtitle">No predictions yet — be the first! 🐸</p>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.name}>
                <td>{i === 0 ? '🐐' : i + 1}</td>
                <td>{p.name}</td>
                <td>{p.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="scoring-rules">
        <h3>Scoring</h3>
        <ul>
          <li>🎯 Exact score: <strong>3 points</strong></li>
          <li>✅ Correct result (win/draw): <strong>1 point</strong></li>
          <li>❌ Wrong: <strong>0 points</strong></li>
        </ul>
      </div>

      {pools.length > 0 && (
        <>
          <h2 className="pool-table-title" style={{ marginTop: '2rem' }}>💀 Pool Standings</h2>
          <table className="leaderboard-table">
            <thead>
              <tr><th>#</th><th>Pool</th><th>Pts</th><th>Members</th><th>Avg</th></tr>
            </thead>
            <tbody>
              {pools.map((p, i) => (
                <tr key={p.name}>
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
