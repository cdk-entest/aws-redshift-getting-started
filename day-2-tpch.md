---
title: day 2 - data warehouse on aws
description: day 2 data warehouse on aws
author: haimtran
publishedDate: 28/07/2023
date: 28/07/2023
---

## Introduction

- COPY command
- Columnar and compression
- Data distribution and sort key
- Analyzing and improving queries
- Workload management (WLM)
- Concurrency scaling

## COPY Data

Let load data into redshift from s3 using copy command. Here is summary of data and load time when using a redshift cluster with to dc.2 nodes.

```json
[
  {
    "name": "REGION",
    "size": "5 rows",
    "loadtime": "2sec"
  },
  {
    "name": "NATION",
    "size": "5 rows",
    "loadtime": "13sec"
  },
  {
    "name": "SUPPLIER",
    "size": "1M rows",
    "loadtime": "1min"
  },
  {
    "name": "CUSTOMER",
    "size": "15M rows",
    "loadtime": "3min"
  },
  {
    "name": "PART",
    "size": "20M rows",
    "loadtime": "5m22"
  },
  {
    "name": "ORDERS",
    "size": "76M rows",
    "loadtime": "5m39"
  },
    {
    "name": "PARTSUPPLIER",
    "size": "80M rows",
    "loadtime": "5m43"
  }
  {
    "name": "LINEITEM",
    "size": "303M rows",
    "loadtime": "13min46"
  }
]
```

Let check the size of the data

```bash
aws s3 ls --summarize --human-readable --recursive s3://redshift-immersionday-labs/data/lineitem-part/
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
  R_COMMENT varchar(152));

CREATE TABLE nation (
  N_NATIONKEY bigint NOT NULL,
  N_NAME varchar(25),
  N_REGIONKEY bigint,
  N_COMMENT varchar(152));

create table customer (
  C_CUSTKEY bigint NOT NULL,
  C_NAME varchar(25),
  C_ADDRESS varchar(40),
  C_NATIONKEY bigint,
  C_PHONE varchar(15),
  C_ACCTBAL decimal(18,4),
  C_MKTSEGMENT varchar(10),
  C_COMMENT varchar(117));

create table orders (
  O_ORDERKEY bigint NOT NULL,
  O_CUSTKEY bigint,
  O_ORDERSTATUS varchar(1),
  O_TOTALPRICE decimal(18,4),
  O_ORDERDATE Date,
  O_ORDERPRIORITY varchar(15),
  O_CLERK varchar(15),
  O_SHIPPRIORITY Integer,
  O_COMMENT varchar(79));

create table part (
  P_PARTKEY bigint NOT NULL,
  P_NAME varchar(55),
  P_MFGR  varchar(25),
  P_BRAND varchar(10),
  P_TYPE varchar(25),
  P_SIZE integer,
  P_CONTAINER varchar(10),
  P_RETAILPRICE decimal(18,4),
  P_COMMENT varchar(23));

create table supplier (
  S_SUPPKEY bigint NOT NULL,
  S_NAME varchar(25),
  S_ADDRESS varchar(40),
  S_NATIONKEY bigint,
  S_PHONE varchar(15),
  S_ACCTBAL decimal(18,4),
  S_COMMENT varchar(101));

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
  L_COMMENT varchar(44));

create table partsupp (
  PS_PARTKEY bigint NOT NULL,
  PS_SUPPKEY bigint NOT NULL,
  PS_AVAILQTY integer,
  PS_SUPPLYCOST decimal(18,4),
  PS_COMMENT varchar(199));
```

then COPY data from S3

