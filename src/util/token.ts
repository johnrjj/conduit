import { Token } from '0x.js';

const pairTokens = (arr: Array<Token>): Array<Array<string>> => {
  let accum: Array<Array<string>> = [];
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      const tokenA = arr[i];
      const tokenB = arr[j];
      accum.push([tokenA.address, tokenB.address]);
    }
  }
  return accum;
};

export { pairTokens };
