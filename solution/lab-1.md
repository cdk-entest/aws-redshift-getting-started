---
author: haimtran
title: lab 1 getting started with redshift
date: 24/08/2023
---

> [!IMPORTANT]
> It takes about 3 minutes to load 6GB data with 96M rows
> Goto query history to check

## Create table

```sql
CREATE TABLE flights (
  year           smallint,
  month          smallint,
  day            smallint,
  carrier        varchar(80) DISTKEY,
  origin         char(3),
  dest           char(3),
  aircraft_code  char(3),
  miles          int,
  departures     int,
  minutes        int,
  seats          int,
  passengers     int,
  freight_pounds int
);

```

## COPY Data

Load data from S3 and this take about 3 minutes as the data size of 6GB with 96,825,753 rows

```sql
COPY flights
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/flightdata/flights-usa'
IAM_ROLE '<INSERT-YOUR-REDSHIFT-ROLE>'
CSV
GZIP
REGION 'us-west-2';
```

Check COPY performance

```sql
select * from SYS_LOAD_HISTORY
where data_source like '%aws-tc%'
order by duration desc;
```

And query history

```sql
select query, service_class, queue_elapsed, exec_elapsed, wlm_total_elapsed
from svl_query_queue_info
where wlm_total_elapsed > 0;
```

## Simple Query

Query to check

```sql
SELECT COUNT(*) FROM flights;
```

Another check

```sql
SELECT *
FROM flights
ORDER BY random()
LIMIT 10;
```

Find top 10 carriers by number of departure

```sql
SELECT
  carrier,
  SUM (departures)
FROM flights
GROUP BY carrier
ORDER BY 2 DESC
LIMIT 10;
```

## Join Tables

Let create another table called aircraft

```sql
CREATE TABLE aircraft (
  aircraft_code CHAR(3) SORTKEY,
  aircraft      VARCHAR(100)
);
```

Then COPY data into it

```sql
COPY aircraft
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/flightdata/lookup_aircraft.csv'
IAM_ROLE '<INSERT-YOUR-REDSHIFT-ROLE>'
IGNOREHEADER 1
CSV
TRUNCATECOLUMNS
REGION 'us-west-2';
```

Show the types of aircraft that are flown the most

```sql
SELECT
  aircraft,
  SUM(departures) AS trips
FROM flights
JOIN aircraft using (aircraft_code)
GROUP BY aircraft
ORDER BY trips DESC
LIMIT 10;
```

## Performance

Explain query plan

```sql
EXPLAIN
SELECT
  aircraft,
  SUM(departures) AS trips
FROM flights
JOIN aircraft using (aircraft_code)
GROUP BY aircraft
ORDER BY trips DESC
LIMIT 10;
```

> [!IMPORTANT]
> Explain: cost, hash join, distribution
> Which table become a hash table

Check data compression

```sql
ANALYZE COMPRESSION flights;
```

## Create Table From Others

```sql
CREATE TABLE airports (
  airport_code CHAR(3) SORTKEY,
  airport      varchar(100)
);

```

Then copy data into the airport table

```sql
COPY airports
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/flightdata/lookup_airports.csv'
IAM_ROLE '<INSERT-YOUR-REDSHIFT-ROLE>'
IGNOREHEADER 1
CSV
TRUNCATECOLUMNS
REGION 'us-west-2';

```

Create a new table about flights to last vegas

```sql
CREATE TABLE vegas_flights
  DISTKEY (origin)
  SORTKEY (origin)
AS
SELECT
  flights.*,
  airport
FROM flights
JOIN airports ON origin = airport_code
WHERE dest = 'LAS';
```

Discover where the most popular flights to Las Vegas orignate from

```sql
SELECT
  airport,
  to_char(SUM(passengers), '999,999,999') as passengers
FROM vegas_flights
GROUP BY airport
ORDER BY SUM(passengers) desc
LIMIT 10;
```

## Disk Space and Data Distribution

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

- Node: the node within the cluster
- Disno: the disk number
- Used: Megabyte of disk space used
- Capacity: Available disk space, 160GB per node, but extra is provided for database replication
- Percent_used: Percentage of disk space used

Let see how much space each of the tables is taking

```sql
SELECT
  name,
  count(*)
FROM stv_blocklist
JOIN (SELECT DISTINCT name, id as tbl from stv_tbl_perm) USING (tbl)
GROUP BY name;
```

## Query Monitoring

<img width="1045" alt="Screenshot 2023-08-24 at 14 43 38" src="https://github.com/cdk-entest/aws-redshift-getting-started/assets/20411077/106d54ef-0415-4647-badf-0dad9c00207f">

and

<img width="1045" alt="Screenshot 2023-08-24 at 14 43 50" src="https://github.com/cdk-entest/aws-redshift-getting-started/assets/20411077/dc4d2416-0885-45ae-b433-0d4993a8478a">

## Reference

- [Github markdown basic](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)

- [Explain hash join](https://dev.mysql.com/blog-archive/hash-join-in-mysql-8/)

- [Why smaller table become hash table](https://stackoverflow.com/questions/59855114/why-do-hash-joins-create-a-hash-table-out-of-the-smaller-table-not-the-larger-on#:~:text=You%20optimize%20this%20by%20processing,to%20hash%20the%20smaller%20table.)
