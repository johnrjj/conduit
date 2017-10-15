import { OrderbookOrder, OrderApiPayload } from '../types/0x-spec';

const mapOrderToApiSchema = (o: OrderbookOrder): OrderApiPayload => {
  const { signedOrder}  = o;
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

export { 
  mapOrderToApiSchema,
}