```sql
COPY region FROM 's3://redshift-immersionday-labs/data/region/region.tbl.lzo'
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

COPY nation FROM 's3://redshift-immersionday-labs/data/nation/nation.tbl.'
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy supplier from 's3://redshift-immersionday-labs/data/supplier/supplier.json' manifest
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy customer from 's3://redshift-immersionday-labs/data/customer/customer.tbl.'
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy part from 's3://redshift-immersionday-labs/data/part/part.tbl.'
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy orders from 's3://redshift-immersionday-labs/data/orders/orders.tbl.'
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy partsupp from 's3://redshift-immersionday-labs/data/partsupp/partsupp.tbl.'
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy lineitem from 's3://redshift-immersionday-labs/data/lineitem-part/'
iam_role default
region 'us-west-2' gzip delimiter '|' COMPUPDATE PRESET;
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

## COPY Command

- [copy example from docs](https://docs.aws.amazon.com/redshift/latest/dg/r_COPY_command_examples.html)
- [COPY parameters](https://docs.aws.amazon.com/redshift/latest/dg/r_COPY.html)

How to check error of COPY commands

```sql
SELECT * FROM STL_LOAD_ERRORS
```

```sql
SELECT * FROM STL_LOAD_ERRORS
WHERE query = (SELECT MAX(query) from STL_LOAD_ERRORS)
```

Solution for task 2 - loading txt data

```sql
COPY task2
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/task2.txt'
IAM_ROLE '<INSERT-YOUR-REDSHIFT-ROLE>'
REGION 'us-west-2'
IGNOREHEADER 1
MAXERROR 10
```

Solution for task 3 - loading delimited text

```sql
COPY task3
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/task3.txt'
IAM_ROLE 'arn:aws:iam::799371036956:role/Redshift-Role'
DELIMITER '%'
REGION 'us-west-2'
```

Solution for task 4 - loading fixed-length data

```sql
COPY task4
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/task4.txt'
IAM_ROLE 'arn:aws:iam::799371036956:role/Redshift-Role'
FIXEDWIDTH '5, 47, 17, 13, 7, 5, 7, 4'
REGION 'us-west-2'
```

Solution for task 5 - quotation mark

```sql
COPY task5
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/task5.txt'
IAM_ROLE 'arn:aws:iam::799371036956:role/Redshift-Role'
CSV QUOTE AS '"'
REGION 'us-west-2'
```

Solution for task 6 - loading json data

```sql
COPY task6
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/task6.json'
IAM_ROLE 'arn:aws:iam::799371036956:role/Redshift-Role'
REGION 'us-west-2'
JSON 'auto';
```

Solution for challenge 1 - loading via manifest file

```json
{
  "entries": [
    {
      "url": "s3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/challenge1a.txt",
      "mandatory": true
    },
    {
      "url": "s3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/challenge1b.txt",
      "mandatory": true
    },
    {
      "url": "s3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/challenge1c.txt",
      "mandatory": true
    }
  ]
}
```

and copy

```sql
COPY challenge1
FROM 's3://manifest-haimtran-01082023/challenge1.manifest'
IAM_ROLE 'arn:aws:iam::799371036956:role/Redshift-Role'
REGION 'us-west-2'
manifest;
```

Solution for challenge 2 - solving multiple issues

```sql
COPY challenge2
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/challenge2.gz'
IAM_ROLE 'arn:aws:iam::799371036956:role/Redshift-Role'
REGION 'us-west-2'
CSV
IGNOREBLANKLINES
FILLRECORD
TRUNCATECOLUMNS
GZIP
DELIMITER ','
```

> If you load the file using the DELIMITER parameter to specify comma-delimited input, the COPY command fails because some input fields contain commas. You can avoid that problem by using the CSV parameter and enclosing the fields that contain commas in quotation mark characters.

## Compression

- Analyse compression of an existing table
- Create new table, set compression, copy

First, let analyse compression of a table

```sql
select "column", type, encoding from pg_table_def
where tablename = 'customer'
```

analyse compression of a table

```sql
ANALYZE COMPRESSION customers
```

Second, let create table and specify encoding type

```sql
drop table if exists customertest;
create table customertest (
  C_CUSTKEY bigint NOT NULL encode raw,
  C_NAME varchar(25),
  C_ADDRESS varchar(40),
  C_NATIONKEY bigint,
  C_PHONE varchar(15),
  C_ACCTBAL decimal(18,4),
  C_MKTSEGMENT varchar(10),
  C_COMMENT varchar(117))
diststyle AUTO;

select "column", type, encoding from pg_table_def
where tablename = "customertest";
```

Then analyse the compression of customertest table, and we see that the column C_CUSTKEY compression is NONE

```sql
select "column", type, encoding from pg_table_def
where tablename = 'customertest'
```

Let copy data from s3 to the table with PRESET which will encode the c_custkey BIGINT to az64. Here is quoted from the docs

```sql
copy customertest from 's3://packt-redshift-cookbook/customer/'
iam_role default region 'eu-west-1'
csv gzip COMPUPDATE PRESET;
```

Then check the compression again

```sql
select "column", type, encoding from pg_table_def
where tablename = 'customertest'
```

Analyse compression of a table

```sql
ANALYZE COMPRESSION customertest
```

> When COMPUPDATE is PRESET, the COPY command chooses the compression encoding for each column if the target table is empty; even if the columns already have encodings other than RAW.

Quoted from [Compression encodings](https://docs.aws.amazon.com/redshift/latest/dg/c_Compression_encodings.html)

> When you use CREATE TABLE, ENCODE AUTO is disabled when you specify compression encoding for any column in the table. If ENCODE AUTO is disabled, Amazon Redshift automatically assigns compression encoding to columns for which you don't specify an ENCODE type as follows:

- Columns that are defined as sort keys are assigned RAW compression.
- Columns that are defined as BOOLEAN, REAL, or DOUBLE PRECISION data types are assigned RAW compression.
- Columns that are defined as SMALLINT, INTEGER, BIGINT, DECIMAL, DATE, TIMESTAMP, or TIMESTAMPTZ data types are assigned AZ64 compression.
- Columns that are defined as CHAR or VARCHAR data types are assigned LZO compression.

## Data Distribution

> Amazon Redshift automatically manages the distribution style for the table, and for small tables, it creates a distribution style of ALL . With the ALL distribution style, the data for this table is stored on every compute node slice as 0 . The distribution style of ALL is well-suited for small dimension tables, which enables join performance optimization for large tables with smaller dimension tables.

TODO: a picture here to explain KEY, ALL, EVEN, AUTO

First, let check how data distributed across node and slices. Both listing and sales tables are AUTO(EVEN) distributed accross nodes.

```sql
select * from svv_table_info
where "table"='customer'
```

Second, analyze a join query, and this will take 18 seconds on the cluster with 2 nodes.

```sql
explain
select
    c_name, o_totalprice
