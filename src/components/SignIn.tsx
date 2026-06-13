import { useState } from 'react'
import { useAuth } from './AuthProvider'
import FloatingEmojis from './FloatingEmojis'
import { register, login } from '../api'

export default function SignIn() {
  const { signIn } = useAuth()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || pin.length < 4) { setError('Name + 4-digit PIN required'); return }
    setLoading(true); setError('')
    let res = await login(name.trim(), pin)
    if (res.error?.includes('not found')) {
      res = await register(name.trim(), pin)
    }
    setLoading(false)
    if (res.ok) {
      localStorage.setItem('tourneypool-pin', pin)
      signIn(name.trim())
    } else {
      setError(res.error || 'Something went wrong')
    }
  }

  return (
    <div className="sign-in-screen">
      <FloatingEmojis />
      <h1>TourneyPool ⚽</h1>
      <h2>World Cup 2026 Predictor</h2>
      <p>Bold predictions. Zero accountability. 🎯</p>
      <div className="sign-in-form">
        <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="password" placeholder="PIN (4+)" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={8} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        <button onClick={handleSubmit} disabled={loading}>{loading ? '...' : "Let's Go"}</button>
      </div>
      {error && <p className="sign-in-error">{error}</p>}
    </div>
  )
}
