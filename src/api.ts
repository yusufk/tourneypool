const API_BASE = import.meta.env.VITE_API_URL || ''

function getPin(): string {
  return localStorage.getItem('tourneypool-pin') || ''
}

export async function register(name: string, pin: string) {
  const res = await fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pin }),
  })
  return res.json()
}

export async function login(name: string, pin: string) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pin }),
  })
  return res.json()
}

export async function savePredictions(player: string, predictions: Record<number, { homeScore: number; awayScore: number }>) {
  const res = await fetch(`${API_BASE}/api/predictions/${encodeURIComponent(player)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Pin': getPin() },
    body: JSON.stringify(predictions),
  })
  return res.json()
}

export async function loadPredictions(player: string) {
  const res = await fetch(`${API_BASE}/api/predictions/${encodeURIComponent(player)}`)
  return res.json()
}

export async function loadLeaderboard(): Promise<{ name: string; points: number }[]> {
  const res = await fetch(`${API_BASE}/api/leaderboard`)
  return res.json()
}

export async function loadPlayerPools(player: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/pools/${encodeURIComponent(player)}`)
  return res.json()
}

export async function savePlayerPools(player: string, pools: string[]) {
  const res = await fetch(`${API_BASE}/api/pools/${encodeURIComponent(player)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Pin': getPin() },
    body: JSON.stringify({ pools }),
  })
  return res.json()
}

export async function loadPoolLeaderboard(): Promise<{ leaderboard: { name: string; points: number; members: number }[]; poolMembers: Record<string, { name: string; points: number }[]> }> {
  const res = await fetch(`${API_BASE}/api/pool-leaderboard`)
  return res.json()
}
