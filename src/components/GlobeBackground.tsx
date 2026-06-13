import { useMemo } from 'react'

const VIDEOS = ['bg.mp4', 'bg2.mp4', 'bg3.mp4', 'bg4.mp4', 'bg5.mp4']
const base = import.meta.env.BASE_URL

export default function GlobeBackground() {
  const video = useMemo(() => VIDEOS[Math.floor(Math.random() * VIDEOS.length)], [])

  return (
    <div className="globe-bg">
      <video className="bg-video" autoPlay muted loop playsInline>
        <source src={`${base}${video}`} type="video/mp4" />
      </video>
      <div className="bg-overlay" />
    </div>
  )
}
