
import { RedisClient } from 'redis';

export interface Publisher {
  publish(channelName: string, payload: any): Promise<void>
}

export class RedisPublisher implements Publisher {
  private publisher: RedisClient;
  constructor({ redisPublisher }: { redisPublisher: RedisClient }) {
    this.publisher = redisPublisher;
  }

  async publish(channelName: string, payload: any) {
    this.publisher.publish(channelName, payload);
  }
}