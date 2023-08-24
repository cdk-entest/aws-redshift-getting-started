---
author: haimtran
title: lab 3 data distribution
date: 24/08/2023
---

> [!IMPORTANT]
> Explain data distribution styles: EVEN, ALL, KEY, AUTO

> - EVEN: distribute rows across all slices in a round-robin fashin regardless of the values in any particular column
> - ALL: distribute a copy of the entire table to every node
> - KEY: distribute row according to the values in a specified column. If you distribute a pair of tables with a KEY column, rows with the same value in that column are stored on the same slice.
> - AUTO: assign an optimal distribution style based on the size of the table data. For example, Amazon Redshift initially assigns ALL distribution to a small table and then changes to EVEN distriubtion when the table grows larger.

## Distribution Key

First let explain this query

```sql
-- SET enable_result_cache_for_session TO OFF;
EXPLAIN
SELECT
  *
FROM sales
JOIN listing USING (listid)
LIMIT 10
```

Here is the query plan and cost estimation

```sql
QUERYPLAN
XN Limit  (cost=2406.21..7125576.96 rows=10 width=116)
"  ->  XN Hash Join DS_BCAST_INNER  (cost=2406.21..123198089740.57 rows=172954 width=116)"
"        Hash Cond: (""outer"".listid = ""inner"".listid)"
"        ->  XN Seq Scan on sales  (cost=0.00..1724.56 rows=172456 width=64)"
"        ->  XN Hash  (cost=1924.97..1924.97 rows=192497 width=56)"
"              ->  XN Seq Scan on listing  (cost=0.00..1924.97 rows=192497 width=56)"
```

> Hash join algorithm

> DS_BCAST_INNER (Distribution: Broadcast Inner Table) which indicates that a copy of the entire table (listing table) is broadcast to all of the compute nodes. This occurs because the data for both tables must be brought together on the same slice to join each given row during the query.

> The cost field provies a relative measure of the effort required to run the query. It is measured in cost units that are arbitrary but conventionally mean disk page fetches. Basically, a smaller number is better. The cost in this query is very large (100098448011.03) indicating that a lot of data is moving around the Amazon Redshift cluster. :smile:

Now let distribute data using a column (KEY)

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

Explain the query plan using the new distributed data tables

```sql
EXPLAIN
SELECT
  *
FROM sales_distkey
JOIN listing_distkey USING (listid)
LIMIT 10
```

Here is the query plan (cost estimation)

```sql
QUERYPLAN
XN Limit  (cost=2406.21..2406.64 rows=10 width=116)
"  ->  XN Hash Join DS_DIST_NONE  (cost=2406.21..9740.57 rows=172954 width=116)"
"        Hash Cond: (""outer"".listid = ""inner"".listid)"
"        ->  XN Seq Scan on sales_distkey  (cost=0.00..1724.56 rows=172456 width=64)"
"        ->  XN Hash  (cost=1924.97..1924.97 rows=192497 width=56)"
"              ->  XN Seq Scan on listing_distkey  (cost=0.00..1924.97 rows=192497 width=56)"
```

> DS_DIST_NONE (Distribution: None) which means that no distribution is required. This is because corresponding slices are co-located on the compute nodes because they had the same DISTKEY.

## Dimension Table

Let check query plan of this join

```sql
EXPLAIN
SELECT
  *
FROM listing_distkey
JOIN date USING (dateid)
LIMIT 10
```

Here is the query plan or cost estimation

```sql
QUERYPLAN
XN Limit  (cost=4.56..4.89 rows=10 width=90)
"  ->  XN Hash Join DS_DIST_ALL_NONE  (cost=4.56..6250.23 rows=191448 width=90)"
"        Hash Cond: (""outer"".dateid = ""inner"".dateid)"
"        ->  XN Seq Scan on listing_distkey  (cost=0.00..1924.97 rows=192497 width=56)"
"        ->  XN Hash  (cost=3.65..3.65 rows=365 width=36)"
"              ->  XN Seq Scan on date  (cost=0.00..3.65 rows=365 width=36)"
```

> DS_DIST_ALL_NONE (Distribution: All, so no broadcast) which means that no redistribution was required because the inner join table used the default distribution of DISTLEALL. The entire table is located on every node already. The cost is low because no information needed to be transferred between nodes.

## Sort Key

First let explore the big_sales table

```sql
SELECT *
FROM big_sales
LIMIT 20
```

Before sorted, let run this query on the original big_sales table, and takes note the running time

```sql
SELECT SUM(qtysold * pricepaid) AS revenue
FROM big_sales
WHERE saletime between '2008-08-01 00:00:00'::TIMESTAMP AND '2008-08-01 23:59:59'::TIMESTAMP
```

After sorted, let run this query on the big_sales_sorted table and compare the running time with the previous one

```sql
SELECT SUM(qtysold * pricepaid) AS revenue
FROM big_sales
WHERE saletime between '2008-08-01 00:00:00'::TIMESTAMP AND '2008-08-01 23:59:59'::TIMESTAMP
```

> [!IMPORTANT]
> Goto the query history to compare the running time (1000ms versus 524ms)

## Challenges

Discuss about TICKIT dataset, schema, select distribution key and sorted key
