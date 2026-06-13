import { useEffect, useRef } from 'react'

const FLAGS = ['🇿🇦', '🇲🇽', '🇧🇷', '🇦🇷', '🇩🇪', '🇫🇷', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇪🇸', '🇵🇹', '🇳🇱', '🇧🇪', '🇯🇵', '🇰🇷', '🇺🇸', '🇨🇦', '🇲🇦', '🇨🇿', '🇨🇭', '🇭🇹', '🇦🇺', '🇹🇷', '🇶🇦', '🇨🇼', '🇸🇪', '🇹🇳', '🇨🇮', '🇪🇨', '🇨🇻', '🇪🇬', '🇸🇦', '🇺🇾', '🇮🇷', '🇳🇿', '🇸🇳', '🇮🇶', '🇳🇴', '🇩🇿', '🇦🇹', '🇯🇴', '🇨🇩', '🇭🇷', '🇬🇭', '🇵🇦', '🇺🇿', '🇨🇴', '🇧🇦', '🇵🇾', '🏴󠁧󠁢󠁳󠁣󠁴󠁿']
const HEAVY = ['⚽', '🐸', '🐐', '🏆', '👟', '🎺', '🌮', '🎩', '🥅', '🧤']

function pickEmoji(): { emoji: string; weight: number } {
  if (Math.random() < 0.3) {
    return { emoji: HEAVY[Math.floor(Math.random() * HEAVY.length)], weight: 1 }
  }
  return { emoji: FLAGS[Math.floor(Math.random() * FLAGS.length)], weight: 0.3 }
}

interface Particle {
  x: number; y: number; vx: number; vy: number
  emoji: string; size: number; rotation: number; vr: number
  grounded: boolean; age: number; opacity: number; g: number
}

export default function FloatingEmojis({ subtle = false }: { subtle?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const mouse = useRef({ x: -1000, y: -1000 })
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let w = window.innerWidth
    let h = window.innerHeight
    const maxPile = h * 0.2
    const friction = 0.995
    const mouseRadius = 70
    const fadeAfter = 12000 // start fading after 12s grounded
    const fadeTime = 5000 // fade over 5s

    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const spawn = (): Particle => {
      const { emoji, weight } = pickEmoji()
      return {
        x: Math.random() * w, y: -30,
        vx: (Math.random() - 0.5) * 0.8, vy: Math.random() * 0.2 + 0.05,
        emoji, size: 14 + Math.random() * 10,
        rotation: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.03,
        grounded: false, age: 0, opacity: 1, g: (0.008 + Math.random() * 0.025) * weight,
      }
    }

    const onMove = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY } }
    const onTouch = (e: TouchEvent) => { mouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onTouch)

    let lastSpawn = 0
    let lastTime = 0
    const loop = (time: number) => {
      const dt = lastTime ? time - lastTime : 16
      lastTime = time
      ctx.clearRect(0, 0, w, h)

      // Continuous spawning
      if (time - lastSpawn > 1500) {
        particles.current.push(spawn())
        lastSpawn = time
      }

      // Remove fully faded
      particles.current = particles.current.filter(p => p.opacity > 0.01)

      for (const p of particles.current) {
        // Mouse repulsion
        const dx = p.x - mouse.current.x
        const dy = p.y - mouse.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < mouseRadius && dist > 0) {
          const force = (mouseRadius - dist) / mouseRadius * 2.5
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
          p.grounded = false
          p.age = 0 // reset fade when disturbed
          p.opacity = Math.min(1, p.opacity + 0.3)
        }

        if (!p.grounded) {
          p.vy += p.g
          p.vx *= friction
          p.vy *= friction
          p.x += p.vx
          p.y += p.vy
          p.rotation += p.vr

          // Ground collision
          const groundLevel = h - (10 + Math.random() * maxPile * 0.4)
          if (p.y >= groundLevel) {
            p.y = groundLevel
            p.vy = 0
            p.vx *= 0.4
            p.vr *= 0.2
            p.grounded = true
            p.age = 0
          }

          if (p.x < 0) { p.x = 0; p.vx *= -0.5 }
          if (p.x > w) { p.x = w; p.vx *= -0.5 }
        } else {
          // Fade grounded particles
          p.age += dt
          if (p.age > fadeAfter) {
            p.opacity -= dt / fadeTime
          }
        }

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.font = `${p.size}px serif`
        ctx.globalAlpha = p.opacity * (subtle ? 0.5 : 0.8)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.emoji, 0, 0)
        ctx.restore()
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
    }
  }, [subtle])

  return <canvas ref={canvasRef} className="floating-emojis" />
}
