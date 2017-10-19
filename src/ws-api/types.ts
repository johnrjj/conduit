import { SignedOrder } from '0x.js';

export interface MessageRequest<T extends SubscribeRequestPayload | SnapshotResponsePayload> {
  type: string;
  channel: string;
  payload: T;
}

export interface SubscribeRequestPayload {
  baseTokenAddress: string;
  quoteTokenAddress: string;
  snapshot?: boolean;
  limit?: number;
}

export interface SnapshotResponsePayload {
  bids: Array<SignedOrder>;
  asks: Array<SignedOrder>;
}

type OrderUpdateResponsePayload = SignedOrder;