from
    customer, orders
where
    customer.c_custkey = orders.o_custkeylimit 10;
```

The result look like this

```sql
XN Limit (cost=187500.00..974755.71 rows=10 width=38)
-> XN Hash Join DS_BCAST_INNER (cost=187500.00..6000013299642.85 rows=76214285 width=38)
Hash Cond: ("outer".o_custkey = "inner".c_custkey)
-> XN Seq Scan on orders (cost=0.00..760000.00 rows=76000000 width=24)
-> XN Hash (cost=150000.00..150000.00 rows=15000000 width=30)
-> XN Seq Scan on customer (cost=0.00..150000.00 rows=15000000 width=30)
```

DS_BCAST_INNER means that a copy of the entire inner table (listing table) is broadcast to all of the compute nodes. This occurs because the data for both tables must be brought together on the same slice to join each given row during the query.

Let improve performance by distributing data by key which co-locate data (rows) by c_custkey. This query will take 2m47sec.

```sql
CREATE TABLE customer_distkey
DISTKEY (c_custkey)
AS
SELECT * FROM customer;

CREATE TABLE orders_distkey
DISTKEY (o_custkey)
AS
SELECT * FROM orders;
```

Now let join again, it will take about

```sql
explain
select
    c_name, o_totalprice
from
    customer_distkey, orders_distkey
where
    customer_distkey.c_custkey = orders_distkey.o_custkeylimit 10;
```

The cost is 13 seconds (less than 18 seconds)

```sql
XN Limit (cost=187500.00..187501.72 rows=10 width=38)
-> XN Hash Join DS_DIST_NONE (cost=187500.00..13299642.85 rows=76214285 width=38)
Hash Cond: ("outer".o_custkey = "inner".c_custkey)
-> XN Seq Scan on orders_distkey (cost=0.00..760000.00 rows=76000000 width=24)
-> XN Hash (cost=150000.00..150000.00 rows=15000000 width=30)
-> XN Seq Scan on customer_distkey (cost=0.00..150000.00 rows=15000000 width=30)
```

DS_DIST_NONE means that no redistribution data is required. This is because corresponding slices are co-located on the comptue nodes because they had the same DISTKEY.

## Sort Key

TODO: have a picture here to explain

First, let creat a sorte table by time

```sql
create table sorted_orders
SORTKEY (o_orderdate)
as
select * from orders
```

Second, let create a sorted order by custid

```sql
create table sorted_orders_custkey
SORTKEY (o_custkey)
as
select * from orders
```

**Then compare performane, please double check the skew of sortkey to explain why and when there is not performance improvement**

```sql
select count(*) as num_order, sum(o_totalprice) as revenue
from sorted_orders
where o_orderdate between '1998-08-02'::timestamp and '1998-09-03'::timestamp
```

Let run the similar query but on big_sales_sorted table. This query immediately return the results.

```sql
select count(*) as num_order, sum(o_totalprice) as revenue
from sorted_orders_custkey
where o_orderdate between '1998-08-02'::timestamp and '1998-09-03'::timestamp
```

The performance improvement is because the sorted_big_sale table has been sorted by the saletime column. We can define sort key when creating a new table

```sql
create table sales(
	salesid integer not null,
	listid integer not null distkey,
	sellerid integer not null,
	buyerid integer not null,
	eventid integer not null,
	dateid smallint not null sortkey,
	qtysold smallint not null,
	pricepaid decimal(8,2),
	commission decimal(8,2),
	saletime timestamp);
```

We can also alter an existing table

```sql
alter table sales alter sortkey (saletime);
```

## Workload Management

## Concurrency Scaling

## Reference

- [COPY parameters](https://docs.aws.amazon.com/redshift/latest/dg/r_COPY.html)

- [COPY examples](https://docs.aws.amazon.com/redshift/latest/dg/r_COPY_command_examples.html)

- [redshift join example](https://docs.aws.amazon.com/redshift/latest/dg/r_Join_examples.html)

- [redshift join syntax](https://docs.aws.amazon.com/redshift/latest/dg/r_FROM_clause30.html#r_FROM_clause30-parameters)

- [compression encodings](https://docs.aws.amazon.com/redshift/latest/dg/c_Compression_encodings.html)

- [svl_query_summary](https://docs.aws.amazon.com/redshift/latest/dg/r_SVCS_S3QUERY_SUMMARY.html)

- [how sort key work in redshift](https://docs.aws.amazon.com/redshift/latest/dg/t_Sorting_data.html)

- [svv_table_info](https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_TABLE_INFO.html)
