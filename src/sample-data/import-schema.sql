--
-- PostgreSQL database dump
--

-- Dumped from database version 10.0
-- Dumped by pg_dump version 10.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: johnjohnson
--

CREATE TABLE orders (
    exchange_contract_address text NOT NULL,
    maker text NOT NULL,
    taker text NOT NULL,
    maker_token_address text NOT NULL,
    taker_token_address text NOT NULL,
    fee_recipient text NOT NULL,
    ec_sig_r text,
    ec_sig_s text,
    order_hash text NOT NULL,
    taker_token_remaining_amount numeric,
    maker_token_amount numeric NOT NULL,
    taker_token_amount numeric NOT NULL,
    maker_fee numeric NOT NULL,
    taker_fee numeric NOT NULL,
    expiration_unix_timestamp_sec numeric NOT NULL,
    salt numeric NOT NULL,
    ec_sig_v numeric
);


ALTER TABLE orders OWNER TO johnjohnson;

--
-- Name: token_pairs; Type: TABLE; Schema: public; Owner: johnjohnson
--

CREATE TABLE token_pairs (
    id integer NOT NULL,
    base_token text NOT NULL,
    quote_token text NOT NULL
);


ALTER TABLE token_pairs OWNER TO johnjohnson;

--
-- Name: token_pairs_id_seq; Type: SEQUENCE; Schema: public; Owner: johnjohnson
--

CREATE SEQUENCE token_pairs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE token_pairs_id_seq OWNER TO johnjohnson;

--
-- Name: token_pairs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: johnjohnson
--

ALTER SEQUENCE token_pairs_id_seq OWNED BY token_pairs.id;


--
-- Name: tokens; Type: TABLE; Schema: public; Owner: johnjohnson
--

CREATE TABLE tokens (
    address text NOT NULL,
    symbol text,
    min_amount text,
    max_amount text,
    "precision" integer,
    name text
);


ALTER TABLE tokens OWNER TO johnjohnson;

--
-- Name: token_pairs id; Type: DEFAULT; Schema: public; Owner: johnjohnson
--

ALTER TABLE ONLY token_pairs ALTER COLUMN id SET DEFAULT nextval('token_pairs_id_seq'::regclass);


--
-- Name: token_pairs base_token_quote_token_combination_unique; Type: CONSTRAINT; Schema: public; Owner: johnjohnson
--

ALTER TABLE ONLY token_pairs
    ADD CONSTRAINT base_token_quote_token_combination_unique UNIQUE (base_token, quote_token);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: johnjohnson
--

ALTER TABLE ONLY orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_hash);


--
-- Name: token_pairs token_pairs_pkey; Type: CONSTRAINT; Schema: public; Owner: johnjohnson
--

ALTER TABLE ONLY token_pairs
    ADD CONSTRAINT token_pairs_pkey PRIMARY KEY (id);


--
-- Name: tokens tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: johnjohnson
--

ALTER TABLE ONLY tokens
    ADD CONSTRAINT tokens_pkey PRIMARY KEY (address);


--
-- PostgreSQL database dump complete
--

