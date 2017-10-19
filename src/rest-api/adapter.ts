import { BigNumber } from 'bignumber.js';
import { ZeroEx, SignedOrder as ZeroExSignedOrder } from '0x.js';
import { OrderbookOrder, SignedOrder } from '../types/core';
import { OrderApiPayload } from './types';
import { serializeSignedOrder } from '../util/order';

const mapSignedOrderToOrderApiPayload = (o: OrderbookOrder): OrderApiPayload => {
  const { signedOrder } = o;
  const mapped = {
    signedOrder: serializeSignedOrder(signedOrder),
  };
  return mapped;
};

const mapOrderApiPayloadToSignedOrder = (payload: OrderApiPayload): SignedOrder => {
  const order = payload.signedOrder;
  const parsedOrder = {
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

export { serializeSignedOrder, mapSignedOrderToOrderApiPayload, mapOrderApiPayloadToSignedOrder };
