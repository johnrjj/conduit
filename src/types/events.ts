import { SerializedOrderbookOrder } from './core';

export interface ConduitEvent {
  type: string;
  time: string;
}

export enum EventTypes {
  'CONDUIT_ORDER_ADD' = 'CONDUIT.ORDER_ADD',
  'CONDUIT_ORDER_UPDATE' = 'CONDUIT.ORDER_UPDATE',
  'CONDUIT_UNKNOWN' = 'CONDUIT.UNKNOWN',
}

export interface ConduitOrderAddEvent extends ConduitEvent, SerializedOrderbookOrder {}

export interface ConduitOrderUpdateEvent extends ConduitEvent, SerializedOrderbookOrder {}
