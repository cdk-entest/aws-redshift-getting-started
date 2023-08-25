---
author: haimtran
title: lab 7 using amazon redshift spectrum
date: 24/08/2023
---

## External Schema

Create an external schema named spectrum which stored in Glue Catalog

```sql
CREATE EXTERNAL SCHEMA spectrum
FROM DATA CATALOG
DATABASE 'spectrumdb'
IAM_ROLE '<INSERT-YOUR-REDSHIFT-ROLE>'
CREATE EXTERNAL DATABASE IF NOT EXISTS
```

Then create an table in the spectrum schema

```sql
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
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales/'
TABLE PROPERTIES ('numRows'='172000')
```

Now we can query data in S3, for example,

```sql
SELECT SUM(pricepaid)
FROM spectrum.sales
WHERE saletime::date = '2008-06-26'
```

## Join with Table in Redshift

Let create a normal table in Redshift

```sql
CREATE TABLE event(
    eventid INTEGER NOT NULL DISTKEY,
    venueid SMALLINT NOT NULL,
    catid   SMALLINT NOT NULL,
    dateid  SMALLINT NOT NULL SORTKEY,
    eventname VARCHAR(200),
    starttime TIMESTAMP
)

```

Then load data from S3 into the table

```sql
COPY event
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/allevents_pipe.txt'
IAM_ROLE '<INSERT-YOUR-REDSHIFT-ROLE>'
DELIMITER '|'
TIMEFORMAT 'YYYY-MM-DD HH:MI:SS'
REGION 'us-west-2'

```

Now we can join two table

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

Check the query plan

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

Here is the query plan

```sql
QUERYPLAN
XN Limit  (cost=1001055765140.53..1001055765140.56 rows=10 width=31)
"  ->  XN Merge  (cost=1001055765140.53..1001055765162.53 rows=8798 width=31)"
"        Merge Key: sum(sales.derived_col2)"
"        ->  XN Network  (cost=1001055765140.53..1001055765162.53 rows=8798 width=31)"
"              Send to leader"
"              ->  XN Sort  (cost=1001055765140.53..1001055765162.53 rows=8798 width=31)"
"                    Sort Key: sum(sales.derived_col2)"
"                    ->  XN HashAggregate  (cost=1055764542.14..1055764564.13 rows=8798 width=31)"
"                          ->  XN Hash Join DS_BCAST_INNER  (cost=2546.64..1055764498.15 rows=8798 width=31)"
"                                Hash Cond: (""outer"".derived_col1 = ""inner"".eventid)"
"                                ->  XN S3 Query Scan sales  (cost=2436.67..3010.18 rows=57334 width=16)"
"                                      ->  S3 HashAggregate  (cost=2436.67..2436.84 rows=57334 width=16)"
"                                            ->  S3 Seq Scan spectrum.sales location:""s3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales"" format:TEXT  (cost=0.00..2150.00 rows=57334 width=16)"
"                                                  Filter: (pricepaid > 30.00)"
"                                ->  XN Hash  (cost=87.98..87.98 rows=8798 width=4)"
"                                      ->  XN Seq Scan on event  (cost=0.00..87.98 rows=8798 width=4)"
```

## Partitioned Data

Let creat a external table with partitioned data by date

```bash
$ aws s3 ls s3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/

PRE saledate=2008-01/
PRE saledate=2008-02/
PRE saledate=2008-03/
PRE saledate=2008-04/
PRE saledate=2008-05/
PRE saledate=2008-06/
PRE saledate=2008-07/
PRE saledate=2008-08/
PRE saledate=2008-09/
PRE saledate=2008-10/
PRE saledate=2008-11/
PRE saledate=2008-12/

```

Create an external table in spectrum schema

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
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/'
TABLE PROPERTIES ('numRows'='172000')

```

Update information about partition and then query

```sql
ALTER TABLE spectrum.sales_partitioned ADD if not exists
PARTITION(saledate='2008-01-01')
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/saledate=2008-01/'
PARTITION(saledate='2008-02-01')
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/saledate=2008-02/'
PARTITION(saledate='2008-03-01')
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/saledate=2008-03/'
PARTITION(saledate='2008-04-01')
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/saledate=2008-04/'
PARTITION(saledate='2008-05-01')
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/saledate=2008-05/'
PARTITION(saledate='2008-06-01')
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/saledate=2008-06/'
PARTITION(saledate='2008-07-01')
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/saledate=2008-07/'
PARTITION(saledate='2008-08-01')
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/saledate=2008-08/'
PARTITION(saledate='2008-09-01')
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/saledate=2008-09/'
PARTITION(saledate='2008-10-01')
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/saledate=2008-10/'
PARTITION(saledate='2008-11-01')
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/saledate=2008-11/'
PARTITION(saledate='2008-12-01')
LOCATION 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/sampledb/tickit/spectrum/sales_partition/saledate=2008-12/';

```

Now we can query as normal

```sql
SELECT TOP 10
    spectrum.sales.eventid,
    SUM(pricepaid)
FROM spectrum.sales, event
WHERE spectrum.sales.eventid = event.eventid
  AND pricepaid > 30
  AND date_trunc('month', saletime) = '2008-12-01'
GROUP BY spectrum.sales.eventid
ORDER BY 2 DESC

```

Display parition information from system table

```sql
SELECT *
FROM SVV_EXTERNAL_PARTITIONS
WHERE tablename = 'sales_partitioned'

```

and check information of external table (by column)

```sql
SELECT *
FROM SVV_EXTERNAL_COLUMNS
WHERE tablename = 'sales_partitioned'

```
