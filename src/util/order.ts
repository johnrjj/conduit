import { OrderbookOrder, SignedOrder } from '../types/core';
import { OrderApiPayload } from '../types/relayer-spec';
import { SerializedSignedOrder, SerializedOrderbookOrder } from '../types/core';

const serializeSignedOrder = (signedOrder: SignedOrder): SerializedSignedOrder => {
  const serializedSignedOrder = {
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
  };
  return serializedSignedOrder;
};

const serializeOrderbookOrder = (orderbookOrder: OrderbookOrder): SerializedOrderbookOrder => {
  const serializedOrderbookOrder: SerializedOrderbookOrder = {
    signedOrder: serializeSignedOrder(orderbookOrder.signedOrder),
    state: orderbookOrder.state,
    remainingTakerTokenAmount: orderbookOrder.remainingTakerTokenAmount.toString(),
  };
  return serializedOrderbookOrder;
};

export { serializeSignedOrder, serializeOrderbookOrder };
