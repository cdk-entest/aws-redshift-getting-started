---
title: day 3 - data warehouse on aws
description: day 3 data warehouse on aws
author: haimtran
publishedDate: 28/07/2023
date: 28/07/2023
---

## Introduction

- Work load managener (WLM)
- Redshift Spectrum query data lake
- Redshift and SageMake (ML)
- Redshift and QuickSight
- Redshift snapshot and recovery
- Resize clsuter
- Monitoring and auditing

## Workload Management

- [workload management queue](https://docs.aws.amazon.com/redshift/latest/dg/c_workload_mngmt_classification.html)
- Super user queue and default queue
- Route queries based on query_group
- Route queries based on user_group
- Queue order is the matter

> With manual WLM, Amazon Redshift configures one queue with a concurrency level of five, which enables up to five queries to run concurrently, plus one predefined Superuser queue, with a concurrency level of one. You can define up to eight queues. Each queue can be configured with a maximum concurrency level of 50. The maximum total concurrency level for all user-defined queues (not including the Superuser queue) is 50

1.  Some useful table when working with WML

- [STV_WLM_SERVICE_CLASS_STATE](https://docs.aws.amazon.com/redshift/latest/dg/r_STV_WLM_SERVICE_CLASS_STATE.html)
- [STV_WLM_SERVICE_CLASS_CONFIG](https://docs.aws.amazon.com/redshift/latest/dg/r_STV_WLM_SERVICE_CLASS_CONFIG.html)
- [STV_WLM_CLASSIFICATION_CONFIG](https://docs.aws.amazon.com/redshift/latest/dg/r_STV_WLM_CLASSIFICATION_CONFIG.html)

2. Create query queues

Create a queue view in a second tab

```sql
CREATE VIEW queue_view AS
SELECT (config.service_class-5) AS queue,
  trim (class.condition) AS description,
  config.num_query_tasks AS slots,
  config.query_working_mem AS mem,
  config.max_execution_time AS max_time,
  config.user_group_wild_card AS "user_*",
  config.query_group_wild_card AS "query_*",
  state.num_queued_queries AS queued,
  state.num_executing_queries AS processing,
  state.num_executed_queries AS processed
FROM
  STV_WLM_CLASSIFICATION_CONFIG class,
  STV_WLM_SERVICE_CLASS_CONFIG config,
  STV_WLM_SERVICE_CLASS_STATE state
WHERE
  class.action_service_class = config.service_class
  AND class.action_service_class = state.service_class
  AND ((config.service_class BETWEEN 5 AND 13) OR config.service_class = 100)
ORDER BY config.service_class;
```

Then run this query also in second tab

```sql
SELECT * from queue_view;
```

Create query view in third tab. This [STV_WLM_QUERY_STATE](https://docs.aws.amazon.com/redshift/latest/dg/r_STV_WLM_QUERY_STATE.html) records the current state of queires bing tracked by WLM. You will use this view to monitor the queries that are running within queues.

```sql
CREATE VIEW query_view AS
SELECT
  query,
  service_class - 5 as queue,
  slot_count,
  TRIM(wlm_start_time) AS start_time,
  TRIM(state) AS state,
  TRIM(queue_time) AS queue_time,
  TRIM(exec_time) AS run_time
FROM stv_wlm_query_state
WHERE ((service_class BETWEEN 5 AND 13) OR service_class = 100)
```

Then run this query in the third tab

```sql
SELECT * from query_view;
```

Finally in the first tab run this query, and run the second and third tab to see things in the queue

```sql
SET enable_result_cache_for_session TO OFF;

SELECT
  AVG(l.priceperticket * s.qtysold)
FROM listing l, sales s
WHERE l.listid < 40000;
```

Switch LLM mode to manual and configure WLM as below. So totally there are four queue: superuser, queue 1 (retail), queue 2 (admin), and qeuue 3 (default queue).

```json
[
  {
    "user_group": [],
    "query_group": ["retail"],
    "name": "Queue 1",
    "memory_percent_to_use": 30,
    "query_concurrency": 2
  },
  {
    "user_group": ["admin"],
    "query_group": [],
    "name": "Queue 2",
    "memory_percent_to_use": 40,
    "query_concurrency": 3
  },
  {
    "user_group": [],
    "query_group": [],
    "name": "Default queue",
    "memory_percent_to_use": 30,
    "query_concurrency": 5
  },
  {
    "auto_wlm": false
  },
  {
    "short_query_queue": true
  }
]
```

Send query to a queue by using set query_group. Let run this query in the first tab. Run existing queries in second and third tabs and see which query in the queue.

```sql
SET query_group to retail;

SET enable_result_cache_for_session TO OFF;

SELECT
  AVG(l.priceperticket * s.qtysold)
FROM listing l, sales s
WHERE l.listid < 40000;
```

Let send another query to the default queue by reseting the query_group as below

```sql
RESET query_group;

SELECT
  AVG(l.priceperticket * s.qtysold)
FROM listing l, sales s
WHERE l.listid < 40000;
```

Let create an admin user in an admin usergroup

```sql
CREATE USER admin_user CREATEUSER PASSWORD '123Admin';

CREATE GROUP admin;

ALTER GROUP admin ADD USER admin_user;
```

In the first tab, set session to admin_user and run the below command. Then observe queires in queue in second and third tabs.

```sql
SET SESSION AUTHORIZATION 'admin_user';

SELECT
  AVG(l.priceperticket * s.qtysold)
FROM listing l, sales s
WHERE l.listid < 40000;
```

Query Groups versus User Group. So what happens if a query groupis specified in the query AND the user is in a user group? THE WLM Queue Assignment Rules assign the query to the first matching qeuue, based on the following diagram

TODO: add diagram here

The first queue (in order) that matches these rules will be used. This is why the order of the queues is important. Run the following query in the first tab. There are two queue match in this cases, and it match the first queue first (retail)

```json
[
  {
    "order": "queue 1",
    "query_group": "retail"
  },
  {
    "order": "queue 2",
    "query_group": "admin"
  }
]
```

```sql
SET query_group TO retail;

SELECT
  AVG(l.priceperticket * s.qtysold)
FROM listing l, sales s
WHERE l.listid < 40000;

RESET query_group;
```

3. Concurrency in a queue

Slots are units of memory and CPU that are used to process queires. You might overwrite the slot count when you have occasional queries that take a lot of resources in the cluster such as VACCUm operation in the database. Overwrite by SET wlm_query_slot_count TO X;

```sql
SET wlm_query_slot_count TO 3;

SELECT
  AVG(l.priceperticket * s.qtysold)
FROM listing l, sales s
WHERE l.listid < 40000;

RESET wlm_query_slot_count;
```

4. Queueing queries

The retail queue is allocated 2 slots, so

- Run first quey in first tab with 1 slot
- Run second query in second tab with 3 slots
- Observe the queue/waiting in third tab

Then a query will be waited in a queue. If there are insufficient slots avaiable in a queue, queries will wait until sufficient sltos are available. In the first tab, run below query.

```sql
SET query_group TO retail;

SET enable_result_cache_for_session TO OFF;

SELECT
  AVG(l.priceperticket * s.qtysold)
FROM listing l, sales s
WHERE l.listid < 40000;
```

Then in second tab, run below query

```sql
SET query_group TO retail;

SET wlm_query_slot_count TO 2;

SET enable_result_cache_for_session TO OFF;

SELECT
  AVG(l.priceperticket * s.qtysold)
FROM listing l, sales s
WHERE l.listid < 40000;
```

Run the query that already in the third tab and observe things, there will be a queue waiting the a queue

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

## Concurrency Scaling

- [scale read and write redshift](https://aws.amazon.com/blogs/big-data/scale-read-and-write-workloads-with-amazon-redshift/)
- [concurency scaling redshift](https://aws.amazon.com/blogs/aws/new-concurrency-scaling-for-amazon-redshift-peak-performance-at-all-times/)

Let use Process in python to send concurrent queries to Redshift Serverless

```py
import os
import redshift_connector
import pandas as pd
from multiprocessing import Process

def run_query():
    """
    """
    # create a connection
    conn = redshift_connector.connect(
     host='hello.111222333444.ap-southeast-1.redshift-serverless.amazonaws.com',
     database='dev',
     port=5439,
     user='admin',
     password='')
    # create cursor
    cursor = conn.cursor()
    # query
    query= """
    select c_name, sum(o_totalprice) as total_purchase from (
    select c_name, o_totalprice from customer, orders
    where customer.c_custkey = orders.o_custkey
    ) group by c_name order by total_purchase desc limit 10;
    """
    # set cache result off
    cursor.execute("""
    SET enable_result_cache_for_session TO off;
    """)
    # run query
    cursor.execute(query)
    # return data frame
    df: pd.DataFrame = cursor.fetch_dataframe()
    # print result
    print("thread {} \n".format(os.getpid()))
    print(df.head())

for k in range(100):
    Process(target=run_query).start()
```

## Snapshot and Recovery

## Resize Cluster

## Reference

- [svl_query_summary](https://docs.aws.amazon.com/redshift/latest/dg/r_SVCS_S3QUERY_SUMMARY.html)

- [how sort key work in redshift](https://docs.aws.amazon.com/redshift/latest/dg/t_Sorting_data.html)

- [svv_table_info](https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_TABLE_INFO.html)

- [wlm queue concurency limit on main](https://docs.aws.amazon.com/redshift/latest/dg/c_workload_mngmt_classification.html)

- [redshift serverless annoucement](https://aws.amazon.com/blogs/aws/introducing-amazon-redshift-serverless-run-analytics-at-any-scale-without-having-to-manage-infrastructure/)

- [redshift serverless consideration](https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-known-issues.html)
