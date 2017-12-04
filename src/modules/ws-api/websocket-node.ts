import * as WebSocket from 'ws';
import { Request, NextFunction } from 'express';
import {
  WebSocketMessage,
  SubscribeRequest,
  OrderbookSnapshot,
  AvailableMessageTypes,
  OrderbookUpdate,
} from './types';
import { Publisher } from '../publisher';
import { Subscriber } from '../subscriber';
import { Relay } from '../client/types';
import { Logger } from '../../util/logger';
import { ORDER_UPDATED, OrderAdded, OrderEvent, OrderUpdated, ORDER_ADDED } from '../events';
import { serializeSignedOrder } from '../../util/order';

interface ConnectionContext {
  socket: WebSocket;
  initialized: boolean;
  subscriptions: Array<string>;
  subscriptionCount: number;
  subscriptionIdMap: Map<string, number>;
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
    this.log('verbose', `WebSocket node subscribing to ORDER_ADDED message channel`);
    const orderAddedSubId = this.subscriber.subscribe(
      ORDER_ADDED,
      (payload: OrderEvent<OrderAdded>) => {
        this.log('verbose', `Received message from redis for added order`);
        this.onOrderAddOrUpdateEvent(payload);
      }
    );
    this.log('verbose', `WebSocket node subscribing to ORDER_UPDATED message channel`);
    const orderUpdateSubId = this.subscriber.subscribe(
      ORDER_UPDATED,
      (payload: OrderEvent<OrderUpdated>) => {
        this.log('verbose', `Received message from redis for updated order`);
        this.onOrderAddOrUpdateEvent(payload);
      }
    );
  }

  public async connectionHandler(
    socket: WebSocket,
    req: Request,
    next: NextFunction
  ): Promise<void> {
    this.log('verbose', 'WebSocket client connected to WebSocket Server');
    const connectionContext: ConnectionContext = {
      socket,
      subscriptions: [],
      initialized: false,
      subscriptionCount: 0,
      subscriptionIdMap: new Map(),
    };
    socket.on('error', err => this.log('error', JSON.stringify(err)));
    socket.on('close', this.handleDisconnectFromClientSocket(connectionContext));
    socket.on('message', this.onMessageFromClientSocket(connectionContext));
    this.connections.add(connectionContext);
  }

  private onOrderAddOrUpdateEvent(orderAddEvent: OrderEvent<OrderAdded | OrderUpdated>) {
    const { baseTokenAddress, quoteTokenAddress } = orderAddEvent.payload;
    const subscriptionChannel = `${baseTokenAddress}-${quoteTokenAddress}`;

    this.connections.forEach(connection => {
      if (connection.subscriptions.find(s => s === subscriptionChannel)) {
        const channelId = connection.subscriptionIdMap.get(subscriptionChannel) || 0;
        const message: WebSocketMessage<OrderbookUpdate> = {
          type: 'update',
          channel: 'orderbook',
          channelId,
          payload: serializeSignedOrder(orderAddEvent.payload.order),
        };
        this.sendMessage(connection, message);
      }
    });
  }

  private onMessageFromClientSocket(connectionContext: ConnectionContext) {
    return message => {
      // initialize
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
      let data = { type: 'default' };
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
    const channelId = context.subscriptionCount++;
    context.subscriptionIdMap.set(subscriptionChannel, channelId);
    context.subscriptions.push(subscriptionChannel);

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
