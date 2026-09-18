export type DeadlineInfo = {
  readonly id: string;
  readonly kind: 'registration' | 'round' | 'result';
  readonly dueAt: Date;
  readonly guildId: string;
};

export type SchedulingPort = {
  registerDeadline(info: DeadlineInfo): Promise<void>;
  recoverPendingDeadlines(): Promise<DeadlineInfo[]>;
  completeDeadline(deadlineId: string): Promise<void>;
};
