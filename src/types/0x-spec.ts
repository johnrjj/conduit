import { BigNumber } from 'bignumber.js';

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  minAmount?: string;
  maxAmount?: string;
  precision?: number;
}

export interface TokenPair {
  tokenA: TokenInfo;
  tokenB: TokenInfo;
}

export interface ECSignature {
  v: number;
  r: string;
  s: string;
}

export interface Order {
  maker: string;
  taker: string;
  makerFee: BigNumber;
  takerFee: BigNumber;
  makerTokenAmount: BigNumber;
  takerTokenAmount: BigNumber;
  makerTokenAddress: string;
  takerTokenAddress: string;
  salt: BigNumber;
  exchangeContractAddress: string;
  feeRecipient: string;
  expirationUnixTimestampSec: BigNumber;
}

export interface SignedOrder extends Order {
  ecSignature: ECSignature;
}

export interface SignedOrderRawApiPayload {
  maker: string;
  taker: string;
  makerFee: string;
  takerFee: string;
  makerTokenAmount: string;
  takerTokenAmount: string;
  makerTokenAddress: string;
  takerTokenAddress: string;
  salt: string;
  exchangeContractAddress: string;
  feeRecipient: string;
  expirationUnixTimestampSec: string;
  ecSignature: ECSignature;
}

export enum OrderState {
  'OPEN' = 'OPEN',
  'EXPIRED' = 'EXPIRED',
  'CLOSED' = 'CLOSED',
  'UNFUNDED' = 'UNFUNDED',
}

enum availableCurrencyPairs {
  BTC_ETH = 'BTC-ETH',
  BTC_LTC = 'BTC-LTC',
  USDT_BTC = 'USDT-BTC',
  USDT_ETH = 'USDT-ETH',
  BTC_NEO = 'BTC-NEO',
  BTC_ARK = 'BTC-ARK',
  BTC_SYS = 'BTC-SYS',
}

export interface PendingState {
  fillAmount: string;
  pending: string;
}

export interface OrderbookOrder {
  signedOrder: SignedOrder;
  state: OrderState;
  remainingTakerTokenAmount: BigNumber;
  pending?: PendingState;
}

export interface ApiFeePayload {
  maker?: string;
  taker?: string;
  makerTokenAddress: string;
  takerTokenAddress: string;
  makerTokenAmount: BigNumber;
  takerTokenAmount: BigNumber;
}

export interface ApiFeeResponse {
  feeRecipient: string;
  takerToSpecify: string;
  makerFee: BigNumber;
  takerFee: BigNumber;
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

export interface LogFillArgs {
  maker: string;
  taker: string;
  feeRecipient: string;
  makerToken: string;
  takerToken: string;
  filledMakerTokenAmount: BigNumber;
  filledTakerTokenAmount: BigNumber;
  paidMakerFee: BigNumber;
  paidTakerFee: BigNumber;
  tokens: string;
  orderHash: string;
}
