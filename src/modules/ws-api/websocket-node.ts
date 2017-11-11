import * as WebSocket from 'ws';
import { Request, NextFunction } from 'express';
import { RedisClient } from 'redis';
import { Message, SubscribeRequest } from './types';
import { Relay } from '../relay';
import { Logger } from '../../util/logger';

export class WebSocketNode {
  private wsServerRef: WebSocket.Server;
  private channelSubscriptions: Map<string, Set<WebSocket>>;
  private redisSubscriber: RedisClient;
  private redisPublisher: RedisClient;
  private relay: Relay;
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
    relay: Relay;
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
        this.log('verbose', 'WebSocket server received message from a client WebSocket', message);
        const data = JSON.parse(message.toString());
        switch (data.type) {
          case 'subscribe':
            this.log('debug', `WebSocket subscribe request received`);
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

    // subscribe to update & fill channels for token pair
    const updateChannelHash = `${channel}.update:${baseTokenAddress}:${quoteTokenAddress}`;
    const fillChannelHash = `${channel}.fill:${baseTokenAddress}:${quoteTokenAddress}`;
    this.addClientChannelSubscription(ws, updateChannelHash);
    this.addClientChannelSubscription(ws, fillChannelHash);
    // Temporary - will use redis to communicate/request to snapshot relay db
    // subscribe to snapshot channel for token pair
    if (snapshot) {
      const snapshotChannelHash = `${channel}.snapshot:${baseTokenAddress}:${quoteTokenAddress}`;
      this.addClientChannelSubscription(ws, snapshotChannelHash);
      this.log('verbose', `Generating and sending snapshot for channel ${snapshotChannelHash}`);
      const orderbook = await this.relay.getOrderbook(baseTokenAddress, quoteTokenAddress);
      const message = this.packageMessage({
        type: 'snapshot',
        channel: 'orderbook',
        payload: orderbook,
        channelId: 0,
      });
      this.redisPublisher.publish(snapshotChannelHash, JSON.stringify(message));
    }
  }

  private packageMessage({ type, channel, channelId, payload }) {
    return {
      type: 'snapshot',
      channel: 'orderbook',
      // "channelId": 1,
      payload,
    };
  }

  private addClientChannelSubscription(ws: WebSocket, channelToSubscribeTo: string) {
    if (!this.channelSubscriptions.has(channelToSubscribeTo)) {
      this.log(
        'verbose',
        `First client to subscribe to ${channelToSubscribeTo}, setting up channel`
      );
      this.channelSubscriptions.set(channelToSubscribeTo, new Set<WebSocket>());
    }
    const subscriptions = this.channelSubscriptions.get(channelToSubscribeTo) as Set<WebSocket>;

    if (subscriptions && subscriptions.size < 1) {
      this.redisSubscriber.subscribe(channelToSubscribeTo);
      this.log('verbose', `WebSocket server node subscribed to ${channelToSubscribeTo}`);
    }
    subscriptions.add(ws);
    this.channelSubscriptions.set(channelToSubscribeTo, subscriptions);
    this.log('verbose', `WebSocket client subscribed to ${channelToSubscribeTo}`);

    this.log('debug', `Added a subscription for ${channelToSubscribeTo}`);
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
      this.log('verbose', `Removed a subscription for ${channelName}`);
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
      this.log('verbose', `Removed WebSocket Server's subscription to ${channel}`);
    });
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}
