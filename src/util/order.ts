import { SignedOrder } from '0x.js';
import { SerializedSignedOrder, SerializedOrder } from '../types';
import { BigNumber } from 'bignumber.js';

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

const deserializeSignedOrder = (serializedSignedOrder: SerializedSignedOrder): SignedOrder => {
  const order: SignedOrder = {
    exchangeContractAddress: serializedSignedOrder.exchangeContractAddress,
    maker: serializedSignedOrder.maker,
    taker: serializedSignedOrder.taker,
    makerTokenAddress: serializedSignedOrder.makerTokenAddress,
    takerTokenAddress: serializedSignedOrder.takerTokenAddress,
    feeRecipient: serializedSignedOrder.feeRecipient,
    makerTokenAmount: new BigNumber(serializedSignedOrder.makerTokenAmount),
    takerTokenAmount: new BigNumber(serializedSignedOrder.takerTokenAmount),
    makerFee: new BigNumber(serializedSignedOrder.makerFee),
    takerFee: new BigNumber(serializedSignedOrder.takerFee),
    expirationUnixTimestampSec: new BigNumber(serializedSignedOrder.expirationUnixTimestampSec),
    salt: new BigNumber(serializedSignedOrder.salt),
    ecSignature: {
      v: serializedSignedOrder.ecSignature.v,
      r: serializedSignedOrder.ecSignature.r,
      s: serializedSignedOrder.ecSignature.s,
    },
  };
  return order;
};

export { serializeSignedOrder, deserializeSignedOrder };
