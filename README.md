# 0x Relayer API in Node/Express

[Work in progress, PR/Contributions welcome! Testing on Kovan test network]

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


### Roadmap

I'll be adding support for [Matching](https://0xproject.com/wiki#Matching) as soon as [this proposal](https://github.com/0xProject/ZEIPs/issues/2) is implemented. I personally think the matching strategy will lead to a better UX (atomic, no race conditions, faster relay feedback), but currently requires large upfront capital. Matching engine will use sorted sets on top of red-black trees.