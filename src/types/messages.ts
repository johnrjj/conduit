export interface ConduitMessage {
  type: string;
}

export enum MessageTypes {
  'CONDUIT_ORDER_ADD' = 'CONDUIT.ORDER_ADD',
  'CONDUIT_ORDER_UPDATE' = 'CONDUIT.ORDER_UPDATE',
  'CONDUIT_UNKNOWN' = 'CONDUIT.UNKNOWN',
}

export interface ConduitOrderAddMessage extends ConduitMessage {
  sequence: number;
  time: string;
  order_id: string;
  price: string;
  remaining_size: string;
  side: string;
}

export interface ConduitOrderUpdateMessage extends ConduitMessage {
  sequence: number;
  time: string;
  order_id: string;
  price: string;
  remaining_size: string;
  side: string;
}
