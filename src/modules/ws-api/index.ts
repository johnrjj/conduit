import * as WebSocket from 'ws';
import { Request, NextFunction } from 'express';
import {
  WebSocketMessage,
  SubscribeRequest,
  OrderbookSnapshot,
  AvailableMessageTypes,
} from './types';
import { Publisher } from '../publisher';
import { Subscriber } from '../subscriber';
import { Relay } from '../client/types';
import { Logger } from '../../util/logger';

interface ConnectionContext {
  socket: WebSocket;
  initialized: boolean;
  subscriptions: Array<string>;
}

export class WebSocketNode {
  private wsServerRef: WebSocket.Server;
  private publisher: Publisher;
  private subscriber: Subscriber;
  private relay: Relay;
  private logger?: Logger;
  private connections: Set<ConnectionContext>;
  constructor({
    relay,
    wss,
    publisher,
    subscriber,
    logger,
  }: {
    relay: Relay;
    wss: WebSocket.Server;
    publisher: Publisher;
    subscriber: Subscriber;
    logger?: Logger;
  }) {
    this.relay = relay;
    this.wsServerRef = wss;
    this.publisher = publisher;
    this.subscriber = subscriber;
    this.logger = logger;
    this.connections = new Set();

    const subId = this.subscriber.subscribe('Order.Update', payload => {
      // todo, refactor messaging across modules...
      console.log(payload);
    });
  }

  public async connectionHandler(
    socket: WebSocket,
    req: Request,
    next: NextFunction
  ): Promise<void> {
    this.log('verbose', 'WebSocket client connected to WebSocket Server');
    const connectionContext: ConnectionContext = { socket, subscriptions: [], initialized: false };
    socket.on('error', err => this.log('error', JSON.stringify(err)));
    socket.on('close', this.handleDisconnectFromClientSocket(connectionContext));
    socket.on('message', this.onMessageFromClientSocket(connectionContext));
    this.connections.add(connectionContext);
  }

  private onMessageFromClientSocket(connectionContext: ConnectionContext) {
    return message => {
      if (!connectionContext.initialized) {
        this.sendKeepAlive(connectionContext);
        const keepAliveTimer = setInterval(() => {
          if (connectionContext.socket.readyState === WebSocket.OPEN) {
            this.sendKeepAlive(connectionContext);
          } else {
            clearInterval(keepAliveTimer);
            if (this.connections.has(connectionContext)) {
              this.log('debug', 'Keepalive found a stale connection, removing');
              this.handleDisconnectFromClientSocket(connectionContext);
            }
          }
        }, 20000);
        connectionContext.initialized = true;
      }

      this.log('verbose', 'WebSocket server received message from a client WebSocket', message);
      let data = { type: 'default ' };
      try {
        data = JSON.parse(message.toString());
      } catch {
        data = message;
      }
      switch (data.type) {
        case 'subscribe':
          this.log('debug', `WebSocket subscribe request received`);
          const subscribeRequest = data as WebSocketMessage<SubscribeRequest>;
          this.handleSubscriptionRequest(connectionContext, subscribeRequest);
          break;
        default:
          this.log(
            'debug',
            `Unrecognized message type ${data.type} received from client websocket`
          );
          break;
      }
    };
  }

  private handleDisconnectFromClientSocket(context: ConnectionContext) {
    return (code: number, reason: string) => {
      this.log('verbose', `WebSocket connection closed with code ${code}`, reason) ||
        this.connections.delete(context);
    };
  }

  private handleSubscriptionRequest(
    context: ConnectionContext,
    subscriptionRequest: WebSocketMessage<SubscribeRequest>
  ) {
    const { channel, type, payload } = subscriptionRequest;
    const { baseTokenAddress, quoteTokenAddress, limit, snapshot: snapshotRequested } = payload;
    const subscriptionChannel = `${baseTokenAddress}-${quoteTokenAddress}`;
    context.subscriptions.push(subscriptionChannel);
    const channelId = context.subscriptions.length;

    if (snapshotRequested) {
      this.relay
        .getOrderbook(baseTokenAddress, quoteTokenAddress)
        .then(snapshot => {
          const message: WebSocketMessage<OrderbookSnapshot> = {
            type: 'snapshot',
            channel: 'orderbook',
            channelId,
            payload: snapshot,
          };
          this.sendMessage(context, message);
        })
        .catch(e => this.log('error', `Error getting snapshot for ${subscriptionChannel}`));
    }
  }

  private sendKeepAlive(connectionContext: ConnectionContext): void {
    this.sendMessage(connectionContext, { type: 'keepalive', channel: 'keepalive', payload: {} });
  }

  private sendMessage(connectionContext: ConnectionContext, message: WebSocketMessage<any>): void {
    if (message && connectionContext.socket.readyState === WebSocket.OPEN) {
      connectionContext.socket.send(JSON.stringify(message));
    }
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}
