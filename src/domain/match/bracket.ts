export type FirstRoundMatch = {
  readonly teamAId: string;
  readonly teamBId: string | null;
};

export function generateFirstRound(
  acceptedTeamIds: readonly string[],
  random: () => number = Math.random,
): FirstRoundMatch[] {
  const shuffled = [...acceptedTeamIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    const replacement = shuffled[swapIndex];
    if (current !== undefined && replacement !== undefined) {
      shuffled[index] = replacement;
      shuffled[swapIndex] = current;
    }
  }

  const matches: FirstRoundMatch[] = [];
  for (let index = 0; index < shuffled.length; index += 2) {
    matches.push({ teamAId: shuffled[index] as string, teamBId: shuffled[index + 1] ?? null });
  }
  return matches;
}