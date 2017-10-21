import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Request, NextFunction } from 'express';
import { MessageRequest, SubscribeRequestPayload, SnapshotResponsePayload } from './types';
import { Logger } from '../util/logger';

// class Channel {
//   private subscribers: Set<WebSocket> = new Set();
//   private filter: (msg) => boolean = () => true;

//   public removeSubscriber(ws: WebSocket) {
//     this.subscribers.delete(ws);
//   }

//   public addSubscriber(ws: WebSocket) {
//     this.subscribers.add(ws);
//   }
// }

export class WebSocketNode {
  private websockets: Set<WebSocket>;
  private wsServerRef: WebSocket.Server;
  private subscriptions: WeakMap<WebSocket, Array<string>>;
  private logger?: Logger;
  private channelsAvailable = ['orderbook'];

  constructor({
    logger,
    wss,
    client,
    subscription,
  }: {
    logger?: Logger;
    wss: WebSocket.Server;
    client: EventEmitter;
    subscription: EventEmitter;
  }) {
    this.websockets = new Set();
    this.logger = logger;
    this.wsServerRef = wss;
  }

  public acceptConnection(ws: WebSocket, req: Request, next: NextFunction): void {
    try {
      this.log('debug', `Websocket connection connected and registered`);
      this.websockets.add(ws);
      ws.on('close', n => this.removeConnection(ws));
      ws.on('message', message => {
        const data = JSON.parse(message.toString());
        switch (data.type) {
          case 'subscribe':
            this.log('debug', `Subscribe request received`);
            const subscribeRequest = data as MessageRequest<SubscribeRequestPayload>;
            this.handleSubscribeRequest(ws, subscribeRequest);
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

  private handleSubscribeRequest(s: WebSocket, message: MessageRequest<SubscribeRequestPayload>) {
    const { channel, type, payload } = message;
    const { baseTokenAddress, quoteTokenAddress, limit, snapshot } = payload;
    console.log(`user has requested ${channel} subscription with the following details`);
    console.log(`base token: ${baseTokenAddress}`);
    console.log(`quote token: ${quoteTokenAddress}`);
    console.log(`include snapshot: ${snapshot}, snapshot limit: ${limit}`);
    // register
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

  public handleReceiveMessageFromExchange(channel: string, msg: any) {}
}

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
