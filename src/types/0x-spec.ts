import * as BigNumber from 'bignumber.js';

export interface TokenInfo {
  address: string;
  minAmount?: string;
  maxAmount?: string;
  precision?: number;
  // symbol and decimal now deprecated but I find them still useful
  symbol?: string;
  decimals?: number;
}

export interface TokenPair {
  [tokenName: string]: TokenInfo;
}

export interface ECSignature {
  v: number;
  r: string;
  s: string;
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
export interface SignedOrder extends Order {
  ecSignature: ECSignature;
}

export interface OrderApiPayload {
  signedOrder: {
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
    ecSignature: ECSignature;
  };
}

export enum OrderState {
  'OPEN' = 'OPEN',
  'EXPIRED' = 'EXPIRED',
  'CLOSED' = 'CLOSED',
  'UNFUNDED' = 'UNFUNDED',
}

export interface PendingState {
  fillAmount: string;
  pending: string;
}

export interface OrderbookOrder {
  signedOrder: SignedOrder;
  state: OrderState;
  remainingTakerTokenAmount: BigNumber.BigNumber;
  pending?: PendingState;
}

export interface FeeApiRequest {
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

export interface FeeApiResponse {
  feeRecipient: string;
  makerFee: string;
  takerFee: string;
}

export interface ApiOrderOptions {
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
  limit?: number;
}
