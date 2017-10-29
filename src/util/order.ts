import { SignedOrder } from '0x.js';
import { SerializedSignedOrder } from '../types';

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

export { serializeSignedOrder };
