CREATE TABLE "public"."tokens" (
    "address" text,
    "symbol" text,
    "name" text,
    "min_amount" text,
    "max_amount" text,
    "precision" int,
    PRIMARY KEY ("address")
);



INSERT INTO "public"."tokens"("address", "alias", "min_amount", "max_amount", "precision") VALUES('0x323b5d4c32345ced77393b3530b1eed0f346429d', 'tokenA', '0', '10000000000000000000', 5) RETURNING "address", "alias", "min_amount", "max_amount", "precision";
INSERT INTO "public"."tokens"("address", "alias", "min_amount", "max_amount", "precision") VALUES('0xef7fff64389b814a946f3e92105513705ca6b990', 'tokenB', '0', '50000000000000000000', 5) RETURNING "address", "alias", "min_amount", "max_amount", "precision";


INSERT INTO "public"."token_pairs"("base_token", "quote_token") VALUES('0x323b5d4c32345ced77393b3530b1eed0f346429d', '0xef7fff64389b814a946f3e92105513705ca6b990') RETURNING "id", "base_token", "quote_token";


select 
t1.address as base_token_address,
t1.alias as base_token_alias,
t1.min_amount as base_token_min_amount,
t1.max_amount as base_token_max_amount,
t1.precision as base_token_precision,
t2.address as quote_token_address,
t2.alias as quote_token_alias,
t2.min_amount as quote_token_min_amount,
t2.max_amount as quote_token_max_amount,
t2.precision as quote_token_precision
from token_pairs tp
INNER JOIN tokens t1 ON (tp.base_token = t1.address)
INNER JOIN tokens t2 ON (tp.quote_token = t2.address)



