export function categorizeRisk(score: number): 'low' | 'medium' | 'high' {
  if (score < 0.33) return 'low';
  if (score < 0.66) return 'medium';
  return 'high';
}
