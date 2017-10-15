import * as express from 'express';
import * as WebSocket from 'ws';

export class WebSocketFeed {
  private ws: WebSocket;
  public acceptConnection(ws: WebSocket, req: express.Request): void {
    this.ws = ws;
  }
}
