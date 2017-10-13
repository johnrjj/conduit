import { BigNumber } from 'bignumber.js';
import { SignedOrderRawApiPayload, SignedOrder } from '../types/0x-spec';
import { ZeroEx, SignedOrder as ZeroExSignedOrder } from '0x.js';

const convertApiPayloadToSignedOrder = (
  order: SignedOrderRawApiPayload
): SignedOrder => {
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

// private async validateFillOrderFireAndForgetAsync(orderJSON: string) {
//   let orderJSONErrMsg = '';
//   let parsedOrder: Order;
//   try {
//       const order = JSON.parse(orderJSON);
//       const validationResult = this.validator.validate(order, orderSchema);
//       if (validationResult.errors.length > 0) {
//           orderJSONErrMsg = 'Submitted order JSON is not a valid order';
//           utils.consoleLog(`Unexpected order JSON validation error: ${validationResult.errors.join(', ')}`);
//           return;
//       }
//       parsedOrder = order;

//       const exchangeContractAddr = this.props.blockchain.getExchangeContractAddressIfExists();
//       const makerAmount = new BigNumber(parsedOrder.maker.amount);
//       const takerAmount = new BigNumber(parsedOrder.taker.amount);
//       const expiration = new BigNumber(parsedOrder.expiration);
//       const salt = new BigNumber(parsedOrder.salt);
//       const parsedMakerFee = new BigNumber(parsedOrder.maker.feeAmount);
//       const parsedTakerFee = new BigNumber(parsedOrder.taker.feeAmount);
//       const orderHash = zeroEx.getOrderHash(parsedOrder.exchangeContract, parsedOrder.maker.address,
//                       parsedOrder.taker.address, parsedOrder.maker.token.address,
//                       parsedOrder.taker.token.address, parsedOrder.feeRecipient,
//                       makerAmount, takerAmount, parsedMakerFee, parsedTakerFee,
//                       expiration, salt);

//       const signature = parsedOrder.signature;
//       const isValidSignature = ZeroEx.isValidSignature(signature.hash, signature, parsedOrder.maker.address);
//       if (this.props.networkId !== parsedOrder.networkId) {
//           orderJSONErrMsg = `This order was made on another Ethereum network
//                              (id: ${parsedOrder.networkId}). Connect to this network to fill.`;
//           parsedOrder = undefined;
//       } else if (exchangeContractAddr !== parsedOrder.exchangeContract) {
//           orderJSONErrMsg = 'This order was made using a deprecated 0x Exchange contract.';
//           parsedOrder = undefined;
//       } else if (orderHash !== signature.hash) {
//           orderJSONErrMsg = 'Order hash does not match supplied plaintext values';
//           parsedOrder = undefined;
//       } else if (!isValidSignature) {
//           orderJSONErrMsg = 'Order signature is invalid';
//           parsedOrder = undefined;
//       } else {
//           // Update user supplied order cache so that if they navigate away from fill view
//           // e.g to set a token allowance, when they come back, the fill order persists
//           this.props.dispatcher.updateUserSuppliedOrderCache(parsedOrder);
//       }
//   } catch (err) {
//       if (!_.isEmpty(orderJSON)) {
//           orderJSONErrMsg = 'Submitted order JSON is not valid JSON';
//       }
//       this.setState({
//           didOrderValidationRun: true,
//           orderJSON,
//           orderJSONErrMsg,
//           parsedOrder,
//       });
//       return;
//   }

//   let unavailableTakerAmount = new BigNumber(0);
//   if (!_.isEmpty(orderJSONErrMsg)) {
//       // Clear cache entry if user updates orderJSON to invalid entry
//       this.props.dispatcher.updateUserSuppliedOrderCache(undefined);
//   } else {
//       const orderHash = parsedOrder.signature.hash;
//       unavailableTakerAmount = await this.props.blockchain.getUnavailableTakerAmountAsync(orderHash);
//       const isMakerTokenAddressInRegistry = await this.props.blockchain.isAddressInTokenRegistryAsync(
//           parsedOrder.maker.token.address,
//       );
//       const isTakerTokenAddressInRegistry = await this.props.blockchain.isAddressInTokenRegistryAsync(
//           parsedOrder.taker.token.address,
//       );
//       this.setState({
//           isMakerTokenAddressInRegistry,
//           isTakerTokenAddressInRegistry,
//       });
//   }

//   this.setState({
//       didOrderValidationRun: true,
//       orderJSON,
//       orderJSONErrMsg,
//       parsedOrder,
//       unavailableTakerAmount,
//   });

//   await this.checkForUntrackedTokensAndAskToAdd();
// }

export { convertApiPayloadToSignedOrder };
