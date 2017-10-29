import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Request, NextFunction } from 'express';
import { RedisClient } from 'redis';
import { Message, SubscribeRequest, OrderbookSnapshot, AllMessageTypes } from './types';
import { Logger } from '../../util/logger';

export class WebSocketNode {
  private wsServerRef: WebSocket.Server;
  private subscriptions: WeakMap<WebSocket, Array<string>>;
  private channelSubscriptions: Map<string, Set<WebSocket>>;
  private redisSubscriber: RedisClient;
  private redisPublisher: RedisClient;
  private logger?: Logger;

  constructor({
    wss,
    redisPublisher,
    redisSubscriber,
    logger,
  }: {
    wss: WebSocket.Server;
    redisSubscriber: RedisClient;
    redisPublisher: RedisClient;
    logger?: Logger;
  }) {
    this.wsServerRef = wss;
    this.redisSubscriber = redisSubscriber;
    this.redisPublisher = redisPublisher;
    this.logger = logger;
    this.channelSubscriptions = new Map();

    this.redisSubscriber.on('message', (channel, message) => {
      console.log(channel, message);
      this.log('verobse', `Redis message received from websocket server: ${channel}`, message);
      if (!this.channelSubscriptions.has(channel)) {
        return;
      }
      const subscribers = this.channelSubscriptions.get(channel);
      if (!subscribers) {
        return;
      }
      subscribers.forEach(ws => ws.send(message));
    });
  }

  public acceptConnection(ws: WebSocket, req: Request, next: NextFunction): void {
    try {
      this.log('debug', `WebSocket connection connected and registered`);
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
      this.log('error', 'Error setting up websocket client', e);
      next(e);
    }
  }

  private handleChannelSubscribeRequest(ws: WebSocket, message: Message<SubscribeRequest>) {
    const { channel, type, payload } = message;
    const { baseTokenAddress, quoteTokenAddress, limit, snapshot } = payload;
    this.log('verbose', `User has requested ${channel} subscription with the following details:`);
    this.log('verbose', `\tBase token: ${baseTokenAddress}`);
    this.log('verbose', `\tQuote token: ${quoteTokenAddress}`);
    this.log('verbose', `\tInclude snapshot: ${snapshot}, Snapshot limit: ${limit}`);

    const subscriptionChannelHash = `${channel}.${type}:${baseTokenAddress}:${quoteTokenAddress}`;
    const updateChannelHash = `${channel}.update:${baseTokenAddress}:${quoteTokenAddress}`;

    this.addSubscription(ws, subscriptionChannelHash);
    this.addSubscription(ws, updateChannelHash);
  }

  private addSubscription(ws: WebSocket, channelToSubscribeTo: string) {
    if (!this.channelSubscriptions.has(channelToSubscribeTo)) {
      this.log('debug', `First client to subscribe to ${channelToSubscribeTo}, setting up channel`);
      this.channelSubscriptions.set(channelToSubscribeTo, new Set<WebSocket>());
    }
    const subscriptions = this.channelSubscriptions.get(channelToSubscribeTo) as Set<WebSocket>;

    if (subscriptions && subscriptions.size < 1) {
      this.redisSubscriber.subscribe(channelToSubscribeTo);
      this.log('debug', `WebSocket server node subscribed to ${channelToSubscribeTo}`);
    }
    subscriptions.add(ws);
    this.channelSubscriptions.set(channelToSubscribeTo, subscriptions);
    this.log('debug', `WebSocket client subscribed to ${channelToSubscribeTo}`);
  }

  private removeConnection(ws: WebSocket) {
    const channelsToRemove: Array<string> = [];
    this.channelSubscriptions.forEach((subscriptions, channel) => {
      if (subscriptions.has(ws)) {
        this.log('verbose', `Unregistering disconnecting websocket from ${channel}`);
        subscriptions.delete(ws);
      }
      if (subscriptions.size === 0) {
        // no client is listening to this, tell the websocket server to stop listening
        // but we don't wanna delete while looping (bad side effects)
        channelsToRemove.push(channel);
      }
    });
    channelsToRemove.forEach(channel => {
      this.channelSubscriptions.delete(channel);
      this.log('verbose', `WebSocket server no longer listening to ${channel}`);
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
