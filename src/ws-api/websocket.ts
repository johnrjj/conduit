import * as WebSocket from 'ws';
import { Request, NextFunction } from 'express';
import { MessageRequest, SubscribeRequestPayload, SnapshotResponsePayload } from './types';
import { Logger } from '../util/logger';

class Channel {
  private subscribers: Set<WebSocket> = new Set();
  private filter: (msg) => boolean = () => true;

  constructor({ filter }: { filter: (msg) => boolean }) {
    this.filter = filter;
  }

  public removeSubscriber(ws: WebSocket) {
    this.subscribers.delete(ws);
  }

  public addSubscriber(ws: WebSocket) {
    this.subscribers.add(ws);
  }
}

interface Filter {}

export class WebSocketFeed {
  private websockets: Set<WebSocket>;
  private wsServerRef: WebSocket.Server;
  private subscriptions: WeakMap<WebSocket, Array<Channel>>;
  private logger?: Logger;
  private channels: Map<number, Channel>;
  private channelIdCounter = 0;

  constructor({ logger, wss }: { logger?: Logger; wss: WebSocket.Server }) {
    this.websockets = new Set();
    this.logger = logger;
    this.wsServerRef = wss;
  }

  public acceptConnection(ws: WebSocket, req: Request, next: NextFunction): void {
    try {
      this.log('debug', `Websocket connection connected and registered`);
      this.websockets.add(ws);
      ws.on('close', n => console.log(n) || this.removeConnection(ws));
      ws.on('message', message => {
        const data = JSON.parse(message.toString());
        switch (data.type) {
          case 'subscribe':
            this.log('debug', `Subscribe request received`);
            const subscribeRequest = data as MessageRequest<SubscribeRequestPayload>;
            this.requestChannelSubscription(ws, subscribeRequest.payload);
            break;
          default:
            this.log('debug', `Unrecognized message type ${data.type} received from client websocket`);
            break;
        }
        console.log(data);
      });
    } catch (e) {
      this.log('error', e);
      next(e);
    }
  }

  public broadcast(message: string, ...args: any[]) {
    this.wsServerRef.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private static getChannelHashFromPayload(p: SubscribeRequestPayload): string {
    return `${p.baseTokenAddress}-${p.baseTokenAddress}`;
  }

  public requestChannelSubscription(ws: WebSocket, payload: SubscribeRequestPayload) {
    const channelHash = WebSocketFeed.getChannelHashFromPayload(payload);

    // if wants snapshot, send snapshot
    // get snapshot of the order paid from db
    if (payload.snapshot) {
      const limit = payload.limit || 100;
      // const snapshot: SnapshotResponsePayload = getSnapshot(payload.baseTokenAddress, payload.quoteTokenAddress, limit)
      // ws.send(snapshot)
    }

    const newChannel = this.createChannelFromRequestPayload(payload);
    const channelId = this.channelIdCounter++;
    this.log('debug', `Created new channel ${channelId}, ${channelHash}`);
    this.channels.set(channelId, newChannel);
    this.subscribeToChannel(ws, channelId);
    this.log('debug', `Subscribed websocket to $channel ${channelId}`);
  }

  private addChannel(id: number, c: Channel) {
    this.channels.set(id, c);
  }

  private createChannelFromRequestPayload(p: SubscribeRequestPayload): Channel {
    const { baseTokenAddress, quoteTokenAddress } = p;
    const filter = signedOrder =>
      (signedOrder.makerTokenAddress === baseTokenAddress ||
        signedOrder.takerTokenAddress === baseTokenAddress) &&
      (signedOrder.makerTokenAddress === quoteTokenAddress ||
        signedOrder.takerTokenAddress === quoteTokenAddress);
    const channel = new Channel({ filter });
    return channel;
  }

  private subscribeToChannel(ws: WebSocket, channelId: number) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      this.log('error', `Tried to subscribe to channel #${channelId} but none exists`);
      return false;
    }
    channel.addSubscriber(ws);
    const subscriptions = this.subscriptions.get(ws) || [];
    const updatedSubscriptions = [...subscriptions, channel];
    return true;
  }

  private removeConnection(ws: WebSocket) {
    this.log('debug', 'Websocket disconnected, unregistering');
    this.websockets.delete(ws);
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}

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
