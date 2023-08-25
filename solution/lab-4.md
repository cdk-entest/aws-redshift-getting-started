---
author: haimtran
title: lab 4 loading real-time data into your amazon redshift cluster
date: 24/08/2023
---

## Introduction

- Create a table in Amazon Resdhift
- Create a Kinesis Data Firehouse delivery stream and use it to load data into Amazon Redshift
- Confirm receipt of streaming records

> [!IMPORTANT]
> An EC2 automatically send messages to created Kinesis Firehose Delivery Stream
> Please ensure bucket name: scores-123-xxx
> Please ensure Kinesis Delivery Stream name: redshift-game-stream

## Create a Table

Let create a table

```sql
CREATE TABLE game_score (
  record_time TIMESTAMP,
  user_id INT,
  game_id INT,
  score INT
)

```

## Create a Firehose Delivery Stream

Let create a firehose delivery stream, and configure the destination as Amazon Redshift

- name: redshift-game-stream
- cluster
- username
- password
- database
- columns: record_time, user_id, game_id, score
- intermediate s3 bucket: shouldbe scores-123-xxx
- COPY options should be: format CSV
- Buffer interval: 60
- Role for the delivery stream

## Check Result

Wait about 1 minute and check data in S3 and Redshift table

```sql
SELECT COUNT(*) FROM game_score
```

```sql
SELECT * FROM game_score
LIMIT 50

```
