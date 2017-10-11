import { Router } from 'express';
import * as bodyParser from 'body-parser';
import { Repository } from '../repositories';
import { validateEndpointSignedOrderBySchema } from '../util/validate';
import { SignedOrderRawApiPayload } from '../types/0x-spec';
import { convertApiPayloadToSignedOrder } from '../util/order';

const createRouter = (db: Repository) => {
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
    const signedOrder = convertApiPayloadToSignedOrder(order);

    // not working correctly right now, thinks taker is not optional (but it is!!!), pr it?
    const validationInfo = validateEndpointSignedOrderBySchema(order);

    await db.postOrder(signedOrder);

    res.status(201).send('OK');
  });

  return router;
};

export default createRouter;
