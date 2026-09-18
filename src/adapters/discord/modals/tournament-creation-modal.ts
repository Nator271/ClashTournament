export type TournamentCreationStep = 'rules' | 'schedule';

export type ModalTextInput = {
  readonly customId: string;
  readonly label: string;
  readonly required: boolean;
  readonly maxLength?: number;
};

export type TournamentCreationModal = {
  readonly customId: string;
  readonly title: string;
  readonly components: readonly ModalTextInput[];
};

export function createTournamentCreationModal(step: TournamentCreationStep): TournamentCreationModal {
  if (step === 'rules') {
    return {
      customId: 'v1:tournament:create-rules',
      title: 'Create tournament',
      components: [
        { customId: 'name', label: 'Tournament name', required: true, maxLength: 100 },
        { customId: 'playersPerTeam', label: 'Players per team (1-10)', required: true, maxLength: 2 },
        { customId: 'message', label: 'Organizer message', required: false, maxLength: 1000 },
      ],
    };
  }

  return {
    customId: 'v1:tournament:create-schedule',
    title: 'Tournament schedule',
    components: [
      { customId: 'registrationStartsAt', label: 'Registration start (UTC)', required: true },
      { customId: 'registrationEndsAt', label: 'Registration end (UTC)', required: true },
      { customId: 'roundDurationMinutes', label: 'Round duration in minutes', required: true, maxLength: 4 },
    ],
  };
}