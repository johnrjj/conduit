import * as WebSocket from 'ws';
import { Request, NextFunction } from 'express';
import { RedisClient } from 'redis';
import { Message, SubscribeRequest } from './types';
import { RelayDatabase } from '../relay';
import { Logger } from '../../util/logger';

export class WebSocketNode {
  private wsServerRef: WebSocket.Server;
  private channelSubscriptions: Map<string, Set<WebSocket>>;
  private redisSubscriber: RedisClient;
  private redisPublisher: RedisClient;
  private relay: RelayDatabase;
  private logger?: Logger;

  constructor({
    wss,
    redisPublisher,
    redisSubscriber,
    relay,
    logger,
  }: {
    wss: WebSocket.Server;
    redisSubscriber: RedisClient;
    redisPublisher: RedisClient;
    relay: RelayDatabase;
    logger?: Logger;
  }) {
    this.wsServerRef = wss;
    this.redisSubscriber = redisSubscriber;
    this.redisPublisher = redisPublisher;
    this.relay = relay;
    this.logger = logger;
    this.channelSubscriptions = new Map();

    this.redisSubscriber.on('message', (channel, message) => {
      this.log('verbose', `WebSocket server received redis message: ${channel}`, message);
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

  public async acceptConnection(ws: WebSocket, req: Request, next: NextFunction): Promise<void> {
    try {
      this.log('debug', `WebSocket connection connected and registered`);
      ws.on('close', n => this.removeClientWebSocketConnection(ws));
      ws.on('message', async message => {
        this.log('verbose', 'WebSocket node received message from client', message);
        const data = JSON.parse(message.toString());
        switch (data.type) {
          case 'subscribe':
            this.log('debug', `Subscribe request received`);
            const subscribeRequest = data as Message<SubscribeRequest>;
            await this.handleChannelSubscribeRequest(ws, subscribeRequest);
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

  private async handleChannelSubscribeRequest(ws: WebSocket, message: Message<SubscribeRequest>) {
    const { channel, type, payload } = message;
    const { baseTokenAddress, quoteTokenAddress, limit, snapshot } = payload;
    this.log('verbose', `User has requested ${channel} subscription with the following details:`);
    this.log('verbose', `\tBase token: ${baseTokenAddress}`);
    this.log('verbose', `\tQuote token: ${quoteTokenAddress}`);
    this.log('verbose', `\tInclude snapshot: ${snapshot}, Snapshot limit: ${limit}`);

    const updateChannelHash = `${channel}.update:${baseTokenAddress}:${quoteTokenAddress}`;
    this.addClientChannelSubscription(ws, updateChannelHash);

    // Temporary - will use redis to communicate/request to snapshot relay db
    // Just getting a feel for it, GDAX does it a bit differently (REST call for snapshot, queue up ws messages)
    if (snapshot) {
      const snapshotChannelHash = `${channel}.snapshot:${baseTokenAddress}:${quoteTokenAddress}`;
      this.addClientChannelSubscription(ws, snapshotChannelHash);
      const orderbook = await this.relay.getOrderbook(baseTokenAddress, quoteTokenAddress);
      this.redisPublisher.publish(snapshotChannelHash, JSON.stringify(orderbook));
    }
  }

  private addClientChannelSubscription(ws: WebSocket, channelToSubscribeTo: string) {
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

  private removeClientWebSocketConnection(ws: WebSocket) {
    this.channelSubscriptions.forEach((channelSubscribers, channel) => {
      if (channelSubscribers.has(ws)) {
        this.removeClientChannelSubscription(ws, channel);
      }
    });
    this.pruneChannels();
    this.log('debug', 'Websocket disconnected, unregistered subscriptions');
  }

  private removeClientChannelSubscription(ws, channelName) {
    const channelSubscribers = this.channelSubscriptions.get(channelName);
    if (channelSubscribers && channelSubscribers.has(ws)) {
      this.log('verbose', `Unregistering websocket from ${channelName}`);
      channelSubscribers.delete(ws);
    }
  }

  private pruneChannels() {
    const channelsToRemove: Array<string> = [];
    this.channelSubscriptions.forEach((subscribers, channelName) => {
      if (subscribers.size === 0) {
        channelsToRemove.push(channelName);
      }
    });
    channelsToRemove.forEach(channel => {
      this.channelSubscriptions.delete(channel);
      this.log('verbose', `WebSocket server no longer listening to ${channel}`);
    });
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}
