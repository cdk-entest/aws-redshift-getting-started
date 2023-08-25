---
author: haimtran
title: lab 8 auditing and monitoring amazon redshift cluster
date: 24/08/2023
---

## Introduction

- Use database audit logs
- Configure CW metrics and alarms
- Configure event and notification for Redshift

## Setup

In the admin connection, run this query to create customer table, and tom user as below

```sql
CREATE TABLE customer (
  id INT PRIMARY KEY,
  name VARCHAR(25),
  active BOOLEAN
);

INSERT INTO customer (id, name, active) VALUES
  (1, 'John Doe', TRUE),
  (2, 'Jane Doe', TRUE);

CREATE USER tom WITH PASSWORD 'Redshift123' NOCREATEDB NOCREATEUSER;

GRANT ALL ON TABLE customer TO tom;
```

From tom user, run this query

```sql
UPDATE customer
SET active = FALSE;

```

## Audit Logs

Now from admin, check audit logs (who do what) from stl_connection_log table

```sql
SELECT *
FROM stl_connection_log
WHERE dbname='lab'
  AND username in ('admin', 'tom')
ORDER BY recordtime;

```

Check the stl_userlog table

```sql
SELECT username, action, usecreatedb, usesuper, recordtime
FROM stl_userlog
ORDER BY recordtime;

```

Check query and user from stl_query and stl_userlog tables

```sql
SELECT q.userid, u.username, q.query, q.database, q.querytxt
FROM stl_query q, stl_userlog u
WHERE querytxt ILIKE '%UPDATE%'
  AND q.userid = u.userid;

```

## Alarm and Notification

- Notify when there are issues in Redhisft cluster
- Notify when alarm such as number of connection greater than 2
