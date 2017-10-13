import * as bodyParser from 'body-parser';
import { Router } from 'express';
import { ZeroEx, Token, SignedOrder as ZeroExSignedOrder } from '0x.js';
import { validateEndpointSignedOrderBySchema } from '../util/validate';
import { pairTokens } from '../util/token';
import { convertApiPayloadToSignedOrder } from '../util/order';
import { Logger } from '../util/logger';
import { Orderbook } from '../orderbook';
import { SignedOrderRawApiPayload, TokenPair, ApiOrderOptions } from '../types/0x-spec';

const createRouter = (repo: Orderbook, zeroEx: ZeroEx, logger: Logger) => {
  const router = Router();
  router.use(bodyParser.json({ type: '*/*' }));
  router.use(bodyParser.urlencoded({ extended: true }));

  router.get('/token_pairs', async (req, res) => {
    const tokens = await zeroEx.tokenRegistry.getTokensAsync();
    const pairs = pairTokens(tokens);
    res.status(201).json(pairs);
  });

  router.get('/orders', async (req, res) => {
    const options: ApiOrderOptions = req.query;
    const orders = await repo.getOrders(options);
    res.status(201).json(orders);
  });

  router.get('order/:orderHash', async (req, res) => {
    const { orderHash } = req.params;
    const order = await repo.getOrder(orderHash);
    if (!order) {
      return res.sendStatus(404);
    }
    // todo next - convert back to api spec
  });

  router.post('/order', async (req, res, next) => {
    logger.log('debug', 'Order endpoint hit, order verifying...');
    const { body } = req;
    const order = body as SignedOrderRawApiPayload;

    if (!order.taker || order.taker === '') {
      // schema requires a taker, so if null/emptystring we assign empty hex
      const EMPTY_TAKER_ADDRESS = '0x0000000000000000000000000000000000000000';
      order.taker = EMPTY_TAKER_ADDRESS;
    }

    const validationInfo = validateEndpointSignedOrderBySchema(order);
    if (!validationInfo.valid) {
      logger.log('debug', 'Order validation failed');
      const e = {
        code: 101,
        status: 400,
        message: `Validation failed`,
        validationErrors: validationInfo.errors,
      };
      return next(e);
    }

    // 0x must have a weird BigNumber setup, getting type errors only on that library. Need to cast
    const signedOrder = convertApiPayloadToSignedOrder(order);
    const zeroExSignedOrder = signedOrder as ZeroExSignedOrder;

    const orderHash = await ZeroEx.getOrderHashHex(zeroExSignedOrder);
    logger.log('debug', `Order hash: ${orderHash}`);

    try {
      await zeroEx.exchange.validateOrderFillableOrThrowAsync(zeroExSignedOrder);
      logger.log('debug', `Order ${orderHash} fillable`);
    } catch (err) {
      logger.log('debug', `Order ${orderHash} is not fillable`);
      const e = {
        code: 100,
        message: 'Order not fillable',
      };
      return next(e);
    }

    const contractAddress = await zeroEx.exchange.getContractAddressAsync();
    logger.log('debug', `Contract address: ${contractAddress}`);

    const isValidSig = await ZeroEx.isValidSignature(orderHash, order.ecSignature, order.maker);
    if (!isValidSig) {
      logger.log('debug', `Invalid signature for order: ${orderHash}`);
      const e = {
        code: 1005,
        message: 'Invalid signature',
      };
      return next(e);
    }

    logger.log('info', `Order ${orderHash} passed validation, adding to orderbook`);
    await repo.postOrder(orderHash, signedOrder);
    res.sendStatus(201);
  });
  return router;
};

export default createRouter;
