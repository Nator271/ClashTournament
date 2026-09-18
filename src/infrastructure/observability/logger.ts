export type LogContext = Readonly<Record<string, string | number | boolean | undefined>>;

const secretLikePattern = /token|secret|authorization|api[_-]?key|password/i;

function sanitizeContext(context: LogContext): Record<string, string | number | boolean | undefined> {
  const sanitized: Record<string, string | number | boolean | undefined> = {};

  for (const [key, value] of Object.entries(context)) {
    if (secretLikePattern.test(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

export function logInfo(message: string, context: LogContext = {}): void {
  console.info(JSON.stringify({ level: 'info', message, ...sanitizeContext(context) }));
}

export function logError(message: string, context: LogContext = {}): void {
  console.error(JSON.stringify({ level: 'error', message, ...sanitizeContext(context) }));
}