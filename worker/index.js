export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS headers
    const origin = request.headers.get('Origin') || ''
    const allowedOrigins = ['https://yusuf.kaka.co.za', 'https://yusufk.github.io', 'http://localhost:5173', 'http://localhost:5174']
    const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Pin',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // POST /api/register — set PIN for new player
    if (request.method === 'POST' && path === '/api/register') {
      const { name, pin } = await request.json()
      if (!name || !pin || name.length > 50 || pin.length < 4) {
        return json({ error: 'Name and 4+ char PIN required' }, 400, corsHeaders)
      }
      const existing = await env.TOURNEY_KV.get(`pin:${name}`)
      if (existing) return json({ error: 'Name taken — use your PIN to sign in' }, 409, corsHeaders)
      await env.TOURNEY_KV.put(`pin:${name}`, pin)
      const players = JSON.parse(await env.TOURNEY_KV.get('players') || '[]')
      if (!players.includes(name)) {
        players.push(name)
        await env.TOURNEY_KV.put('players', JSON.stringify(players))
      }
      return json({ ok: true }, 200, corsHeaders)
    }

    // POST /api/login — verify PIN
    if (request.method === 'POST' && path === '/api/login') {
      const { name, pin } = await request.json()
      if (!name || !pin) return json({ error: 'Name and PIN required' }, 400, corsHeaders)
      const stored = await env.TOURNEY_KV.get(`pin:${name}`)
      if (!stored) return json({ error: 'Player not found — register first' }, 404, corsHeaders)
      if (stored !== pin) return json({ error: 'Wrong PIN' }, 401, corsHeaders)
      return json({ ok: true }, 200, corsHeaders)
    }

    // GET /api/predictions/:player
    if (request.method === 'GET' && path.startsWith('/api/predictions/')) {
      const player = decodeURIComponent(path.split('/api/predictions/')[1])
      if (!player) return json({ error: 'Missing player' }, 400, corsHeaders)
      const data = await env.TOURNEY_KV.get(`predictions:${player}`)
      return json(data ? JSON.parse(data) : {}, 200, corsHeaders)
    }

    // POST /api/predictions/:player
    if (request.method === 'POST' && path.startsWith('/api/predictions/')) {
      const player = decodeURIComponent(path.split('/api/predictions/')[1])
      if (!player || player.length > 50) return json({ error: 'Invalid player' }, 400, corsHeaders)
      const pin = request.headers.get('X-Pin')
      const storedPin = await env.TOURNEY_KV.get(`pin:${player}`)
      if (storedPin && pin !== storedPin) return json({ error: 'Wrong PIN' }, 401, corsHeaders)
      const contentLength = parseInt(request.headers.get('Content-Length') || '0')
      if (contentLength > 10240) return json({ error: 'Payload too large' }, 413, corsHeaders)
      const body = await request.json()

      // Load fixture schedule to enforce lockout
      const schedule = JSON.parse(await env.TOURNEY_KV.get('schedule') || '[]')
      const now = new Date()
      const locked = []

      if (schedule.length > 0) {
        for (const [matchId] of Object.entries(body)) {
          const match = schedule.find(m => String(m.MatchNumber) === String(matchId))
          if (match && new Date(match.DateUtc) <= now) {
            locked.push(matchId)
          }
        }
      }

      // Remove locked predictions from submission
      const allowed = { ...body }
      for (const id of locked) {
        delete allowed[id]
      }

      // Merge with existing (keep old predictions for locked matches)
      const existing = JSON.parse(await env.TOURNEY_KV.get(`predictions:${player}`) || '{}')
      const merged = { ...existing, ...allowed }

      await env.TOURNEY_KV.put(`predictions:${player}`, JSON.stringify(merged))
      // Also track player in players list
      const players = JSON.parse(await env.TOURNEY_KV.get('players') || '[]')
      if (!players.includes(player)) {
        players.push(player)
        await env.TOURNEY_KV.put('players', JSON.stringify(players))
      }
      return json({ ok: true, locked }, 200, corsHeaders)
    }

    // GET /api/leaderboard
    if (request.method === 'GET' && path === '/api/leaderboard') {
      const players = JSON.parse(await env.TOURNEY_KV.get('players') || '[]')
      const results = JSON.parse(await env.TOURNEY_KV.get('results') || '{}')
      const leaderboard = []

      for (const player of players) {
        const preds = JSON.parse(await env.TOURNEY_KV.get(`predictions:${player}`) || '{}')
        let points = 0
        for (const [matchId, result] of Object.entries(results)) {
          const pred = preds[matchId]
          if (pred) {
            const r = result
            if (pred.homeScore === r.homeScore && pred.awayScore === r.awayScore) {
              points += 3 // exact score
            } else if (outcome(pred) === outcome(r)) {
              points += 1 // correct result
            }
          }
        }
        leaderboard.push({ name: player, points })
      }

      leaderboard.sort((a, b) => b.points - a.points)
      return json(leaderboard, 200, corsHeaders)
    }

    // GET /api/results
    if (request.method === 'GET' && path === '/api/results') {
      const data = await env.TOURNEY_KV.get('results')
      return json(data ? JSON.parse(data) : {}, 200, corsHeaders)
    }

    // GET /api/pools/:player — get player's pools
    if (request.method === 'GET' && path.startsWith('/api/pools/')) {
      const player = decodeURIComponent(path.split('/api/pools/')[1])
      if (!player) return json({ error: 'Missing player' }, 400, corsHeaders)
      const data = await env.TOURNEY_KV.get(`pools:${player}`)
      return json(data ? JSON.parse(data) : [], 200, corsHeaders)
    }

    // POST /api/pools/:player — update player's pools
    if (request.method === 'POST' && path.startsWith('/api/pools/')) {
      const player = decodeURIComponent(path.split('/api/pools/')[1])
      if (!player) return json({ error: 'Missing player' }, 400, corsHeaders)
      const pin = request.headers.get('X-Pin')
      const storedPin = await env.TOURNEY_KV.get(`pin:${player}`)
      if (storedPin && pin !== storedPin) return json({ error: 'Wrong PIN' }, 401, corsHeaders)
      const body = await request.json()
      await env.TOURNEY_KV.put(`pools:${player}`, JSON.stringify(body.pools || []))
      return json({ ok: true }, 200, corsHeaders)
    }

    // GET /api/pool-leaderboard — aggregated pool standings
    if (request.method === 'GET' && path === '/api/pool-leaderboard') {
      const players = JSON.parse(await env.TOURNEY_KV.get('players') || '[]')
      const results = JSON.parse(await env.TOURNEY_KV.get('results') || '{}')
      const poolScores = {}
      const poolMembers = {}

      for (const player of players) {
        const preds = JSON.parse(await env.TOURNEY_KV.get(`predictions:${player}`) || '{}')
        const playerPools = JSON.parse(await env.TOURNEY_KV.get(`pools:${player}`) || '[]')
        let points = 0
        for (const [matchId, result] of Object.entries(results)) {
          const pred = preds[matchId]
          if (pred) {
            if (pred.homeScore === result.homeScore && pred.awayScore === result.awayScore) points += 3
            else if (outcome(pred) === outcome(result)) points += 1
          }
        }
        for (const pool of playerPools) {
          if (!poolScores[pool]) poolScores[pool] = { name: pool, points: 0, members: 0 }
          poolScores[pool].points += points
          poolScores[pool].members += 1
          if (!poolMembers[pool]) poolMembers[pool] = []
          poolMembers[pool].push({ name: player, points })
        }
      }

      // Sort members within each pool
      for (const pool of Object.keys(poolMembers)) {
        poolMembers[pool].sort((a, b) => b.points - a.points)
      }

      const leaderboard = Object.values(poolScores)
      leaderboard.sort((a, b) => b.points - a.points)
      return json({ leaderboard, poolMembers }, 200, corsHeaders)
    }

    // POST /api/results (admin - update match results)
    if (request.method === 'POST' && path === '/api/results') {
      const authHeader = request.headers.get('Authorization')
      if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
        return json({ error: 'Unauthorized' }, 401, corsHeaders)
      }
      const body = await request.json()
      await env.TOURNEY_KV.put('results', JSON.stringify(body))
      return json({ ok: true }, 200, corsHeaders)
    }

    // GET /api/standings — group standings from football-data.org (cached, fetches on miss)
    if (request.method === 'GET' && path === '/api/standings') {
      let data = await env.TOURNEY_KV.get('standings')
      if (!data && env.FOOTBALL_API_KEY) {
        const resp = await fetch('https://api.football-data.org/v4/competitions/WC/standings', {
          headers: { 'X-Auth-Token': env.FOOTBALL_API_KEY }
        })
        if (resp.ok) {
          const json_ = await resp.json()
          const standings = json_.standings || []
          await env.TOURNEY_KV.put('standings', JSON.stringify(standings), { expirationTtl: 3600 })
          return json(standings, 200, corsHeaders)
        }
      }
      return json(data ? JSON.parse(data) : [], 200, corsHeaders)
    }

    return json({ error: 'Not found' }, 404, corsHeaders)
  },

  async scheduled(event, env, ctx) {
    if (!env.FOOTBALL_API_KEY) return
    const schedule = JSON.parse(await env.TOURNEY_KV.get('schedule') || '[]')
    if (!schedule.length) return

    const ALIASES = { 'Bosnia-H.': 'Bosnia and Herzegovina', 'Turkey': 'Türkiye', 'Ivory Coast': 'Côte d\u0027Ivoire', 'Curacao': 'Curaçao', 'DR Congo': 'Congo DR', 'Iran': 'IR Iran', 'Cape Verde': 'Cabo Verde' }

    const resp = await fetch('https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED', {
      headers: { 'X-Auth-Token': env.FOOTBALL_API_KEY }
    })
    if (!resp.ok) return

    const data = await resp.json()
    const results = JSON.parse(await env.TOURNEY_KV.get('results') || '{}')
    let updated = false

    for (const match of data.matches || []) {
      const home = ALIASES[match.homeTeam.shortName] || match.homeTeam.shortName
      const away = ALIASES[match.awayTeam.shortName] || match.awayTeam.shortName
      const fixture = schedule.find(f => f.HomeTeam === home && f.AwayTeam === away)
      if (!fixture) continue
      const key = String(fixture.MatchNumber)
      const score = match.score?.fullTime
      if (!score || score.home == null) continue
      if (!results[key] || results[key].homeScore !== score.home || results[key].awayScore !== score.away) {
        results[key] = { homeScore: score.home, awayScore: score.away }
        updated = true
      }
    }

    if (updated) {
      await env.TOURNEY_KV.put('results', JSON.stringify(results))
    }

    // Fetch and cache standings
    const standingsResp = await fetch('https://api.football-data.org/v4/competitions/WC/standings', {
      headers: { 'X-Auth-Token': env.FOOTBALL_API_KEY }
    })
    if (standingsResp.ok) {
      const standingsData = await standingsResp.json()
      await env.TOURNEY_KV.put('standings', JSON.stringify(standingsData.standings || []))
    }
  }
}

function outcome(score) {
  if (score.homeScore > score.awayScore) return 'H'
  if (score.homeScore < score.awayScore) return 'A'
  return 'D'
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  })
}
