import { readFileSync } from 'fs';
import { ZeroEx, SignedOrder as ZeroExSignedOrder } from '0x.js';
import { OrderbookOrder } from '../types/0x-spec';
import { InMemoryDatabase } from '../orderbook/in-memory-orderbook';

const generateInMemoryDbFromJson = (zeroEx: ZeroEx): InMemoryDatabase => {
  const json = readFileSync('./src/test-data/internal-orderbook-array.json', 'utf8');
  const parsed: Array<OrderbookOrder> = JSON.parse(json);
  const orderbook: Map<string, OrderbookOrder> = parsed.reduce((orderbook, order) => {
    const signedOrder = order.signedOrder;
    const orderHash: string = ZeroEx.getOrderHashHex(signedOrder as ZeroExSignedOrder);
    orderbook.set(orderHash, order);
    return orderbook;
  }, new Map<string, OrderbookOrder>());
  const db: InMemoryDatabase = {
    orderbook,
  };
  return db;
};

export { generateInMemoryDbFromJson };
