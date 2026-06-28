const ALIASES = { 'Bosnia-H.': 'Bosnia and Herzegovina', 'Turkey': 'Türkiye', 'Ivory Coast': 'Côte d\u0027Ivoire', 'Curacao': 'Curaçao', 'DR Congo': 'Congo DR', 'Iran': 'IR Iran', 'Cape Verde': 'Cabo Verde', 'United States': 'USA', 'South Korea': 'Korea Republic', 'Bosnia-Herzegovina': 'Bosnia and Herzegovina', 'Cape Verde Islands': 'Cabo Verde' }

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

    // POST /api/schedule (admin - update schedule with resolved knockout teams)
    if (request.method === 'POST' && path === '/api/schedule') {
      const authHeader = request.headers.get('Authorization')
      if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
        return json({ error: 'Unauthorized' }, 401, corsHeaders)
      }
      const body = await request.json()
      // body can be: { matches: [{MatchNumber, HomeTeam, AwayTeam}] } for selective updates
      // or full schedule replacement
      if (body.matches) {
        const schedule = JSON.parse(await env.TOURNEY_KV.get('schedule') || '[]')
        for (const update of body.matches) {
          const match = schedule.find(m => m.MatchNumber === update.MatchNumber)
          if (match) {
            if (update.HomeTeam) match.HomeTeam = update.HomeTeam
            if (update.AwayTeam) match.AwayTeam = update.AwayTeam
          }
        }
        await env.TOURNEY_KV.put('schedule', JSON.stringify(schedule))
      } else {
        await env.TOURNEY_KV.put('schedule', JSON.stringify(body))
      }
      return json({ ok: true }, 200, corsHeaders)
    }

    // GET /api/schedule — return current schedule
    if (request.method === 'GET' && path === '/api/schedule') {
      const data = await env.TOURNEY_KV.get('schedule')
      return json(data ? JSON.parse(data) : [], 200, corsHeaders)
    }

    // POST /api/resolve-knockout (admin - auto-resolve knockout placeholders from standings)
    if (request.method === 'POST' && path === '/api/resolve-knockout') {
      const authHeader = request.headers.get('Authorization')
      if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
        return json({ error: 'Unauthorized' }, 401, corsHeaders)
      }
      const schedule = JSON.parse(await env.TOURNEY_KV.get('schedule') || '[]')
      const standings = JSON.parse(await env.TOURNEY_KV.get('standings') || '[]')
      if (!standings.length) return json({ error: 'No standings data — wait for groups to complete' }, 400, corsHeaders)

      // Build group position lookup: { "1A": "Mexico", "2A": "South Africa", "3A": "Korea Republic", ... }
      const positions = {}
      for (const group of standings) {
        const letter = group.group?.replace('GROUP_', '').replace('Group ', '') || ''
        if (!group.table) continue
        group.table.forEach((team, idx) => {
          const pos = idx + 1
          const raw = team.team?.name || team.team?.shortName || ''
          positions[`${pos}${letter}`] = ALIASES[raw] || ALIASES[team.team?.shortName] || raw
        })
      }

      // Resolve placeholders in knockout matches (Round 4+)
      let resolved = 0
      for (const match of schedule) {
        if (!match.Group && match.RoundNumber >= 4) {
          // Simple codes like "1A", "2B"
          if (match.HomeTeam && positions[match.HomeTeam]) {
            match.HomeTeam = positions[match.HomeTeam]
            resolved++
          }
          if (match.AwayTeam && positions[match.AwayTeam]) {
            match.AwayTeam = positions[match.AwayTeam]
            resolved++
          }
          // 3rd-place codes like "3ABCDF" are complex — skip auto-resolve for these
        }
      }

      await env.TOURNEY_KV.put('schedule', JSON.stringify(schedule))
      return json({ ok: true, resolved, note: '3rd-place qualifiers (3XXXX) need manual resolution' }, 200, corsHeaders)
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

    // POST /api/push/subscribe — store push subscription
    if (request.method === 'POST' && path === '/api/push/subscribe') {
      const { player, subscription } = await request.json()
      if (!subscription?.endpoint) return json({ error: 'Invalid subscription' }, 400, corsHeaders)
      const subs = JSON.parse(await env.TOURNEY_KV.get('push_subscriptions') || '[]')
      // Replace existing sub for same endpoint
      const filtered = subs.filter(s => s.subscription.endpoint !== subscription.endpoint)
      filtered.push({ player: player || 'anonymous', subscription })
      await env.TOURNEY_KV.put('push_subscriptions', JSON.stringify(filtered))
      return json({ ok: true }, 200, corsHeaders)
    }

    return json({ error: 'Not found' }, 404, corsHeaders)
  },

  async scheduled(event, env, ctx) {
    if (!env.FOOTBALL_API_KEY) return
    const schedule = JSON.parse(await env.TOURNEY_KV.get('schedule') || '[]')
    if (!schedule.length) return

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
      // Send push notifications for new results
      const subs = JSON.parse(await env.TOURNEY_KV.get('push_subscriptions') || '[]')
      if (subs.length > 0 && env.VAPID_PRIVATE_KEY && env.VAPID_PUBLIC_KEY) {
        for (const match of data.matches || []) {
          const home = ALIASES[match.homeTeam.shortName] || match.homeTeam.shortName
          const away = ALIASES[match.awayTeam.shortName] || match.awayTeam.shortName
          const fixture = schedule.find(f => f.HomeTeam === home && f.AwayTeam === away)
          if (!fixture) continue
          const score = match.score?.fullTime
          if (!score || score.home == null) continue
          const payload = JSON.stringify({
            title: `⚽ ${home} ${score.home} - ${score.away} ${away}`,
            body: 'Check how your prediction scored!'
          })
          for (const sub of subs) {
            try {
              await sendPush(sub.subscription, payload, env)
            } catch (e) { /* remove dead subs later */ }
          }
        }
      }
    }

    // Fetch and cache standings
    const standingsResp = await fetch('https://api.football-data.org/v4/competitions/WC/standings', {
      headers: { 'X-Auth-Token': env.FOOTBALL_API_KEY }
    })
    if (standingsResp.ok) {
      const standingsData = await standingsResp.json()
      await env.TOURNEY_KV.put('standings', JSON.stringify(standingsData.standings || []))

      // Auto-resolve knockout placeholders if groups are complete
      const positions = {}
      for (const group of standingsData.standings || []) {
        const letter = group.group?.replace('GROUP_', '').replace('Group ', '') || ''
        if (!group.table || group.table.length < 4) continue
        // Only resolve if all 3 matchdays are played
        const allPlayed = group.table.every(t => t.playedGames >= 3)
        if (!allPlayed) continue
        group.table.forEach((team, idx) => {
          const raw = team.team?.name || team.team?.shortName || ''
          positions[`${idx + 1}${letter}`] = ALIASES[raw] || ALIASES[team.team?.shortName] || raw
        })
      }

      if (Object.keys(positions).length > 0) {
        const schedule = JSON.parse(await env.TOURNEY_KV.get('schedule') || '[]')
        let changed = false
        for (const match of schedule) {
          if (!match.Group && match.RoundNumber >= 4) {
            if (match.HomeTeam && positions[match.HomeTeam]) { match.HomeTeam = positions[match.HomeTeam]; changed = true }
            if (match.AwayTeam && positions[match.AwayTeam]) { match.AwayTeam = positions[match.AwayTeam]; changed = true }
          }
        }
        if (changed) await env.TOURNEY_KV.put('schedule', JSON.stringify(schedule))
      }
    }

    // Propagate knockout winners: fetch knockout matches from API and fill "To be announced" slots
    const koResp = await fetch('https://api.football-data.org/v4/competitions/WC/matches?stage=LAST_32,LAST_16,QUARTER_FINALS,SEMI_FINALS,FINAL', {
      headers: { 'X-Auth-Token': env.FOOTBALL_API_KEY }
    })
    if (koResp.ok) {
      const koData = await koResp.json()
      const sched = JSON.parse(await env.TOURNEY_KV.get('schedule') || '[]')
      let koChanged = false
      for (const apiMatch of koData.matches || []) {
        const home = ALIASES[apiMatch.homeTeam?.shortName] || apiMatch.homeTeam?.shortName
        const away = ALIASES[apiMatch.awayTeam?.shortName] || apiMatch.awayTeam?.shortName
        if (!home || !away) continue
        const apiDate = apiMatch.utcDate?.slice(0, 10)
        const fixture = sched.find(f => {
          if (f.Group || f.RoundNumber < 4) return false
          const fDate = f.DateUtc?.slice(0, 10)
          return fDate === apiDate && (
            (f.HomeTeam === home && f.AwayTeam === away) ||
            (f.HomeTeam === 'To be announced' || f.AwayTeam === 'To be announced') && fDate === apiDate
          )
        })
        if (!fixture) continue
        if (fixture.HomeTeam === 'To be announced' && home) { fixture.HomeTeam = home; koChanged = true }
        if (fixture.AwayTeam === 'To be announced' && away) { fixture.AwayTeam = away; koChanged = true }
      }
      if (koChanged) await env.TOURNEY_KV.put('schedule', JSON.stringify(sched))
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

// Web Push using raw crypto (no npm deps needed in Workers)
async function sendPush(subscription, payload, env) {
  const { endpoint, keys } = subscription
  const p256dh = keys.p256dh
  const auth = keys.auth

  // Import VAPID keys
  const vapidPrivate = base64UrlToUint8(env.VAPID_PRIVATE_KEY)
  const vapidPublic = base64UrlToUint8(env.VAPID_PUBLIC_KEY)

  // Create JWT for VAPID
  const audience = new URL(endpoint).origin
  const expiry = Math.floor(Date.now() / 1000) + 3600
  const header = base64UrlEncode(JSON.stringify({ alg: 'ES256', typ: 'JWT' }))
  const body = base64UrlEncode(JSON.stringify({ aud: audience, exp: expiry, sub: 'mailto:yusufk@gmail.com' }))
  const unsignedToken = `${header}.${body}`

  const key = await crypto.subtle.importKey('raw', vapidPrivate, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsignedToken))
  const jwt = `${unsignedToken}.${base64UrlEncode(new Uint8Array(sig))}`

  // For simplicity, send unencrypted notification (TTL 0 = no payload encryption needed for title/body via topic)
  // Actually, Web Push REQUIRES encryption. Use a simpler approach: just POST with VAPID auth and encrypted payload.
  // Workers don't have web-push lib, so we send a minimal push with no payload (notification from SW default)
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${arrayToBase64Url(vapidPublic)}`,
      'TTL': '3600',
      'Content-Length': '0',
    }
  })
  return resp.ok
}

function base64UrlToUint8(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(base64)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

function base64UrlEncode(input) {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input
  const bin = Array.from(data instanceof Uint8Array ? data : new Uint8Array(data)).map(b => String.fromCharCode(b)).join('')
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function arrayToBase64Url(uint8) {
  return base64UrlEncode(uint8)
}
