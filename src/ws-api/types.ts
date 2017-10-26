import { SignedOrder } from '0x.js';

enum MessageType {
  'update' = 'update',
  'snapshot' = 'snapshot',
}

enum ChannelType {
  'orderbook' = 'orderbook',
}

export interface Message<T extends SubscribeRequest | OrderbookSnapshot | OrderbookUpdate> {
  type: MessageType;
  channel: ChannelType;
  payload: T;
}

export interface SubscribeRequest {
  baseTokenAddress: string;
  quoteTokenAddress: string;
  snapshot?: boolean;
  limit?: number;
}

export interface OrderbookSnapshot {
  bids: Array<SignedOrder>;
  asks: Array<SignedOrder>;
}

export type OrderbookUpdate = SignedOrder;

export type AllMessageTypes =
  | Message<SubscribeRequest>
  | Message<OrderbookSnapshot>
  | Message<OrderbookUpdate>;
