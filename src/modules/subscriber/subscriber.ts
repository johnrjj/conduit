import { RedisClient } from 'redis';

export interface Subscriber {
  subscribe(channelName: string, payload: any): Promise<number>;
  unsubscribe(subscriptionId: number): void;
}

export class RedisSubscriber implements Subscriber {
  private subscriber: RedisClient;
  private subscriptionMap: { [subId: number]: [string, Function] };
  private subsRefsMap: { [trigger: string]: Array<number> };
  private currentSubscriptionId: number;

  constructor({ redisSubscriber }: { redisSubscriber: RedisClient }) {
    this.subscriber = redisSubscriber;
    this.subscriber.on('message', this.handleMessage.bind(this));
    this.subscriptionMap = {};
    this.subsRefsMap = {};
    this.currentSubscriptionId = 0;
  }

  private handleMessage(channel: string, message: string) {
    const subscribers = this.subsRefsMap[channel];

    if (!subscribers || !subscribers.length) return;

    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (e) {
      parsedMessage = message;
    }

    for (const subId of subscribers) {
      const [, listener] = this.subscriptionMap[subId];
      listener(parsedMessage);
    }
  }

  public subscribe(trigger: string, onMessage: (payload: any) => void): Promise<number> {
    const triggerName: string = trigger;
    const id = this.currentSubscriptionId++;
    this.subscriptionMap[id] = [triggerName, onMessage];

    const refs = this.subsRefsMap[triggerName];
    if (refs && refs.length > 0) {
      const newRefs = [...refs, id];
      this.subsRefsMap[triggerName] = newRefs;
      return Promise.resolve(id);
    } else {
      return new Promise<number>((resolve, reject) => {
        // TODO Support for pattern subs
        this.subscriber.subscribe(triggerName, err => {
          if (err) {
            reject(err);
          } else {
            this.subsRefsMap[triggerName] = [...(this.subsRefsMap[triggerName] || []), id];
            resolve(id);
          }
        });
      });
    }
  }

  public unsubscribe(subId: number): void {
    const [triggerName = null] = this.subscriptionMap[subId] || [];

    if (!triggerName) {
      throw new Error(`There is no subscription of id "${subId}"`);
    }
    const refs = this.subsRefsMap[triggerName];
    if (!refs) throw new Error(`There is no subscription of id "${subId}"`);

    if (refs.length === 1) {
      // prune
      this.subscriber.unsubscribe(triggerName);
      delete this.subsRefsMap[triggerName];
    } else {
      const index = refs.indexOf(subId);
      const newRefs = index === -1 ? refs : [...refs.slice(0, index), ...refs.slice(index + 1)];
      this.subsRefsMap[triggerName] = newRefs;
    }
    delete this.subscriptionMap[subId];
  }
}
