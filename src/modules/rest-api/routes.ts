import * as bodyParser from 'body-parser';
import { Router } from 'express';
import { ZeroEx } from '0x.js';
import { mapOrderApiPayloadToSignedOrder, mapZeroExPortalOrderJSONToSignedOrder } from './util';
import { Relay } from '../relay';
import {
  PaginationOptions,
  OrderFilterOptions,
  FeeQueryRequest,
  FeeQueryResponse,
} from '../../types';
import { validateEndpointSignedOrderBySchema } from '../../util/validate';
import { Logger } from '../../util/logger';
import { OrderPayload, ApiOrderbookOptions, ZeroExPortalOrderJSON } from './types';

const createRouter = (db: Relay, zeroEx: ZeroEx, logger: Logger) => {
  const router = Router();
  router.use(bodyParser.json({ type: '*/*' }));
  router.use(bodyParser.urlencoded({ extended: true }));

  router.get('/token_pairs', async (req, res) => {
    const { page, per_page } = req.query;
    const pairs = await db.getTokenPairs({ page, perPage: per_page });
    res.status(201).json(pairs);
  });

  router.get('/orderbook', async (req, res, next) => {
    const { baseTokenAddress, quoteTokenAddress }: ApiOrderbookOptions = req.query;
    if (!baseTokenAddress) {
      res.status(400);
      return next({ errorMessage: 'baseTokenAddress missing' });
    }
    if (!quoteTokenAddress) {
      res.status(400);
      return next({ errorMessage: 'quoteTokenAddress missing' });
    }
    try {
      logger.log(
        'verbose',
        `Querying orderbook for ${baseTokenAddress} and ${quoteTokenAddress} pair`
      );
      const orderbookForTokenPair = await db.getOrderbook(baseTokenAddress, quoteTokenAddress);
      return res.status(201).json(orderbookForTokenPair);
    } catch (err) {
      logger.log('error', 'Error querying for orderbook.', err);
      res.sendStatus(500);
    }
  });

  router.get('/orders', async (req, res) => {
    const options: OrderFilterOptions = req.query;
    const orders = await db.getOrders(options);
    res.status(201).json(orders);
  });

  router.get('/order/:orderHash', async (req, res) => {
    const { orderHash } = req.params;
    const order = await db.getOrder(orderHash);
    if (!order) {
      return res.sendStatus(404);
    }
    res.json(order);
  });

  router.post('/fees', async (req, res) => {
    const { body } = req;
    const payload = body as FeeQueryRequest;
    // right now, no fees
    const response: FeeQueryResponse = {
      feeRecipient: '0x0000000000000000000000000000000000000000',
      makerFee: '0',
      takerFee: '0',
    };
    res.json(response);
  });

  router.post('/order', async (req, res, next) => {
    logger.log('debug', 'Order endpoint hit, verifying order...');
    const { body } = req;
    const possibleOrder = body as OrderPayload;

    if (possibleOrder.taker === '') {
      // schema requires a taker, so if null/emptystring we assign empty hex
      logger.log('debug', 'Order taker adress empty, assigning empty hex address');
      const EMPTY_TAKER_ADDRESS = '0x0000000000000000000000000000000000000000';
      possibleOrder.taker = EMPTY_TAKER_ADDRESS;
    }

    const validationInfo = validateEndpointSignedOrderBySchema(possibleOrder);
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

    const signedOrder = mapOrderApiPayloadToSignedOrder(possibleOrder);
    const orderHash = await ZeroEx.getOrderHashHex(signedOrder);
    logger.log('debug', `Order hash: ${orderHash}`);

    try {
      await zeroEx.exchange.validateOrderFillableOrThrowAsync(signedOrder);
      logger.log('debug', `Order ${orderHash} is fillable`);
    } catch (err) {
      logger.log('debug', `Order ${orderHash} is not fillable`);
      const e = {
        code: 100,
        message: 'Order not fillable',
      };
      return next(e);
    }

    const isValidSig = await ZeroEx.isValidSignature(
      orderHash,
      possibleOrder.ecSignature,
      possibleOrder.maker
    );
    if (!isValidSig) {
      logger.log('debug', `Invalid signature for order: ${orderHash}`);
      const e = {
        code: 1005,
        message: 'Invalid signature',
      };
      return next(e);
    }

    logger.log('info', `Order ${orderHash} passed validation, adding to database`);
    try {
      const didAddOrder = await db.postOrder(orderHash, signedOrder);
      logger.log('info', `Added order ${orderHash} to database successfully`);
      res.sendStatus(201);
    } catch (e) {
      logger.log('error', `Error adding order ${orderHash} to database`, e);
      res.sendStatus(500);
    }
  });

  /**
   * @deprecated experimental for testing only, no validation included.
   */
  router.post('/zeroex-portal-order', async (req, res, next) => {
    logger.log('debug', 'ZeroEx Portal Order Converter hit, adding order');
    const { body } = req;
    const payload = body as ZeroExPortalOrderJSON;
    const signedOrder = mapZeroExPortalOrderJSONToSignedOrder(payload);
    const orderHash = await ZeroEx.getOrderHashHex(signedOrder);
    try {
      await db.postOrder(orderHash, signedOrder);
      logger.log('info', `Added order ${orderHash} to database successfully`);
      res.sendStatus(201);
    } catch (e) {
      logger.log('error', 'Error adding ZeroEx Portal Order to database', e);
      res.sendStatus(500);
    }
  });

  /**
   * @deprecated
   */
  router.get('/tokens', async (req, res) => {
    const tokens = await zeroEx.tokenRegistry.getTokensAsync();
    res.status(201).json(tokens);
  });

  return router;
};

export default createRouter;
