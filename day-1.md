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

**TODO: figure here**

- Cluster architecture: storage, node type, MPP, AQUA
- Parameter group, subnet group, Multi-AZ
- Redshift serverless
- IAM Associated Roles

## Connections

- Query Editor V2
- UI, BI tools such as SQL Workbench, pgweb (JDBC, ODBC)
- Redshift Data API such as python, aws clid redshift-data
- Python driver, connection libraries such as redshift_connector, psycop2

## Getting Started

- COPY data from S3
- System tables
- Simple queries

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

Let create tables using default distribution

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

Optionally, we can specify distribution style and sortkey (day 2)

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

System table - query history

```sql
select * from SYS_QUERY_HISTORY;
```

System table - load data history

```sql
select * from SYS_LOAD_HISTORY;

select * from SYS_LOAD_HISTORY
where data_source like '%immersionday%'
order by duration desc;
```

System table - data distribution

```sql
select * from svv_table_info;
```

Query queue information

```sql
select query, service_class, queue_elapsed, exec_elapsed, wlm_total_elapsed
from svl_query_queue_info
where wlm_total_elapsed > 0;
```

Simple join and explain plan query

```sql
explain
select c_name, o_totalprice from customer, orders
where customer.c_custkey = orders.o_custkey
```

Find top 10 cutomers by joining customer table with orders table

```sql
select c_name, sum(o_totalprice) as total_purchase from (
  select c_name, o_totalprice from customer, orders
  where customer.c_custkey = orders.o_custkey
) group by c_name order by total_purchase desc limit 10
```

## Disk Consumption

```sql
SELECT
  owner AS node,
  diskno,
  used,
  capacity,
  used/capacity::numeric * 100 as percent_used
FROM stv_partitions
WHERE host = node
ORDER BY 1, 2;
```

and

```sql
SELECT
  name,
  count(*)
FROM stv_blocklist
JOIN (SELECT DISTINCT name, id as tbl from stv_tbl_perm) USING (tbl)
GROUP BY name;
```

## Examine Load Operation

From Redshift console, it is possible to check details of queries

- Query and Loads
- Query Details
- Query Plan
- CPU Utilization

## Security Management

Create a database user and gratn permissions

```sql

```

Check permission of an user on a table

```sql
select has_table_privilege('dauser', 'tpch.orders', 'select')
```

Check permissions of users on some tables by using this cross join

```sql
SELECT
    schemaname,
    tablename
    ,usename
    ,HAS_TABLE_PRIVILEGE(users.usename,  schemaname || '.' || tablename, 'select') AS sel
FROM
(SELECT * from pg_tables WHERE schemaname = 'tpch' and tablename in ('orders', 'customer')) as tables,
(SELECT * FROM pg_user) AS users;
```

Check permissions grated to an user

```sql
SELECT
    u.usename,
    s.schemaname,
    has_schema_privilege(u.usename,s.schemaname,'create') AS user_has_select_permission,
    has_schema_privilege(u.usename,s.schemaname,'usage') AS user_has_usage_permission
FROM
    pg_user u
CROSS JOIN
    (SELECT DISTINCT schemaname FROM pg_tables) s
WHERE
    u.usename = 'dauser'
    AND s.schemaname = 'tpch'
```

## Redshift Serverless

