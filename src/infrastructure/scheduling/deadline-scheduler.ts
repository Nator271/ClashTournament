import type { DeadlineInfo, SchedulingPort } from '../../application/ports/scheduling.js';

export class DeadlineScheduler implements SchedulingPort {
  private readonly deadlines = new Map<string, DeadlineInfo>();

  registerDeadline(info: DeadlineInfo): Promise<void> {
    this.deadlines.set(info.id, info);
    return Promise.resolve();
  }

  recoverPendingDeadlines(): Promise<DeadlineInfo[]> {
    const now = new Date();
    return Promise.resolve(
      [...this.deadlines.values()].filter((deadline) => deadline.dueAt.getTime() >= now.getTime()),
    );
  }

  completeDeadline(deadlineId: string): Promise<void> {
    this.deadlines.delete(deadlineId);
    return Promise.resolve();
  }
}