export function presentMatchNotification(kind: 'deadline' | 'bye' | 'permission-failure', matchId: string, deadline?: Date): string {
  if (kind === 'deadline') return `Match ${matchId} deadline: ${deadline?.toISOString() ?? 'not set'}.`;
  if (kind === 'bye') return `Match ${matchId} advances by bye.`;
  return `Staff access is available for match ${matchId} because private permissions failed.`;
}

export function presentByeNotification(matchId: string): string {
  return presentMatchNotification('bye', matchId);
}
