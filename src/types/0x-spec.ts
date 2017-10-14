import * as BigNumber from 'bignumber.js';

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  minAmount?: string;
  maxAmount?: string;
  precision?: number;
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

export interface ApiFeePayload {
  exchangeContractAddress: string;
  maker: string;
  taker: string;
  makerTokenAddress: string;
  takerTokenAddress: string;
  expirationUnixTimestampSec: BigNumber.BigNumber;
  salt: string;
  makerTokenAmount?: BigNumber.BigNumber;
  takerTokenAmount?: BigNumber.BigNumber;
}

export interface ApiFeeResponse {
  feeRecipient: string;
  makerFee: BigNumber.BigNumber;
  takerFee: BigNumber.BigNumber;
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

// export interface LogFillArgs {
//   maker: string;
//   taker: string;
//   feeRecipient: string;
//   makerToken: string;
//   takerToken: string;
//   filledMakerTokenAmount: BigNumber.BigNumber;
//   filledTakerTokenAmount: BigNumber.BigNumber;
//   paidMakerFee: BigNumber.BigNumber;
//   paidTakerFee: BigNumber.BigNumber;
//   tokens: string;
//   orderHash: string;
// }
