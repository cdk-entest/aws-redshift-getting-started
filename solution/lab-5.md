---
title: day 2 - lab 5
description: day 2 lab 5 copy command in detail
author: haimtran
publishedDate: 28/07/2023
date: 28/07/2023
---

## COPY Command

- [copy example from docs](https://docs.aws.amazon.com/redshift/latest/dg/r_COPY_command_examples.html)
- [COPY parameters](https://docs.aws.amazon.com/redshift/latest/dg/r_COPY.html)

How to check error of COPY commands

```sql
SELECT * FROM STL_LOAD_ERRORS
```

```sql
SELECT * FROM STL_LOAD_ERRORS
WHERE query = (SELECT MAX(query) from STL_LOAD_ERRORS)
```

Solution for task 2 - loading txt data

```sql
COPY task2
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/task2.txt'
IAM_ROLE '<INSERT-YOUR-REDSHIFT-ROLE>'
REGION 'us-west-2'
IGNOREHEADER 1
MAXERROR 10
```

Solution for task 3 - loading delimited text

```sql
COPY task3
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/task3.txt'
IAM_ROLE 'arn:aws:iam::799371036956:role/Redshift-Role'
DELIMITER '%'
REGION 'us-west-2'
```

Solution for task 4 - loading fixed-length data

```sql
COPY task4
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/task4.txt'
IAM_ROLE 'arn:aws:iam::799371036956:role/Redshift-Role'
FIXEDWIDTH '5, 47, 17, 13, 7, 5, 7, 4'
REGION 'us-west-2'
```

Solution for task 5 - quotation mark

```sql
COPY task5
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/task5.txt'
IAM_ROLE 'arn:aws:iam::799371036956:role/Redshift-Role'
CSV QUOTE AS '"'
REGION 'us-west-2'
```

Solution for task 6 - loading json data

```sql
COPY task6
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/task6.json'
IAM_ROLE 'arn:aws:iam::799371036956:role/Redshift-Role'
REGION 'us-west-2'
JSON 'auto';
```

Solution for challenge 1 - loading via manifest file

```json
{
  "entries": [
    {
      "url": "s3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/challenge1a.txt",
      "mandatory": true
    },
    {
      "url": "s3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/challenge1b.txt",
      "mandatory": true
    },
    {
      "url": "s3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/challenge1c.txt",
      "mandatory": true
    }
  ]
}
```

and copy

```sql
COPY challenge1
FROM 's3://manifest-haimtran-01082023/challenge1.manifest'
IAM_ROLE 'arn:aws:iam::799371036956:role/Redshift-Role'
REGION 'us-west-2'
manifest;
```

Solution for challenge 2 - solving multiple issues

```sql
COPY challenge2
FROM 's3://aws-tc-largeobjects/ILT-TF-200-DBDWOA-1/copy-command/challenge2.gz'
IAM_ROLE 'arn:aws:iam::799371036956:role/Redshift-Role'
REGION 'us-west-2'
CSV
IGNOREBLANKLINES
FILLRECORD
TRUNCATECOLUMNS
GZIP
DELIMITER ','
```

> If you load the file using the DELIMITER parameter to specify comma-delimited input, the COPY command fails because some input fields contain commas. You can avoid that problem by using the CSV parameter and enclosing the fields that contain commas in quotation mark characters.
