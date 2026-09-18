import { confirmMatchSchedule, proposeMatchSchedule, type Match } from '../../../domain/match/match.js';

export type MatchStore = { findById(id: string): Promise<Match | null>; save(match: Match): Promise<Match> };

export class ProposeMatchSchedule {
  constructor(private readonly matches: MatchStore) {}

  async execute(input: { readonly matchId: string; readonly managerId: string; readonly scheduledAt: Date }): Promise<Match> {
    const match = await this.require(input.matchId);
    return this.matches.save(proposeMatchSchedule(match, input.scheduledAt, input.managerId));
  }

  private async require(id: string): Promise<Match> {
    const match = await this.matches.findById(id);
    if (match === null) throw new Error('Match not found.');
    return match;
  }
}

export class ConfirmMatchSchedule {
  constructor(private readonly matches: MatchStore) {}

  async execute(input: { readonly matchId: string; readonly managerId: string }): Promise<Match> {
    const match = await this.matches.findById(input.matchId);
    if (match === null) throw new Error('Match not found.');
    return this.matches.save(confirmMatchSchedule(match, input.managerId));
  }
}
