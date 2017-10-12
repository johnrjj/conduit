import * as bodyParser from 'body-parser';
import { Router } from 'express';
import { ZeroEx, Token, SignedOrder as ZeroExSignedOrder } from '0x.js';
import { validateEndpointSignedOrderBySchema } from '../util/validate';
import { pairTokens } from '../util/token';
import { convertApiPayloadToSignedOrder } from '../util/order';
import { Repository } from '../repositories';
import { SignedOrderRawApiPayload, TokenPair } from '../types/0x-spec';

const createRouter = (db: Repository, zeroEx: ZeroEx) => {
  const router: Router = Router();
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));

  router.get('/token_pairs', async (req, res) => {
    const tokens = await zeroEx.tokenRegistry.getTokensAsync();
    const pairs = pairTokens(tokens);
    res.status(201).json(pairs);
  });

  router.get('/orders', async (req, res) => {
    const orders = await db.getOrders();
    res.status(201).json(orders);
  });

  router.post('/order', async (req, res, next) => {
    const { body } = req;
    const order = body as SignedOrderRawApiPayload;
    // 0x must have a weird BigNumber setup, getting type errors only on that library. Need to cast
    const signedOrder = convertApiPayloadToSignedOrder(order);
    const zeroExSignedOrder = signedOrder as ZeroExSignedOrder;
    try {
      zeroEx.exchange.validateOrderFillableOrThrowAsync(zeroExSignedOrder);
    } catch (err) {
      const e = {
        code: 100,
        message: 'Order not fillable',
      };
      return next(e);
    }

    // not working correctly right now, thinks taker is not optional (but it is!), pr it?
    const validationInfo = validateEndpointSignedOrderBySchema(order);

    await db.postOrder(signedOrder);

    res.sendStatus(201);
  });
  return router;
};

export default createRouter;
