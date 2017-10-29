export interface OrderPayload {
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
  ecSignature: {
    v: number;
    r: string;
    s: string;
  };
}

export interface PaginationParams {
  page: number;
  per_page: number;
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

export interface ApiOrderbookOptions {
  baseTokenAddress: string;
  quoteTokenAddress: string;
}

export interface ApiOrderOptions extends PaginationParams {
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

export interface ZeroExPortalOrderJSON {
  maker: {
    address: string;
    token: {
      name: string;
      symbol: string;
      decimals: number;
      address: string;
    };
    amount: string;
    feeAmount: string;
  };
  taker: {
    address: string;
    token: {
      name: string;
      symbol: string;
      decimals: number;
      address: string;
    };
    amount: string;
    feeAmount: string;
  };
  expiration: string;
  feeRecipient: string;
  salt: string;
  signature: {
    v: number;
    r: string;
    s: string;
    hash: string;
  };
  exchangeContract: string;
  networkId: number;
}
