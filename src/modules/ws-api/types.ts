import { SignedOrder } from '0x.js';
import { SerializedSignedOrder, SerializedSignedOrderWithCurrentBalance } from '../../types';

type MessageType = 'update' | 'snapshot' | 'fill';

type ChannelType = 'orderbook';

export interface Message<
  T extends SubscribeRequest | OrderbookSnapshot | OrderbookUpdate | OrderbookFill
> {
  type: MessageType;
  channel: ChannelType;
  channelId?: number;
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

export type OrderbookUpdate = SerializedSignedOrder;

// NON STANDARD!! Relayer spec needs a way to communicate fill updates
// need to request additional data...
export interface OrderbookFill extends SerializedSignedOrderWithCurrentBalance {
  filledMakerTokenAmount: string;
  filledTakerTokenAmount: string;
}

export type AvailableMessageTypes =
  | Message<SubscribeRequest>
  | Message<OrderbookSnapshot>
  | Message<OrderbookUpdate>
  | Message<OrderbookFill>;
