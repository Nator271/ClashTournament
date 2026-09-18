import type { InteractionHandler } from '../interaction-router.js';

export type StaffApplicationCommandDependencies = {
  readonly decide?: (action: 'ACCEPT' | 'REJECT' | 'REQUEST_CORRECTION' | 'DISQUALIFY', applicationId: string, interaction: unknown) => Promise<void>;
};

export function createStaffApplicationCommandHandlers(dependencies: StaffApplicationCommandDependencies): { readonly acceptAction: string; readonly accept: InteractionHandler; readonly reject: InteractionHandler; readonly requestCorrection: InteractionHandler; readonly disqualify: InteractionHandler } {
  const action = (decision: 'ACCEPT' | 'REJECT' | 'REQUEST_CORRECTION' | 'DISQUALIFY'): InteractionHandler => async (interaction, parsed) => {
    if (dependencies.decide !== undefined) await dependencies.decide(decision, parsed.resourceId ?? '', interaction);
  };
  return {
    acceptAction: 'v1:staff:accept-application',
    accept: action('ACCEPT'),
    reject: action('REJECT'),
    requestCorrection: action('REQUEST_CORRECTION'),
    disqualify: action('DISQUALIFY'),
  };
}
