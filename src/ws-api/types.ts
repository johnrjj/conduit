import { SignedOrder } from '0x.js';

type MessageType = 'update' | 'snapshot' | 'fill';

type ChannelType = 'orderbook';

export interface Message<
  T extends SubscribeRequest | OrderbookSnapshot | OrderbookUpdate | OrderbookFill
> {
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

// NON STANDARD!! Relayer spec needs a way to communicate fill updates
// need to request additional data...
export type OrderbookFill = SignedOrder;

export type AllMessageTypes =
  | Message<SubscribeRequest>
  | Message<OrderbookSnapshot>
  | Message<OrderbookUpdate>
  | Message<OrderbookFill>;
