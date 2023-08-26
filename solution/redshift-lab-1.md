---
title: lab 1 - building data analytics solutions using amazon redshift
description: create a cluster and load data from s3
author: haimtran
publishedDate: 28/07/2023
date: 28/07/2023
---

## Introduction

This [GitHub]() note shows how to getting started with Redshift

- Create subnet group
- Create parameter group
- Create a Redshift cluster
- Copy data from S3 and query

## Copy S3 (Lab 1)

let create a table

```sql
CREATE TABLE IF NOT EXISTS stocksummary (
        Trade_Date VARCHAR(15),
        Ticker VARCHAR(5),
        High DECIMAL(8,2),
        Low DECIMAL(8,2),
        Open_value DECIMAL(8,2),
        Close DECIMAL(8,2),
        Volume DECIMAL(15),
        Adj_Close DECIMAL(8,2)
        );
```

and copy data from s3

```sql
COPY stocksummary
FROM 's3://INSERT_DATA_BUCKET_NAME/data/stock_prices.csv'
iam_role 'INSERT_REDSHIFT_ROLE'
CSV IGNOREHEADER 1;
```

query and get some output

```sql
SELECT * FROM stocksummary WHERE Trade_Date LIKE '2020-01-03' ORDER BY Ticker;
```

send another query

```sql
select a.ticker, a.trade_date, '$'||a.adj_close as highest_stock_price
from stocksummary a,
  (select ticker, max(adj_close) adj_close
  from stocksummary x
  group by ticker) b
where a.ticker = b.ticker
  and a.adj_close = b.adj_close
order by a.ticker;
```

let create another table called movie table

```sql
CREATE TABLE IF NOT EXISTS movies  (
        year VARCHAR(4) DEFAULT NULL,
        title VARCHAR(200) DEFAULT NULL,
        directors VARCHAR(35) DEFAULT NULL,
        rating VARCHAR(10) DEFAULT NULL,
        genres_0 VARCHAR(35) DEFAULT NULL,
        genres_1 VARCHAR(35) DEFAULT NULL,
        rank VARCHAR(10) DEFAULT NULL,
        running_time_secs VARCHAR(35) DEFAULT NULL,
        actors_0 VARCHAR(35) DEFAULT NULL,
        actors_1 VARCHAR(35) DEFAULT NULL,
        actors_2 VARCHAR(35) DEFAULT NULL,
        directors_1 VARCHAR(35) DEFAULT NULL,
        directors_2 VARCHAR(35) DEFAULT NULL
);
```

Then copy data from S3 into the table

```sql
COPY movies
FROM 's3://INSERT_CHALLENGE_BUCKET_NAME/data/movies.csv'
iam_role 'INSERT_REDSHIFT_ROLE'
CSV IGNOREHEADER 1;
```

Query to check result

```sql
SELECT title FROM movies WHERE actors_0='Mark Wahlberg' OR actors_1='Mark Wahlberg' OR actors_2='Mark Wahlberg';
```

## Reference
