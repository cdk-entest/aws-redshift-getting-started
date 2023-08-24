Create table

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

Load data from S3 and this take about 3 minutes as the data size of 6GB with 96,825,753 rows

```sql
COPY flights
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/flightdata/flights-usa'
IAM_ROLE '<INSERT-YOUR-REDSHIFT-ROLE>'
CSV
GZIP
REGION 'us-west-2';
```

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

Simple Group By

```sql
SELECT
  carrier,
  SUM (departures)
FROM flights
GROUP BY carrier
ORDER BY 2 DESC
LIMIT 10;
```

:smile:

> [!IMPORTANT]
> Crucial information necessary for users to succeed.

## Reference

- [Github markdown basic](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)
