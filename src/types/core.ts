import * as BigNumber from 'bignumber.js';
import {
  LogEvent,
  LogFillContractEventArgs,
  LogCancelContractEventArgs,
  LogErrorContractEventArgs,
} from '0x.js';

export enum OrderState {
  'OPEN' = 'OPEN',
  'EXPIRED' = 'EXPIRED',
  'CLOSED' = 'CLOSED',
  'UNFUNDED' = 'UNFUNDED',
}

export type OrderHash = string;

export interface Order {
  exchangeContractAddress: string;
  maker: string;
  taker: string;
  makerTokenAddress: string;
  takerTokenAddress: string;
  feeRecipient: string;
  makerTokenAmount: BigNumber.BigNumber;
  takerTokenAmount: BigNumber.BigNumber;
  makerFee: BigNumber.BigNumber;
  takerFee: BigNumber.BigNumber;
  expirationUnixTimestampSec: BigNumber.BigNumber;
  salt: BigNumber.BigNumber;
}

export interface SerializedOrder {
  exchangeContractAddress: string;
  maker: string;
  taker: string;
  makerTokenAddress: string;
  takerTokenAddress: string;
  feeRecipient: string;
  makerTokenAmount: string;
  takerTokenAmount: string;
  makerFee: string;
  takerFee: string;
  expirationUnixTimestampSec: string;
  salt: string;
}

export interface ECSignature {
  v: number;
  r: string;
  s: string;
}

export interface SignedOrder extends Order {
  ecSignature: ECSignature;
}

export interface SerializedSignedOrder extends SerializedOrder {
  ecSignature: ECSignature;
}

export interface OrderbookOrder {
  signedOrder: SignedOrder;
  state: OrderState;
  remainingTakerTokenAmount: BigNumber.BigNumber;
}

export interface SerializedOrderbookOrder {
  signedOrder: SerializedSignedOrder;
  state: OrderState;
  remainingTakerTokenAmount: string;
}

export class RoutingError extends Error {
  status?: number;
}

export type BlockchainLogEvent = LogEvent<
  LogFillContractEventArgs | LogCancelContractEventArgs | LogErrorContractEventArgs
>;
export type OrderFillMessage = LogFillContractEventArgs;
export type OrderCancelMessage = LogCancelContractEventArgs;
