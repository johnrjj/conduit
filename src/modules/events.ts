import { Token, SignedOrder } from '0x.js';
import { TokenPair } from '../types';

// Event types
export const TOKEN_ADDED = 'TOKEN_ADDED';
export const TOKEN_PAIR_ADDED = 'TOKEN_PAIR_ADDED';
export const ORDER_UPDATED = 'ORDER_UPDATED';
export const ORDER_ADDED = 'ORDER_ADDED';

export interface OrderEvent<T extends OrderAdded | OrderUpdated | TokenAdded | TokenPairAdded> {
  type: string;
  payload: T;
}

export interface OrderAdded {
  order: SignedOrder;
}

export interface OrderUpdated {
  order: SignedOrder;
}

export interface TokenAdded {
  token: Token;
}

export interface TokenPairAdded {
  baseTokenAddress: string;
  quoteTokenAddress: string;
}

// Event creator
export const orderAdded = (order: SignedOrder): OrderEvent<OrderAdded> => {
  return {
    type: ORDER_ADDED,
    payload: {
      order,
    },
  };
};

export const orderUpdated = (order: SignedOrder): OrderEvent<OrderUpdated> => {
  return {
    type: ORDER_UPDATED,
    payload: {
      order,
    },
  };
};

export const tokenAdded = (token: Token): OrderEvent<TokenAdded> => {
  return {
    type: TOKEN_ADDED,
    payload: {
      token,
    },
  };
};

export const tokenPairAdded = (
  baseTokenAddress: string,
  quoteTokenAddress: string
): OrderEvent<TokenPairAdded> => {
  return {
    type: TOKEN_PAIR_ADDED,
    payload: {
      baseTokenAddress,
      quoteTokenAddress,
    },
  };
};
