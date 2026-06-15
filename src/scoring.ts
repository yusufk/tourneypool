export interface Score {
  homeScore: number
  awayScore: number
}

export interface PredictionEvaluation {
  status: 'exact' | 'winner' | 'draw' | 'wrong'
  tone: 'exact' | 'correct' | 'zero'
  points: number
  label: string
}

export function outcome(score: Score): 'H' | 'A' | 'D' {
  if (score.homeScore > score.awayScore) return 'H'
  if (score.homeScore < score.awayScore) return 'A'
  return 'D'
}

export function evaluatePrediction(prediction?: Score | null, result?: Score | null): PredictionEvaluation | null {
  if (!prediction || !result) return null

  if (prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore) {
    return { status: 'exact', tone: 'exact', points: 3, label: 'Exact score' }
  }

  const predictedOutcome = outcome(prediction)
  const actualOutcome = outcome(result)

  if (predictedOutcome === actualOutcome) {
    if (actualOutcome === 'D') {
      return { status: 'draw', tone: 'correct', points: 1, label: 'Correct draw' }
    }

    return { status: 'winner', tone: 'correct', points: 1, label: 'Correct winner' }
  }

  return { status: 'wrong', tone: 'zero', points: 0, label: 'No match' }
}
