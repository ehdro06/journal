type LogContext = Record<string, unknown>;

const serialize = (level: "info" | "error", event: string, context?: LogContext) => {
  return JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...context,
  });
};

export const logInfo = (event: string, context?: LogContext) => {
  console.info(serialize("info", event, context));
};

export const logError = (event: string, context?: LogContext) => {
  console.error(serialize("error", event, context));
};
