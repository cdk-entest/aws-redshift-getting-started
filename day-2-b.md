---
title: day 2 - data warehouse on aws
description: day 2 data warehouse on aws
author: haimtran
publishedDate: 28/07/2023
date: 28/07/2023
---

## Introduction

- Columnar and compression
- Data distribution and sort key
- Analyzing and improving queries
- Workload management (WLM)
- Concurrency scaling

## COPY Data

Follow [docs](https://docs.aws.amazon.com/redshift/latest/gsg/rs-gsg-create-sample-db.html) to copy sample data into redshift. Download the small sample data set from [here](https://docs.aws.amazon.com/redshift/latest/gsg/samples/tickitdb.zip). Then let load the sample data into Redshift using COPY command

```sql
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS venue;
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS date;
DROP TABLE IF EXISTS event;
DROP TABLE IF EXISTS sales;

create table users(
	userid integer not null,
	username char(8),
	firstname varchar(30),
	lastname varchar(30),
	city varchar(30),
	state char(2),
	email varchar(100),
	phone char(14),
	likesports boolean,
	liketheatre boolean,
	likeconcerts boolean,
	likejazz boolean,
	likeclassical boolean,
	likeopera boolean,
	likerock boolean,
	likevegas boolean,
	likebroadway boolean,
	likemusicals boolean);

create table venue(
	venueid smallint not null,
	venuename varchar(100),
	venuecity varchar(30),
	venuestate char(2),
	venueseats integer);

create table category(
	catid smallint not null,
	catgroup varchar(10),
	catname varchar(10),
	catdesc varchar(50));

create table date(
	dateid smallint not null,
	caldate date not null,
	day character(3) not null,
	week smallint not null,
	month character(5) not null,
	qtr character(5) not null,
	year smallint not null,
	holiday boolean default('N'));

create table event(
	eventid integer not null,
	venueid smallint not null,
	catid smallint not null,
	dateid smallint not null,
	eventname varchar(200),
	starttime timestamp);

create table listing(
	listid integer not null,
	sellerid integer not null,
	eventid integer not null,
	dateid smallint not null,
	numtickets smallint not null,
	priceperticket decimal(8,2),
	totalprice decimal(8,2),
	listtime timestamp);


create table sales(
	salesid integer not null,
	listid integer not null,
	sellerid integer not null,
	buyerid integer not null,
	eventid integer not null,
	dateid smallint not null,
	qtysold smallint not null,
	pricepaid decimal(8,2),
	commission decimal(8,2),
	saletime timestamp);
```

COPY data

```sql
copy users from 's3://<myBucket>/tickit/allusers_pipe.txt'
iam_role default
delimiter '|' region '<aws-region>';

copy users from 's3://<myBucket>/tickit/allusers_pipe.txt'
iam_role default
delimiter '|' region '<aws-region>';

copy users from 's3://<myBucket>/tickit/allusers_pipe.txt'
iam_role default
delimiter '|' region '<aws-region>';

copy venue from 's3://<myBucket>/tickit/venue_pipe.txt'
iam_role default
delimiter '|' region '<aws-region>';

copy category from 's3://<myBucket>/tickit/category_pipe.txt'
iam_role default
delimiter '|' region '<aws-region>';

copy date from 's3://<myBucket>/tickit/date2008_pipe.txt'
iam_role default
delimiter '|' region '<aws-region>';

copy event from 's3://<myBucket>/tickit/allevents_pipe.txt'
iam_role default
delimiter '|' timeformat 'YYYY-MM-DD HH:MI:SS' region '<aws-region>';

copy listing from 's3://<myBucket>/tickit/listings_pipe.txt'
iam_role default
delimiter '|' region '<aws-region>';

copy sales from 's3://<myBucket>/tickit/sales_tab.txt'
iam_role default
delimiter '\t' timeformat 'MM/DD/YYYY HH:MI:SS' region '<aws-region>';
```

## Data Distribution

> Amazon Redshift automatically manages the distribution style for the table, and for small tables, it creates a distribution style of ALL . With the ALL distribution style, the data for this table is stored on every compute node slice as 0 . The distribution style of ALL is well-suited for small dimension tables, which enables join performance optimization for large tables with smaller dimension tables.

TODO: a picture here to explain KEY, ALL, EVEN, AUTO

First, let check how data distributed across node and slices. Both listing and sales tables are AUTO(EVEN) distributed accross nodes.

```sql
select * from svv_table_info
where "table"='sales'
```

Second, analyze a join query

```sql
SET enable_result_cache_for_session TO OFF;

EXPLAIN
SELECT
  *
FROM sales
JOIN listing USING (listid)
LIMIT 10
```

The result look like this

```sql
XN Limit  (cost=2406.21..5806695.17 rows=10 width=93)
  ->  XN Hash Join DS_BCAST_INNER  (cost=2406.21..100098448011.03 rows=172456 width=93)
        Hash Cond: ("outer".listid = "inner".listid)
        ->  XN Seq Scan on sales  (cost=0.00..1724.56 rows=172456 width=53)
        ->  XN Hash  (cost=1924.97..1924.97 rows=192497 width=44)
              ->  XN Seq Scan on listing  (cost=0.00..1924.97 rows=192497 width=44)

```

DS_BCAST_INNER means that a copy of the entire inner table (listing table) is broadcast to all of the compute nodes. This occurs because the data for both tables must be brought together on the same slice to join each given row during the query.

Third, let re-distribute data using using a the listid column for both listing and sales table so that data will be co-located on each slice and join will be faster.

```sql
CREATE TABLE sales_distkey
DISTKEY (listid)
AS
SELECT * FROM sales;

CREATE TABLE listing_distkey
DISTKEY (listid)
AS
SELECT * FROM listing;
```

Now let join again

```sql
EXPLAIN
SELECT
  *
FROM sales_distkey
JOIN listing_distkey USING (listid)
LIMIT 10
```

The cost is

```sql
XN Limit  (cost=2406.21..2406.54 rows=10 width=93)
  ->  XN Hash Join DS_DIST_NONE  (cost=2406.21..8011.03 rows=172456 width=93)
        Hash Cond: ("outer".listid = "inner".listid)
        ->  XN Seq Scan on sales_distkey  (cost=0.00..1724.56 rows=172456 width=53)
        ->  XN Hash  (cost=1924.97..1924.97 rows=192497 width=44)
              ->  XN Seq Scan on listing_distkey  (cost=0.00..1924.97 rows=192497 width=44)
```

DS_DIST_NONE means that no redistribution data is required. This is because corresponding slices are co-located on the comptue nodes because they had the same DISTKEY.

## Dimension Table

The date table distribution is AUTO(ALL) which means that is copied over all first slice of all nodes. Let run a simple join query

```sql
EXPLAIN
SELECT
  *
FROM listing_distkey
JOIN date USING (dateid)
LIMIT 10
```

The output look likes

```sql
XN Limit  (cost=4.56..4.89 rows=10 width=78)
  ->  XN Hash Join DS_DIST_ALL_NONE  (cost=4.56..6260.72 rows=192497 width=78)
        Hash Cond: ("outer".dateid = "inner".dateid)
        ->  XN Seq Scan on listing_distkey  (cost=0.00..1924.97 rows=192497 width=44)
        ->  XN Hash  (cost=3.65..3.65 rows=365 width=36)
              ->  XN Seq Scan on date  (cost=0.00..3.65 rows=365 width=36)
```

DS_DIST_ALL_NONE means that no broadcast, no distribution was required because the inner join table (date table) used the default distribution of DISTYLE ALL. The entire table is located on every node.

## Sort Key

TODO: have a picture here to explain

Let consider this query on the big_sales table which has a timestamp column. This query takes a few seconds (5 seconds) to return the results.

```sql
SELECT SUM(qtysold * pricepaid) AS revenue
FROM big_sales
WHERE saletime between '2008-08-01 00:00:00'::TIMESTAMP AND '2008-08-01 23:59:59'::TIMESTAMP
```

Let run the similar query but on big_sales_sorted table. This query immediately return the results.

```sql
SELECT SUM(qtysold * pricepaid) AS revenue
FROM big_sales_sorted
WHERE saletime between '2008-08-01 00:00:00'::TIMESTAMP AND '2008-08-01 23:59:59'::TIMESTAMP
```

The performance improvement is because the sorted_big_sale table has been sorted by the saletime column.

## Reference

- [redshift join example](https://docs.aws.amazon.com/redshift/latest/dg/r_Join_examples.html)

- [redshift join syntax](https://docs.aws.amazon.com/redshift/latest/dg/r_FROM_clause30.html#r_FROM_clause30-parameters)

- [compression encodings](https://docs.aws.amazon.com/redshift/latest/dg/c_Compression_encodings.html)

- [svl_query_summary](https://docs.aws.amazon.com/redshift/latest/dg/r_SVCS_S3QUERY_SUMMARY.html)

- [how sort key work in redshift](https://docs.aws.amazon.com/redshift/latest/dg/t_Sorting_data.html)

- [svv_table_info](https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_TABLE_INFO.html)