- namespace
- workgroup
- [charged_seconds and compute_seconds](https://stackoverflow.com/questions/75182290/redshift-serverless-charged-seconds-and-compute-seconds)
- [billing for redshift serverless](https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-billing.html)
- set limit such as maximum rpu hours
- set session timeout

To use Redshift serverless, we need to create a namespace and a workgroup. A namespace is to manage username, database, roles, logs, and a workgroup is to manage capacity, security group.

Let create a namespace in CDK

```ts
const namespace = new aws_redshiftserverless.CfnNamespace(
  this,
  "RedshiftNameSpace",
  {
    namespaceName: "demo",
    adminUsername: "admin",
    adminUserPassword: "Admin2023",
    dbName: "demo",
    defaultIamRoleArn: role.roleArn,
    iamRoles: [role.roleArn],
    logExports: ["userlog", "connectionlog", "useractivitylog"],
  }
);
```

Let create a workgroup in CDK

```ts
const workgroup = new aws_redshiftserverless.CfnWorkgroup(
  this,
  "RedshiftWorkGroup",
  {
    workgroupName: "demo",
    baseCapacity: 32,
    namespaceName: "demo",
    subnetIds: props.vpc.publicSubnets.map((subnet) => subnet.subnetId),
    publiclyAccessible: false,
    securityGroupIds: [sg.securityGroupId],
  }
);
```

Let check the cost sofar

```sql
select trunc(start_time) "Day",
sum(charged_seconds) as num_seconds,
(sum(charged_seconds)/3600::double precision) * 0.36 as cost_incurred
from sys_serverless_usage
group by 1
order by 1
```

Simple query to check charged_seconds and compute_seconds

```sql
select * from sys_serverless_usage
```

## Reference

- [redshift common task](https://docs.aws.amazon.com/redshift/latest/gsg/database-tasks.html)

- [redshift manager db security](https://docs.aws.amazon.com/redshift/latest/dg/r_Database_objects.html)

- [redshift node type](https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html#rs-upgrading-to-ra3)

- [redshift role based access control](https://aws.amazon.com/blogs/big-data/simplify-management-of-database-privileges-in-amazon-redshift-using-role-based-access-control/)

- [elastic resize and classic resize](https://docs.aws.amazon.com/redshift/latest/mgmt/managing-cluster-operations.html#elastic-resize)

- [how to resize cluster](https://repost.aws/knowledge-center/resize-redshift-cluster)

- [redshift immersion day](https://catalog.workshops.aws/redshift-immersion/en-US)

- [redshift workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/380e0b8a-5d4c-46e3-95a8-82d68cf5789a/en-US/gettingstarted/lab2)

- [redshift management guide](https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-parameter-groups.html)

- [redshift deveopment guide](https://docs.aws.amazon.com/redshift/latest/dg/welcome.html)

- [wml setting](https://docs.aws.amazon.com/redshift/latest/dg/cm-c-defining-query-queues.html#wlm-timeout)

- [redshift quota and limit](https://docs.aws.amazon.com/redshift/latest/mgmt/amazon-redshift-limits.html)

- [parameter group default value](https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-parameter-groups.html)

- [TPCDS Cloud DWB](https://github.com/awslabs/amazon-redshift-utils/tree/master/src/CloudDataWarehouseBenchmark/Cloud-DWB-Derived-from-TPCDS)

- [redshift concurrency scaling](https://aws.amazon.com/blogs/big-data/scale-read-and-write-workloads-with-amazon-redshift/)

- [redshift concurrent queries python](https://saturncloud.io/blog/how-to-execute-redshift-queries-in-parallel-a-comprehensive-guide-for-data-scientists/)

- [redshift re-invent paper](https://d2cvlmmg8c0xrp.cloudfront.net/book/amazon_redshift_reinvent.pdf)

- [redshift compare node type](https://aws.amazon.com/blogs/big-data/compare-different-node-types-for-your-workload-using-amazon-redshift/)

- [redshift user permissions](https://chartio.com/learn/amazon-redshift/how-to-view-permissions-in-amazon-redshift/#:~:text=To%20view%20the%20permissions%20of,usename%2C%20s.)

- [boto3 redshift-data](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/redshift-data.html)

- [redshift data api cli](https://aws.amazon.com/blogs/big-data/using-the-amazon-redshift-data-api-to-interact-with-amazon-redshift-clusters/)

- [has_table_privilege](https://docs.aws.amazon.com/redshift/latest/dg/r_HAS_TABLE_PRIVILEGE.html)
