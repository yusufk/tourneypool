import { useCountdown } from '../hooks/useCountdown'

export default function Countdown({ dateUtc }: { dateUtc: string }) {
  const text = useCountdown(dateUtc)
  return <span className="countdown">{text}</span>
}
