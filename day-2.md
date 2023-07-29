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

## COPY Command

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

## Join

Let join two tables [redshift join example](https://docs.aws.amazon.com/redshift/latest/dg/r_Join_examples.html) and check the [join syntax here](https://docs.aws.amazon.com/redshift/latest/dg/r_FROM_clause30.html#r_FROM_clause30-parameters)

```sql

```

## Data Distribution

- KEY, ALL, EVEN, AUTO

> Amazon Redshift automatically manages the distribution style for the table, and for small tables, it creates a distribution style of ALL . With the ALL distribution style, the data for this table is stored on every compute node slice as 0 . The distribution style of ALL is well-suited for small dimension tables, which enables join performance optimization for large tables with smaller dimension tables.

Let check distribution data of existing tables

```sql
select
    "schema", "table", "diststyle", skew_rows
from
    svv_table_info
```

Check data distribution of a table

```sql
select
    "schema", "table", "diststyle", skew_rows
from
    svv_table_info
where "table" = 'customertest'
```

Let create a dwdata table with AUTO distribution data

```sql
DROP TABLE IF EXISTS dwdate;
CREATE TABLE dwdate(
    d_datekey INTEGER NOT NULL,
    d_date VARCHAR(19) NOT NULL,
    d_dayofweek VARCHAR(10) NOT NULL,
    d_month VARCHAR(10) NOT NULL,
    d_year INTEGER NOT NULL,
    d_yearmonthnum INTEGER NOT NULL,
    d_yearmonth VARCHAR(8) NOT NULL,
    d_daynuminweek INTEGER NOT NULL,
    d_daynuminmonth INTEGER NOT NULL,
    d_daynuminyear INTEGER NOT NULL,
    d_monthnuminyear INTEGER NOT NULL,
    d_weeknuminyear INTEGER NOT NULL,
    d_sellingseason VARCHAR(13) NOT NULL,
    d_lastdayinweekfl VARCHAR(1) NOT NULL,
    d_lastdayinmonthfl VARCHAR(1) NOT NULL,
    d_holidayfl VARCHAR(1) NOT NULL,
    d_weekdayfl VARCHAR(1) NOT NULL
);
COPY dwdate from 's3://packt-redshift-cookbook/dwdate/'
iam_role default region 'eu-west-1'
csv gzip COMPUPDATEPRESET dateformat 'auto';
```

Now let update the data distribution of the customertest table by C_NATIONKEY

```sql
alter table customertest alter distkey C_NATIONKEY;
```

Check data distribution

```sql
select
    "schema", "table", "diststyle", skew_rows
from
    svv_table_info
where "table" = 'customertest'
```

The skewness is not very good (should be less than 5). So let distribute data using C_CUSTKEY

```sql
alter table customertest alter distkey C_CUSTKEY;
```

## Sort Key

[How sortkey work in Redshift](https://docs.aws.amazon.com/redshift/latest/dg/t_Sorting_data.html). Before starting, it should be good to check size of dataset. It is about 30GB

```bash
aws s3 ls --summarize --human-readable --recursive 's3://packt-redshift-cookbook/lineitem/'
```

Let create a lineitem table with the default auto sortkey. Depending on the cluster size, this query take from 15 to 30 minutes to complete.

```sql
drop table if exists lineitemtest;
CREATE TABLE lineitemtest
(
  L_ORDERKEY BIGINT NOT NULL,
  L_PARTKEY BIGINT,
  L_SUPPKEY BIGINT,
  L_LINENUMBER INTEGER NOT NULL,
  L_QUANTITY DECIMAL(18,4),
  L_EXTENDEDPRICE DECIMAL(18,4),
  L_DISCOUNT DECIMAL(18,4),
  L_TAX DECIMAL(18,4),
  L_RETURNFLAG VARCHAR(1),
  L_LINESTATUS VARCHAR(1),
  L_SHIPDATE DATE,
  L_COMMITDATE DATE,
  L_RECEIPTDATE DATE,
  L_SHIPINSTRUCT VARCHAR(25),
  L_SHIPMODE VARCHAR(10),
  L_COMMENT VARCHAR(44)
)
distkey (L_ORDERKEY) ;
COPY lineitemtest from 's3://packt-redshift-cookbook/lineitem/'
region 'eu-west-1'
iam_role default
CSV gzip COMPUPDATE PRESET;
```

Let verify the sortkey of the lineitemtest table with the default auto sortkey using the query below

```sql
select "schema", "table", "diststyle", skew_rows, sortkey1, unsorted
from svv_table_info
where "table" = 'lineitemtest';
```

Let do a complex query and see the impact of sortkey

```sql
SELECT
  l_returnflag,
  l_linestatus,
  sum(l_quantity) as sum_qty,
  sum(l_extendedprice) as sum_base_price,
  sum(l_extendedprice * (1 - l_discount)) as sum_disc_price,
  count(*) as count_order
FROM
  lineitem
WHERE
  l_shipdate = '1992-01-10'
GROUP BY
  l_returnflag,
  l_linestatus
ORDER BY
  l_returnflag,
  l_linestatus;
select PG_LAST_QUERY_ID() as query_id_1;
```

Run the below query to see the cost of the above query

```sql
SELECT query, step, label, is_rrscan, rows, rows_pre_filter, is_diskbased
from svl_query_summary where query in ([query_id_1])
and label like '%lineitemtest%'
order by query,step;
```

Now let improve performance by alter the sortkey, and this query will take about 15 to 30 minutes to complete depending the cluster size.

```sql
alter table lineitemtest alter sortkey (L_SHIPDATE);
```

Run the complex query again

```sql
set enable_result_cache_for_session = off;
SELECT
  l_returnflag,
  l_linestatus,
  sum(l_quantity) as sum_qty,
  sum(l_extendedprice) as sum_base_price,
  sum(l_extendedprice * (1 - l_discount)) as sum_disc_price,
  count(*) as count_order
FROM
  lineitem
WHERE
  cast(l_shipdate as varchar(10) ) = '1992-01-10'
GROUP BY
  l_returnflag,
  l_linestatus
ORDER BY
  l_returnflag,
  l_linestatus;

select PG_LAST_QUERY_ID() as query_id_2;
```

Now let compare query_id_1 and query_id_2 performance

```sql
SELECT query, step,
filter, is_diskbased
from svl_query_summary where query in ([query_id_1],[query_id_2])
and label like '%lineitem%'
order by query,step;
```

Capture query ids then compare two queries

```sql
query_id_1:  207913
query_id_2:
```

Find information about queries given their ids

```sql
SELECT query, step, label, is_rrscan, rows, rows_pre_filter, is_diskbased
from svl_query_summary where query in (207913)
and label like '%lineitemtest%'
order by query,step;
```

> rows_pre_filter For scans of permanent tables, the total number of rows emitted before filtering rows marked for deletion (ghost rows).

> is_rrscan If true (t), indicates that range-restricted scan was used on the step. Default is false (f).

## Workload Management

## Concurrency Scaling

## Reference

- [redshift join example](https://docs.aws.amazon.com/redshift/latest/dg/r_Join_examples.html)

- [redshift join syntax](https://docs.aws.amazon.com/redshift/latest/dg/r_FROM_clause30.html#r_FROM_clause30-parameters)

- [compression encodings](https://docs.aws.amazon.com/redshift/latest/dg/c_Compression_encodings.html)

- [svl_query_summary](https://docs.aws.amazon.com/redshift/latest/dg/r_SVCS_S3QUERY_SUMMARY.html)

- [how sort key work in redshift](https://docs.aws.amazon.com/redshift/latest/dg/t_Sorting_data.html)

- [svv_table_info](https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_TABLE_INFO.html)
