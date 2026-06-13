import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface AuthContext {
  player: string | null
  signIn: (name: string) => void
  signOut: () => void
}

const AuthCtx = createContext<AuthContext>({ player: null, signIn: () => {}, signOut: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<string | null>(() => localStorage.getItem('tourneypool-player'))

  useEffect(() => {
    if (player) localStorage.setItem('tourneypool-player', player)
    else localStorage.removeItem('tourneypool-player')
  }, [player])

  return (
    <AuthCtx.Provider value={{ player, signIn: setPlayer, signOut: () => setPlayer(null) }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
