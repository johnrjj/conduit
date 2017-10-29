import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Request, NextFunction } from 'express';
import { RedisClient } from 'redis';
import { Message, SubscribeRequest, OrderbookSnapshot, AllMessageTypes } from './types';
import { Logger } from '../util/logger';
import { Duplex } from 'stream';

export class WebSocketNode extends Duplex {
  private wsServerRef: WebSocket.Server;
  private subscriptions: WeakMap<WebSocket, Array<string>>;
  private channelSubscriptions = new Map<string, Set<WebSocket>>();
  private redisSubscriber: RedisClient;
  private redisPublisher: RedisClient;
  private logger?: Logger;

  constructor({
    logger,
    wss,
    redisPublisher,
    redisSubscriber,
  }: {
    logger?: Logger;
    wss: WebSocket.Server;
    redisSubscriber: RedisClient;
    redisPublisher: RedisClient;
  }) {
    super({ objectMode: true, highWaterMark: 1024 });
    this.logger = logger;
    this.wsServerRef = wss;
    this.redisSubscriber = redisSubscriber;
    this.redisPublisher = redisPublisher;

    this.redisSubscriber.on('message', (channel, message) => {
      this.log('verobse', `redis message received from websocket server: ${channel}`, message);
      if (!this.channelSubscriptions.has(channel)) {
        return;
      }
      const subscribers = this.channelSubscriptions.get(channel);
      if (!subscribers) {
        return;
      }
      subscribers.forEach(ws => {
        ws.send(message);
      });
    });
  }

  public acceptConnection(ws: WebSocket, req: Request, next: NextFunction): void {
    try {
      this.log('debug', `Websocket connection connected and registered`);
      ws.on('close', n => this.removeConnection(ws));
      ws.on('message', message => {
        this.log('verbose', 'WebSocket node received message from client', message);
        const data = JSON.parse(message.toString());
        switch (data.type) {
          case 'subscribe':
            this.log('debug', `Subscribe request received`);
            const subscribeRequest = data as Message<SubscribeRequest>;
            this.handleChannelSubscribeRequest(ws, subscribeRequest);
            break;
          default:
            this.log(
              'debug',
              `Unrecognized message type ${data.type} received from client websocket`
            );
            break;
        }
      });
    } catch (e) {
      this.log('error', e);
      next(e);
    }
  }

  _write(msg: any, encoding: string, callback: Function): void {
    this.log('debug', 'Websocket Node received msg', msg);
    console.log(msg);
  }

  _read(size: number): void {}

  private handleChannelSubscribeRequest(s: WebSocket, message: Message<SubscribeRequest>) {
    const { channel, type, payload } = message;
    const { baseTokenAddress, quoteTokenAddress, limit, snapshot } = payload;
    this.log('verbose', `User has requested ${channel} subscription with the following details:`);
    this.log('verbose', `\tBase token: ${baseTokenAddress}`);
    this.log('verbose', `\tQuote token: ${quoteTokenAddress}`);
    this.log('verbose', `\tInclude snapshot: ${snapshot}, Snapshot limit: ${limit}`);

    const channelHash = `${channel}.${type}:${baseTokenAddress}:${quoteTokenAddress}`;
    if (!this.channelSubscriptions.has(channelHash)) {
      this.log('debug', `First to subscribe to ${channelHash}, setting up channel`);
      this.channelSubscriptions.set(channelHash, new Set<WebSocket>());
    }
    const subscriptions = this.channelSubscriptions.get(channelHash) as Set<WebSocket>;

    if (subscriptions && subscriptions.size < 1) {
      this.redisSubscriber.subscribe(channelHash);
      this.log('debug', `Websocket node subscribed to ${channelHash}`);
    }
    subscriptions.add(s);
    this.channelSubscriptions.set(channelHash, subscriptions);
    this.log('debug', `Websocket client subscribed to ${channelHash}`);
  }

  private removeConnection(ws: WebSocket) {
    // need unsubscribe logic here.
    this.channelSubscriptions.forEach((subscriptions, channel) => {
      if (subscriptions.has(ws)) {
        this.log('verbose', `Unregistering disconnecting websocket from ${channel}`);
        subscriptions.delete(ws);
      }
    });
    this.log('debug', 'Websocket disconnected, unregistered subscriptions');
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}

// Bids will be sorted in descending order by price, and asks will be sorted in ascending order
// by price. Within the price sorted orders, the orders are further sorted first by total fees,
// then by expiration in ascending order.

// public requestChannelSubscription(ws: WebSocket, payload: SubscribeRequestPayload) {
//   // const channelHash = WebSocketFeed.getChannelHashFromPayload(payload);

//   // if wants snapshot, send snapshot
//   // get snapshot of the order paid from db
//   if (payload.snapshot) {
//     const limit = payload.limit || 100;
//     // const snapshot: SnapshotResponsePayload = getSnapshot(payload.baseTokenAddress, payload.quoteTokenAddress, limit)
//     // ws.send(snapshot)
//   }
// }

// private createChannelFromRequestPayload(p: SubscribeRequestPayload): Channel {
//   const { baseTokenAddress, quoteTokenAddress } = p;
//   const filter = signedOrder =>
//     (signedOrder.makerTokenAddress === baseTokenAddress ||
//       signedOrder.takerTokenAddress === baseTokenAddress) &&
//     (signedOrder.makerTokenAddress === quoteTokenAddress ||
//       signedOrder.takerTokenAddress === quoteTokenAddress);
//   return channel;
// }

// private subscribeToChannel(ws: WebSocket, channelId: number) {
//   const channel = this.channels.get(channelId);
//   if (!channel) {
//     this.log('error', `Tried to subscribe to channel #${channelId} but none exists`);
//     return false;
//   }
//   channel.addSubscriber(ws);
//   const subscriptions = this.subscriptions.get(ws) || [];
//   const updatedSubscriptions = [...subscriptions, channel];
//   return true;
// }

// +{
//   +    "type": "subscribe",
//   +    "channel": "orders",
//   +    "payload": {
//   +        "baseTokenAddress": "0x323b5d4c32345ced77393b3530b1eed0f346429d",
//   +        "quoteTokenAddress": "0xef7fff64389b814a946f3e92105513705ca6b990",
//   +        "snapshot": true,
//   +        "limit": 100
//   +    }
//   +}
