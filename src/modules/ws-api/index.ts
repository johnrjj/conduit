import * as WebSocket from 'ws';
import { Request, NextFunction } from 'express';
import { Message, SubscribeRequest, OrderbookSnapshot, AvailableMessageTypes } from './types';
import { Publisher } from '../publisher';
import { Subscriber } from '../subscriber';
import { Relay } from '../client/types';
import { Logger } from '../../util/logger';

interface ConnectionContext {
  socket: WebSocket;
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

    this.startHeartbeat();
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
    const context: ConnectionContext = { socket, subscriptions: [] };
    socket.on('error', err => this.log('error', JSON.stringify(err)));
    socket.on('close', this.onDisconnectFromClientSocket(context));
    socket.on('message', this.onMessageFromClientSocket(context));
    this.connections.add(context);
  }

  private onMessageFromClientSocket(context: ConnectionContext) {
    return message => {
      this.log('verbose', 'WebSocket server received message from a client WebSocket', message);
      const data = JSON.parse(message.toString());
      switch (data.type) {
        case 'subscribe':
          this.log('debug', `WebSocket subscribe request received`);
          const subscribeRequest = data as Message<SubscribeRequest>;
          this.handleSubscriptionRequest(context, subscribeRequest);
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

  private onDisconnectFromClientSocket(context: ConnectionContext) {
    return (code: number, reason: string) => {
      this.log('verbose', `WebSocket connection closed with code ${code}`, reason) ||
        this.connections.delete(context);
    };
  }

  private handleSubscriptionRequest(
    context: ConnectionContext,
    subscriptionRequest: Message<SubscribeRequest>
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
          const message: Message<OrderbookSnapshot> = {
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

  private startHeartbeat() {
    const sendHeartbeatToAllOpenConnections = () =>
      this.wsServerRef.clients.forEach(ws => {
        if (ws.readyState == ws.OPEN) {
          ws.send(JSON.stringify({ type: 'heartbeat' }));
        }
      });

    setInterval(() => {
      this.log('verbose', 'Sending heartbeat to all open client websocket connections');
      sendHeartbeatToAllOpenConnections();
    }, 20000);
  }
  3;

  private sendMessage(connectionContext: ConnectionContext, message: Message<any>): void {
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
