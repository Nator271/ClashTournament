import {
  SingleEliminationFormatStrategy,
  TournamentFormat,
  type TournamentFormatStrategy,
} from './tournament.js';

export { SingleEliminationFormatStrategy };
export { TournamentFormat };

export type FormatStrategyRegistry = ReadonlyMap<TournamentFormat, TournamentFormatStrategy>;

export const defaultTournamentFormatRegistry: FormatStrategyRegistry = new Map([
  [TournamentFormat.SINGLE_ELIMINATION, new SingleEliminationFormatStrategy()],
]);

export function resolveTournamentFormatStrategy(
  format: TournamentFormat,
  registry: FormatStrategyRegistry = defaultTournamentFormatRegistry,
): TournamentFormatStrategy {
  const strategy = registry.get(format);

  if (strategy === undefined) {
    throw new Error(`Tournament format ${format} is not supported by the configured strategy.`);
  }

  return strategy;
}