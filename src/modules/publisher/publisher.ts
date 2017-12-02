import { RedisClient } from 'redis';
import { Logger } from '../../util/logger';

export interface Publisher {
  publish(channelName: string, payload: any): Promise<number>;
}

export class RedisPublisher implements Publisher {
  private publisher: RedisClient;
  private logger?: Logger;

  constructor({ redisPublisher, logger }: { redisPublisher: RedisClient; logger?: Logger }) {
    this.publisher = redisPublisher;
    this.logger = logger;
  }

  publish(channelName: string, payload: any): Promise<number> {
    return new Promise((accept, reject) => {
      this.log('verbose', `Publishing event to ${channelName} channel`, payload);
      return this.publisher.publish(
        channelName,
        JSON.stringify(payload),
        (err, reply) => (err ? reject(err) : accept(reply))
      );
    });
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}
