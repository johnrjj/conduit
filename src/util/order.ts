import { BigNumber } from 'bignumber.js';
import { OrderApiPayload, SignedOrder } from '../types/0x-spec';
import { ZeroEx, SignedOrder as ZeroExSignedOrder } from '0x.js';

const convertApiPayloadToSignedOrder = (payload: OrderApiPayload): SignedOrder => {
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

export { convertApiPayloadToSignedOrder };
