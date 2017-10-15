import { BigNumber } from 'bignumber.js';
import { ZeroEx, SignedOrder as ZeroExSignedOrder } from '0x.js';
import { OrderbookOrder, SignedOrder } from '../types/core';
import { OrderApiPayload } from '../types/relayer-spec';

const mapOrderToApiSchema = (o: OrderbookOrder): OrderApiPayload => {
  const { signedOrder } = o;
  const mapped = {
    signedOrder: {
      exchangeContractAddress: signedOrder.exchangeContractAddress,
      maker: signedOrder.maker,
      taker: signedOrder.taker,
      makerTokenAddress: signedOrder.makerTokenAddress,
      takerTokenAddress: signedOrder.takerTokenAddress,
      feeRecipient: signedOrder.feeRecipient,
      makerTokenAmount: signedOrder.makerTokenAmount.toString(),
      takerTokenAmount: signedOrder.takerTokenAmount.toString(),
      makerFee: signedOrder.makerFee.toString(),
      takerFee: signedOrder.takerFee.toString(),
      expirationUnixTimestampSec: signedOrder.expirationUnixTimestampSec.toString(),
      salt: signedOrder.salt.toString(),
      ecSignature: signedOrder.ecSignature,
    },
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

export { mapOrderToApiSchema, mapOrderApiPayloadToSignedOrder };
