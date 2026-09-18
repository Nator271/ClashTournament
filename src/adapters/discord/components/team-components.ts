export type TeamComponent = { readonly customId: string; readonly label: string };

export function createTeamComponents(applicationId: string): { readonly addPlayer: TeamComponent; readonly submit: TeamComponent } {
  return {
    addPlayer: { customId: `v1:team:add-player:${applicationId}`, label: 'Add player' },
    submit: { customId: `v1:team:submit:${applicationId}`, label: 'Submit application' },
  };
}
