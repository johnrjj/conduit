import { Token, SignedOrder } from '0x.js';
import { TokenPair } from '../types';

// Event types
const TOKEN_ADDED = 'TOKEN_ADDED';
const TOKEN_PAIR_ADDED = 'TOKEN_PAIR_ADDED';
const ORDER_UPDATED = 'ORDER_UPDATED';
const ORDER_ADDED = 'ORDER_ADDED';

interface OrderMessage<T extends OrderAdded | OrderUpdated | TokenAdded | TokenPairAdded> {
  type: string;
  payload: T;
}

interface OrderAdded {
  order: SignedOrder;
}

interface OrderUpdated {
  order: SignedOrder;
}

interface TokenAdded {
  token: Token;
}

interface TokenPairAdded {
  tokenPair: TokenPair;
}

// Event creator
const orderAdded = (order: SignedOrder): OrderMessage<OrderAdded> => {
  return {
    type: ORDER_ADDED,
    payload: {
      order,
    },
  };
};

const orderUpdated = (order: SignedOrder): OrderMessage<OrderUpdated> => {
  return {
    type: ORDER_UPDATED,
    payload: {
      order,
    },
  };
};

const tokenAdded = (token: Token): OrderMessage<TokenAdded> => {
  return {
    type: TOKEN_ADDED,
    payload: {
      token,
    },
  };
};

const tokenPairAdded = (tokenPair: TokenPair): OrderMessage<TokenPairAdded> => {
  return {
    type: TOKEN_PAIR_ADDED,
    payload: {
      tokenPair,
    },
  };
};
