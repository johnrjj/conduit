export interface ConduitMessage {
  type: string;
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
