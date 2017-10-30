import { BigNumber } from 'bignumber.js';
import { SignedOrder } from '0x.js';
import { OrderPayload, ZeroExPortalOrderJSON } from './types';

const mapOrderApiPayloadToSignedOrder = (payload: OrderPayload): SignedOrder => {
  const order = payload;
  const parsedOrder: SignedOrder = {
    maker: order.maker,
    taker: order.taker,
    makerFee: new BigNumber(order.makerFee),
    takerFee: new BigNumber(order.takerFee),
    makerTokenAmount: new BigNumber(order.makerTokenAmount),
    makerTokenAddress: order.makerTokenAddress,
    takerTokenAmount: new BigNumber(order.takerTokenAmount),
    takerTokenAddress: order.takerTokenAddress,
    salt: new BigNumber(order.salt),
    exchangeContractAddress: order.exchangeContractAddress,
    feeRecipient: order.feeRecipient,
    expirationUnixTimestampSec: new BigNumber(order.expirationUnixTimestampSec),
    ecSignature: order.ecSignature,
  };
  return parsedOrder;
};

const mapZeroExPortalOrderJSONToSignedOrder = (payload: ZeroExPortalOrderJSON): SignedOrder => {
  const order = payload;
  const parsedOrder: SignedOrder = {
    maker: order.maker.address,
    taker: order.taker.address,
    makerFee: new BigNumber(order.maker.feeAmount),
    takerFee: new BigNumber(order.taker.feeAmount),
    makerTokenAmount: new BigNumber(order.maker.amount),
    makerTokenAddress: order.maker.token.address,
    takerTokenAmount: new BigNumber(order.taker.amount),
    takerTokenAddress: order.taker.token.address,
    salt: new BigNumber(order.salt),
    exchangeContractAddress: order.exchangeContract,
    feeRecipient: order.feeRecipient,
    expirationUnixTimestampSec: new BigNumber(order.expiration),
    ecSignature: {
      r: order.signature.r,
      s: order.signature.s,
      v: order.signature.v,
    },
  };
  return parsedOrder;
};

export { mapOrderApiPayloadToSignedOrder, mapZeroExPortalOrderJSONToSignedOrder };
