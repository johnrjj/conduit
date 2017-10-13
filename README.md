# 0x Relayer API in Node/Express

[Work in progress, PR/Contributions welcome!]

ZeroEx Open Source Relayer using the [Open Orderbook](https://0xproject.com/wiki#Open-Orderbook) strategy.

Follows ZeroEx [Standard Relayer API V0 Draft](https://github.com/0xProject/standard-relayer-api) specification.


### Dev Setup

To start the local dev server: 

```
yarn install
yarn start
```
The server is hosted at `http://localhost:3000`

To make sure it is working, make a GET request to `http://localhost:3000/api/v0/token_pairs` 