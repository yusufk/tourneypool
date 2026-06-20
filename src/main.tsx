import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/tourneypool/sw.js').then(async reg => {
    if (!('PushManager' in window)) return
    const sub = await reg.pushManager.getSubscription()
    if (sub) return // already subscribed
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
    const newSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'BCNWf1WEx2DqQFqGros6mvl21HZ8YDIOSuFMQTyersb9hYgmnuSC0DXBoNl11KEG7nwiqdKnds0H9GS4okFCRlg'
    })
    const API_BASE = import.meta.env.VITE_API_URL || ''
    const player = localStorage.getItem('tourneypool-player') || ''
    await fetch(`${API_BASE}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player, subscription: newSub.toJSON() })
    })
  })
}
