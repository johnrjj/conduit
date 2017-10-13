import { Logger as WinstonLogger, LoggerInstance, transports } from 'winston';

export interface Logger {
  log(level: string, message: string, meta?: any): void;
  error(err: any): void;
}

export function ConsoleLoggerFactory(options?: any): LoggerInstance {
  const logOptions: any = Object.assign(
    {
      level: 'debug',
      transports: [
        new transports.Console({
          colorize: 'all',
          json: false,
          timestamp: true,
        }),
      ],
      colorize: true,
    },
    options || {}
  );
  return new WinstonLogger(logOptions);
}

export const NullLogger = {
  log(level: string, message: string, meta?: any): void {
    /* no-op */
  },
  error(err: Error): void {
    /* no-op */
  },
};
