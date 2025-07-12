/**
 * Simple logger utility
 */
export class Logger {
  private logLevel: string;
  private levels = ['error', 'warn', 'info', 'debug'];

  constructor() {
    this.logLevel = process.env.PRESEARCH_LOG_LEVEL || 'info';
  }

  private shouldLog(level: string): boolean {
    const currentLevelIndex = this.levels.indexOf(this.logLevel);
    const messageLevelIndex = this.levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  setLevel(level: string): void {
    if (this.levels.includes(level)) {
      this.logLevel = level;
    }
  }
}

export const logger = new Logger();