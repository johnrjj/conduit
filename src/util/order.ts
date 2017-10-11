import { BigNumber } from 'bignumber.js';
import { SignedOrderRawApiPayload, SignedOrder } from '../types/0x-spec';

const convertApiPayloadToSignedOrder = (
  order: SignedOrderRawApiPayload
): SignedOrder => {
  const parsedOrder: SignedOrder = Object.assign({}, order, {
    makerFee: new BigNumber(order.makerFee),
    takerFee: new BigNumber(order.takerFee),
    makerTokenAmount: new BigNumber(order.makerTokenAmount),
    takerTokenAmount: new BigNumber(order.takerTokenAmount),
    salt: new BigNumber(order.salt),
    expirationUnixTimestampSec: new BigNumber(order.expirationUnixTimestampSec),
  });
  return parsedOrder;
};

export { convertApiPayloadToSignedOrder };
