import { Router } from 'express';
import * as bodyParser from 'body-parser';
import { BigNumber } from 'bignumber.js';
import { Repository, InMemoryRepository } from '../repositories';
import { validateEndpointSignedOrderBySchema } from './validate';
import { SignedOrderRawApiPayload, SignedOrder } from '../types/0x-spec';

const db: Repository = new InMemoryRepository();

const parseOrder = (order: SignedOrderRawApiPayload): SignedOrder => {
  const parsedOrder: SignedOrder = Object.assign({}, order, {
    makerFee: new BigNumber(order.makerFee),
    takerFee: new BigNumber(order.takerFee),
    makerTokenAmount: new BigNumber(order.makerTokenAmount),
    takerTokenAmount: new BigNumber(order.takerTokenAmount),
    salt: new BigNumber(order.salt),
    expirationUnixTimestampSec: new BigNumber(order.expirationUnixTimestampSec),
  });
  return parsedOrder;
};

const router: Router = Router();
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.get('/orders', async (req, res) => {
  const orders = await db.getOrders();
  res.status(201).json(orders);
});

router.post('/order', async (req, res) => {
  const { body } = req;
  console.log(JSON.stringify(body));

  const order = body as SignedOrderRawApiPayload;
  const parsedOrder: SignedOrder = parseOrder(order);

  // not working correctly right now, thinks taker is not optional (but it is!!!), pr it?
  const validationInfo = validateEndpointSignedOrderBySchema(order);
  console.log(validationInfo.toString());
  console.log(validationInfo.errors.toString());

  await db.postOrder(parsedOrder);

  res.status(201).send('OK');
});

export default router;
