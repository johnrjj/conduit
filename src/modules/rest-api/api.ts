import * as bodyParser from 'body-parser';
import { Router } from 'express';
import { mapOrderApiPayloadToSignedOrder, mapZeroExPortalOrderJSONToSignedOrder } from './util';
import { OrderPayload, ApiOrderbookOptions, ZeroExPortalOrderJSON } from './types';
import { Relay } from '../client/types';
import { OrderFilterOptions, FeeQueryRequest, FeeQueryResponse } from '../../types';
import { validateEndpointSignedOrderBySchema } from '../../util/validate';
import { Logger } from '../../util/logger';

const v0ApiRouterFactory = (client: Relay, logger: Logger) => {
  const log = (level: string, message: string, meta?: any) => {
    if (!logger) {
      return;
    }
    logger.log(level, `REST API: ${message}`, meta);
  }

  const router = Router();
  router.use(bodyParser.json({ type: '*/*' }));
  router.use(bodyParser.urlencoded({ extended: true }));

  router.get('/token_pairs', async (req, res) => {
    const { page, per_page } = req.query;
    const pairs = await client.getTokenPairs({ page, perPage: per_page });
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
      log(
        'verbose',
        `Querying orderbook for ${baseTokenAddress} and ${quoteTokenAddress} pair`
      );
      const orderbookForTokenPair = await client.getOrderbook(baseTokenAddress, quoteTokenAddress);
      return res.status(201).json(orderbookForTokenPair);
    } catch (err) {
      log('error', 'Error querying for orderbook.', err);
      res.sendStatus(500);
    }
  });

  router.get('/orders', async (req, res) => {
    const options: OrderFilterOptions = req.query;
    const orders = await client.getOrders(options);
    res.status(201).json(orders);
  });

  router.get('/order/:orderHash', async (req, res) => {
    const { orderHash } = req.params;
    const order = await client.getOrder(orderHash);
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
    log('debug', 'Order endpoint hit, verifying order...');
    const { body } = req;
    const possibleOrder = body as OrderPayload;

    if (possibleOrder.taker === '') {
      // schema requires a taker, so if null/emptystring we assign empty hex
      log('debug', 'Order taker adress empty, assigning empty hex address');
      const EMPTY_TAKER_ADDRESS = '0x0000000000000000000000000000000000000000';
      possibleOrder.taker = EMPTY_TAKER_ADDRESS;
    }
    const validationInfo = validateEndpointSignedOrderBySchema(possibleOrder);
    if (!validationInfo.valid) {
      log('debug', 'Order validation failed');
      const e = {
        code: 101,
        status: 400,
        message: `Validation failed`,
        validationErrors: validationInfo.errors,
      };
      return next(e);
    }
    const signedOrder = mapOrderApiPayloadToSignedOrder(possibleOrder);
    try {
      const didAddOrder = await client.postOrder(signedOrder);
      res.sendStatus(201);
    } catch (e) {
      res.sendStatus(500);
    }
  });

  /**
   * @deprecated experimental for testing only, no validation included.
   */
  router.post('/zeroex-portal-order', async (req, res, next) => {
    log('debug', 'ZeroEx Portal Order Converter hit, adding order');
    const { body } = req;
    const payload = body as ZeroExPortalOrderJSON;
    const signedOrder = mapZeroExPortalOrderJSONToSignedOrder(payload);
    try {
      await client.postOrder(signedOrder);
      res.sendStatus(201);
    } catch (e) {
      res.sendStatus(500);
    }
  });

  // todo rename tokens
  router.get('/tokens', async (req, res) => {
    const tokens = await client.getTokens();
    res.status(201).json(tokens);
  });

  return router;
};

export { v0ApiRouterFactory };
