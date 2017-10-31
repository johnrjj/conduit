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

export interface ApiOrderbookOptions {
  baseTokenAddress: string;
  quoteTokenAddress: string;
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
