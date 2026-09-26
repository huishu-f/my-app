import { env } from "@server/common/config/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,

  info: 1,

  warn: 2,

  error: 3,
};

const configuredLevel: LogLevel = env.isProd ? "info" : "debug";

function isEnabled(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[configuredLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function output(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!isEnabled(level)) return;

  const payload = {
    timestamp: formatTimestamp(),
    level: level.toUpperCase(),
    message,
    ...meta,
  };

  if (env.isProd) {
    console.log(JSON.stringify(payload));
    return;
  }

  const color = {
    debug: "\x1b[36m",
    info: "\x1b[32m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
  }[level];
  const reset = "\x1b[0m";
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[${payload.timestamp}] ${color}${payload.level}${reset} ${message}${metaStr}`);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => output("debug", message, meta),

  info: (message: string, meta?: Record<string, unknown>) => output("info", message, meta),

  warn: (message: string, meta?: Record<string, unknown>) => output("warn", message, meta),

  error: (message: string, meta?: Record<string, unknown>) => output("error", message, meta),
};
