---
title: day 1 - data warehouse on aws
description: day 1 data warehouse on aws
author: haimtran
publishedDate: 28/07/2023
date: 28/07/2023
---

## Introduction

- Create a Redshift Cluster
- Connection Options
- Simple COPY and queries
- Database, Table, Materialized View

## Redshift Cluster

- Subnet Group
- Parameter Group
- Associate Roles
- Users, Group, Grant
- System tables, default database

## Connections

- Query Editor V2
- UI, BI tools such as SQL Workbench, pgweb (JDBC, ODBC)
- Redshift Data API such as python, aws clid redshift-data
- Python driver, connection libraries such as redshift_connector, psycop2

## Basic Queries

- COPY to load data from S3 to Redshift
- Create database, table, views
- Simple queries to check performance

About data size

```json
REGION (5 rows) - 2s
CUSTOMER (15M rows) – 2m
ORDERS - (76M rows) - 10s
PART - (20M rows) - 2m
SUPPLIER - (1M rows) - 10s
LINEITEM - (303M rows) - 22s
PARTSUPPLIER - (80M rows) - 15s
```

Let check the size of the data

```bash
aws s3 ls --summarize --human-readable --recursive s3://redshift-immersionday-labs/data/
```

[workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/9f29cdba-66c0-445e-8cbb-28a092cb5ba7/en-US/lab2)

```sql
DROP TABLE IF EXISTS partsupp;
DROP TABLE IF EXISTS lineitem;
DROP TABLE IF EXISTS supplier;
DROP TABLE IF EXISTS part;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customer;
DROP TABLE IF EXISTS nation;
DROP TABLE IF EXISTS region;

CREATE TABLE region (
  R_REGIONKEY bigint NOT NULL,
  R_NAME varchar(25),
  R_COMMENT varchar(152))
diststyle all;

CREATE TABLE nation (
  N_NATIONKEY bigint NOT NULL,
  N_NAME varchar(25),
  N_REGIONKEY bigint,
  N_COMMENT varchar(152))
diststyle all;

create table customer (
  C_CUSTKEY bigint NOT NULL,
  C_NAME varchar(25),
  C_ADDRESS varchar(40),
  C_NATIONKEY bigint,
  C_PHONE varchar(15),
  C_ACCTBAL decimal(18,4),
  C_MKTSEGMENT varchar(10),
  C_COMMENT varchar(117))
diststyle all;

create table orders (
  O_ORDERKEY bigint NOT NULL,
  O_CUSTKEY bigint,
  O_ORDERSTATUS varchar(1),
  O_TOTALPRICE decimal(18,4),
  O_ORDERDATE Date,
  O_ORDERPRIORITY varchar(15),
  O_CLERK varchar(15),
  O_SHIPPRIORITY Integer,
  O_COMMENT varchar(79))
distkey (O_ORDERKEY)
sortkey (O_ORDERDATE);

create table part (
  P_PARTKEY bigint NOT NULL,
  P_NAME varchar(55),
  P_MFGR  varchar(25),
  P_BRAND varchar(10),
  P_TYPE varchar(25),
  P_SIZE integer,
  P_CONTAINER varchar(10),
  P_RETAILPRICE decimal(18,4),
  P_COMMENT varchar(23))
diststyle all;

create table supplier (
  S_SUPPKEY bigint NOT NULL,
  S_NAME varchar(25),
  S_ADDRESS varchar(40),
  S_NATIONKEY bigint,
  S_PHONE varchar(15),
  S_ACCTBAL decimal(18,4),
  S_COMMENT varchar(101))
diststyle all;

create table lineitem (
  L_ORDERKEY bigint NOT NULL,
  L_PARTKEY bigint,
  L_SUPPKEY bigint,
  L_LINENUMBER integer NOT NULL,
  L_QUANTITY decimal(18,4),
  L_EXTENDEDPRICE decimal(18,4),
  L_DISCOUNT decimal(18,4),
  L_TAX decimal(18,4),
  L_RETURNFLAG varchar(1),
  L_LINESTATUS varchar(1),
  L_SHIPDATE date,
  L_COMMITDATE date,
  L_RECEIPTDATE date,
  L_SHIPINSTRUCT varchar(25),
  L_SHIPMODE varchar(10),
  L_COMMENT varchar(44))
distkey (L_ORDERKEY)
sortkey (L_RECEIPTDATE);

create table partsupp (
  PS_PARTKEY bigint NOT NULL,
  PS_SUPPKEY bigint NOT NULL,
  PS_AVAILQTY integer,
  PS_SUPPLYCOST decimal(18,4),
  PS_COMMENT varchar(199))
diststyle even;
```

then COPY data from S3

```sql
COPY region FROM 's3://redshift-immersionday-labs/data/region/region.tbl.lzo'
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy customer from 's3://redshift-immersionday-labs/data/customer/customer.tbl.'
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy orders from 's3://redshift-immersionday-labs/data/orders/orders.tbl.'
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy part from 's3://redshift-immersionday-labs/data/part/part.tbl.'
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy supplier from 's3://redshift-immersionday-labs/data/supplier/supplier.json' manifest
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy lineitem from 's3://redshift-immersionday-labs/data/lineitem-part/'
iam_role default
region 'us-west-2' gzip delimiter '|' COMPUPDATE PRESET;

copy partsupp from 's3://redshift-immersionday-labs/data/partsupp/partsupp.tbl.'
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;
```

Data validation

```sql
 --Number of rows= 5
select count(*) from region;

 --Number of rows= 25
select count(*) from nation;

 --Number of rows= 76,000,000
select count(*) from orders;
```

Find top 10 cutomers by joining customer table with orders table

```sql
select c_name, sum(o_totalprice) as total_purchase from (
  select c_name, o_totalprice from customer, orders
  where customer.c_custkey = orders.o_custkey
) group by c_name order by total_purchase desc limit 10
```

## Sample Dataset

- Amazon reivew dataset
- From labs
- Amazon Data Exchange

## Reference

- [redshift immersion day](https://catalog.workshops.aws/redshift-immersion/en-US)

- [redshift workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/380e0b8a-5d4c-46e3-95a8-82d68cf5789a/en-US/gettingstarted/lab2)

- [redshift management guide](https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-parameter-groups.html)

- [redshift deveopment guide](https://docs.aws.amazon.com/redshift/latest/dg/welcome.html)

- [wml setting](https://docs.aws.amazon.com/redshift/latest/dg/cm-c-defining-query-queues.html#wlm-timeout)

- [redshift quota and limit](https://docs.aws.amazon.com/redshift/latest/mgmt/amazon-redshift-limits.html)

- [parameter group default value](https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-parameter-groups.html)

- [TPCDS Cloud DWB](https://github.com/awslabs/amazon-redshift-utils/tree/master/src/CloudDataWarehouseBenchmark/Cloud-DWB-Derived-from-TPCDS)

- [redshift concurrency scaling](https://aws.amazon.com/blogs/big-data/scale-read-and-write-workloads-with-amazon-redshift/)
