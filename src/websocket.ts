import * as express from 'express';
import * as WebSocket from 'ws';
import { Logger } from './util/logger';

export class WebSocketFeed {
  private ws: WebSocket;
  private logger?: Logger;
  constructor({ logger }: { logger?: Logger }) {
    this.logger = logger;
  }

  public acceptConnection(ws: WebSocket, req: express.Request): void {
    this.log('info', `Registered ${ws.url} to websocket feed`);
    this.ws = ws;
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}
