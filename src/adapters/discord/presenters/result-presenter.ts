export function presentResultNotification(kind: 'submitted' | 'contested' | 'deadline', auditReference: string): string {
  if (kind === 'contested') return `Result contested. Staff resolution is required (ref: ${auditReference}).`;
  if (kind === 'deadline') return `Result deadline reached. Staff has been notified (ref: ${auditReference}).`;
  return `Result submitted and recorded (ref: ${auditReference}).`;
}