import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthProvider'
import Home from './pages/Home'
import Groups from './pages/Groups'
import Leaderboard from './pages/Leaderboard'
import Predictions from './pages/Predictions'
import Pools from './pages/Pools'
import NavBar from './components/NavBar'
import SignIn from './components/SignIn'
import GlobeBackground from './components/GlobeBackground'

function AppContent() {
  const { player } = useAuth()

  if (!player) return <SignIn />

  return (
    <BrowserRouter basename="/tourneypool">
      <div className="app">
        <GlobeBackground />
        <NavBar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/fixtures" element={<Groups />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/pools" element={<Pools />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <a href="https://github.com/yusufk/tourneypool" target="_blank" rel="noopener noreferrer">⚽ FamilyPool on GitHub</a>
        </footer>
      </div>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
