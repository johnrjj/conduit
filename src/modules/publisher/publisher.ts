import { RedisClient } from 'redis';

export interface Publisher {
  publish(channelName: string, payload: any): Promise<number>;
}

export class RedisPublisher implements Publisher {
  private publisher: RedisClient;
  constructor({ redisPublisher }: { redisPublisher: RedisClient }) {
    this.publisher = redisPublisher;
  }

  publish(channelName: string, payload: any): Promise<number> {
    return new Promise((accept, reject) =>
      this.publisher.publish(
        channelName,
        JSON.stringify(payload),
        (err, reply) => (err ? reject(err) : accept(reply))
      )
    );
  }
}
