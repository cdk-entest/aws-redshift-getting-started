---
title: day 3 - data warehouse on aws
description: day 3 data warehouse on aws
author: haimtran
publishedDate: 28/07/2023
date: 28/07/2023
---

## Introduction

- Redshift Spectrum query data lake
- Redshift and Machine Learning
- Redshift federated query
- Redshift and QuickSight
- Redshift and Aurora - Zero ETL (ELT)
- Redshift snapshot and recovery
- Redshift share data
- Resize clsuter
- Limit and monitoring

## Redshift and Aurora

## Redshift Spectrum

Create an external schema and table which stored in Glue Catalog actually.

```sql
DROP SCHEMA IF EXISTS spectrum;

CREATE external schema spectrum
FROM data catalog
DATABASE 'default'
IAM_ROLE 'arn:aws:iam::111222333444:role/RedshiftAssociateIAMRoleForDataEngineer'
CREATE EXTERNAL DATABASE IF NOT EXISTS;
```

and an external table

```sql
DROP TABLE IF EXISTS spectrum.sales;

CREATE EXTERNAL TABLE spectrum.sales(
    salesid INTEGER,
    listid INTEGER,
    sellerid INTEGER,
    buyerid INTEGER,
    eventid INTEGER,
    dateid SMALLINT,
    qtysold SMALLINT,
    pricepaid DECIMAL(8,2),
    commission DECIMAL(8,2),
    saletime TIMESTAMP
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY '\t'
STORED AS TEXTFILE
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales/'
TABLE PROPERTIES ('numRows'='172000')
```

Then we can query the external table with data stored in S3 actually

```sql
SELECT * FROM spectrum.sales LIMIT 1000;
```

and

```sql
SELECT SUM(pricepaid)
FROM spectrum.sales
WHERE saletime::date = '2008-06-26'
```

Let join the external table with an internal table

```sql
SELECT TOP 10
  spectrum.sales.eventid,
  SUM(spectrum.sales.pricepaid)
FROM spectrum.sales, event
WHERE spectrum.sales.eventid = event.eventid
  AND spectrum.sales.pricepaid > 30
GROUP BY spectrum.sales.eventid
ORDER BY 2 DESC
```

add explain to see query plan

```sql
EXPLAIN
SELECT TOP 10
    spectrum.sales.eventid,
    sum(spectrum.sales.pricepaid)
FROM spectrum.sales, event
WHERE spectrum.sales.eventid = event.eventid
  AND spectrum.sales.pricepaid > 30
GROUP BY spectrum.sales.eventid
ORDER BY 2 DESC
```

Let create a partitioned table

```sql
DROP TABLE IF EXISTS spectrum.sales_partitioned;
```

```sql
CREATE EXTERNAL TABLE spectrum.sales_partitioned(
    salesid INTEGER,
    listid INTEGER,
    sellerid INTEGER,
    buyerid INTEGER,
    eventid INTEGER,
    dateid SMALLINT,
    qtysold SMALLINT,
    pricepaid DECIMAL(8,2),
    commission DECIMAL(8,2),
    saletime TIMESTAMP
)
PARTITIONED BY (saledate DATE)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY '|'
STORED AS TEXTFILE
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/'
TABLE PROPERTIES ('numRows'='172000')
```

We have to update parition information to Reshift

```sql
ALTER TABLE spectrum.sales_partitioned ADD if not exists
PARTITION(saledate='2008-01-01')
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/saledate=2008-01/'
PARTITION(saledate='2008-02-01')
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/saledate=2008-02/'
PARTITION(saledate='2008-03-01')
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/saledate=2008-03/'
PARTITION(saledate='2008-04-01')
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/saledate=2008-04/'
PARTITION(saledate='2008-05-01')
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/saledate=2008-05/'
PARTITION(saledate='2008-06-01')
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/saledate=2008-06/'
PARTITION(saledate='2008-07-01')
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/saledate=2008-07/'
PARTITION(saledate='2008-08-01')
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/saledate=2008-08/'
PARTITION(saledate='2008-09-01')
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/saledate=2008-09/'
PARTITION(saledate='2008-10-01')
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/saledate=2008-10/'
PARTITION(saledate='2008-11-01')
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/saledate=2008-11/'
PARTITION(saledate='2008-12-01')
LOCATION 's3://lake-entest-demo-002/tickit/spectrum/sales_partition/saledate=2008-12/';
```

Now let query the paritioned table

```sql
SELECT TOP 10
    spectrum.sales_partitioned.eventid,
    SUM(pricepaid)
FROM spectrum.sales_partitioned, event
WHERE spectrum.sales_partitioned.eventid = event.eventid
  AND pricepaid > 30
  AND saledate = '2008-12-01'
GROUP BY spectrum.sales_partitioned.eventid
ORDER BY 2 DESC
```

## Redshift Federated Query

## Snapshot and Recovery

## Share Data

## Resize Cluster

## Reference
