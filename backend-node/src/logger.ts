import { styleText } from 'node:util';

type LogLevel = 'info' | 'warn' | 'error';
type Meta = Record<string, unknown>;
// Перший аргумент styleText — його ж перший параметр. Дістаємо тип
// прямо з сигнатури функції, не покладаючись на приватний експорт.
type TextFormat = Parameters<typeof styleText>[0];

const LEVEL_COLORS: Record<LogLevel, TextFormat> = {
  info: 'green',
  warn: 'yellow',
  error: 'red',
};

function log(level: LogLevel, message: string, meta?: Meta): void {
  const timestamp = new Date().toISOString();
  const coloredLevel = styleText(LEVEL_COLORS[level], level.toUpperCase().padEnd(5));

  const line = `${timestamp} ${coloredLevel} ${message}`;
  const output = meta ? `${line} ${JSON.stringify(meta)}` : line;

  if (level === 'error') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

export const logger = {
  info: (message: string, meta?: Meta) => log('info', message, meta),
  warn: (message: string, meta?: Meta) => log('warn', message, meta),
  error: (message: string, meta?: Meta) => log('error', message, meta),
};
