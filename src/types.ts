import { BigNumber } from 'bignumber.js';
import {
  LogEvent,
  LogFillContractEventArgs,
  LogCancelContractEventArgs,
  LogErrorContractEventArgs,
  SignedOrder,
  ECSignature,
} from '0x.js';

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

// SignedOrder superset, need more guidance from zeroex about order metadata
export interface SignedOrderWithCurrentBalance extends SignedOrder {
  takerTokenAmountRemaining: BigNumber;
}

// SignedOrder superset, need more guidance from zeroex about order metadata
export interface SerializedSignedOrderWithCurrentBalance extends SerializedSignedOrder {
  takerTokenAmountRemaining: string;
}

export interface SerializedSignedOrder extends SerializedOrder {
  ecSignature: ECSignature;
}

export type ZeroExOrderFillEvent = LogFillContractEventArgs;
export type ZeroExOrderCancelEvent = LogCancelContractEventArgs;

export interface OrderbookPair {
  bids: Array<SignedOrder>;
  asks: Array<SignedOrder>;
}

export interface TokenPair {
  [token: string]: TokenInfo;
}

export interface TokenInfo {
  address: string;
  minAmount?: string;
  maxAmount?: string;
  precision?: number;
  symbol?: string; // nonstandard
}

export interface PaginationOptions {
  page?: number;
  perPage?: number;
}

export interface OrderFilterOptions extends PaginationOptions {
  ascByBaseToken?: string;
  exchangeContractAddress?: string;
  isExpired?: boolean;
  isOpen?: boolean;
  isClosed?: boolean;
  token?: string;
  makerTokenAddress?: string;
  takerTokenAddress?: string;
  // tokenA=&tokenB ?? how should we handle this?
  maker?: string;
  taker?: string;
  trader?: string;
  feeRecipient?: string;
}

export interface FeeQueryRequest {
  exchangeContractAddress: string;
  maker: string;
  taker: string;
  makerTokenAddress: string;
  takerTokenAddress: string;
  expirationUnixTimestampSec: string;
  salt: string;
  makerTokenAmount?: string;
  takerTokenAmount?: string;
}

export interface FeeQueryResponse {
  feeRecipient: string;
  makerFee: string;
  takerFee: string;
}

export class RoutingError extends Error {
  status?: number;
}
