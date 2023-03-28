---
title: getting started with redshift
description: getting started with redshift
author: haimtran
publishedDate: 01 MAR 2023
date: 01/03/2022
---

## Introduction

- create a Redshift cluster
- create a connection
- run some quries from a notebook
- experiment with gelt_data
- experiment with sql notebook and redshift ml

## Network Stack

We need a VPC to host a Reshift cluster

```ts
this.vpc = new aws_ec2.Vpc(this, "VpcRedshift", {
  vpcName: "VpcRedshift",
  cidr: "10.0.0.0/16",
  maxAzs: 3,
  enableDnsSupport: true,
  enableDnsHostnames: true,
  subnetConfiguration: [
    {
      cidrMask: 24,
      name: "PublicSubnet1",
      subnetType: aws_ec2.SubnetType.PUBLIC,
    },
    {
      cidrMask: 24,
      name: "PublicSubnet2",
      subnetType: aws_ec2.SubnetType.PUBLIC,
    },
    {
      cidrMask: 24,
      name: "PublicSubnet3",
      subnetType: aws_ec2.SubnetType.PUBLIC,
    },
  ],
});
```

then create a security group for the cluster, need to open port 5439

```ts
this.sg = new aws_ec2.SecurityGroup(this, "SecurityGroupForRedshiftCluster", {
  securityGroupName: "SecurityGroupForRedshiftCluster",
  vpc: this.vpc,
});

this.sg.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(5439));
```

## Cluster Stack

let create a redshift cluster with 2 nodes, a database and a user name demo. First need to create role for the cluster

```ts
const role = new aws_iam.Role(this, "IamRoleForRedshiftCluster", {
  roleName: "IamRoleForRedshiftCluster",
  assumedBy: new aws_iam.CompositePrincipal(
    new aws_iam.ServicePrincipal("redshift.amazonaws.com"),
    new aws_iam.ServicePrincipal("sagemaker.amazonaws.com"),
    new aws_iam.ServicePrincipal("redshift-serverless.amazonaws.com")
  ),
});

role.addToPolicy(
  new aws_iam.PolicyStatement({
    effect: aws_iam.Effect.ALLOW,
    resources: ["*"],
    actions: ["s3:*"],
  })
);

role.addManagedPolicy(
  aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
    "AmazonRedshiftAllCommandsFullAccess"
  )
);
```

then create subnet group

```ts
const subnetGroup = new aws_redshift.CfnClusterSubnetGroup(
  this,
  "SubnetGroupForRedshiftCluster",
  {
    description: "subnet group for redshift cluster",
    subnetIds: props.vpc.publicSubnets.map((subnet) => subnet.subnetId),
  }
);
```

finally, create the redshift cluster with databaes and user name

```ts
const cluster = new aws_redshift.CfnCluster(this, "RedshiftCluster", {
  clusterType: "multi-node",
  dbName: "demo",
  masterUsername: "demo",
  masterUserPassword: "Demo@2023",
  nodeType: "dc2.large",
  numberOfNodes: 2,
  port: 5439,
  publiclyAccessible: true,
  iamRoles: [role.roleArn],
  availabilityZone: props.vpc.availabilityZones[0],
  clusterSubnetGroupName: subnetGroup.ref,
  vpcSecurityGroupIds: [props.sg.securityGroupId],
});

cluster.addDependsOn(subnetGroup);
```

## Serverless Stack

similarly, first we need to create role and security as for the cluster group, then create a namspace

```ts
const namespace = new aws_redshiftserverless.CfnNamespace(
  this,
  "RedshiftNameSpace",
  {
    namespaceName: "demo",
    adminUsername: "admin",
    adminUserPassword: "Admin#2023",
    dbName: "demo",
    defaultIamRoleArn: role.roleArn,
    iamRoles: [role.roleArn],
  }
);
```

create a workgroup

```ts
const workgroup = new aws_redshiftserverless.CfnWorkgroup(
  this,
  "RedshiftWorkGroup",
  {
    workgroupName: "demo",
    baseCapacity: 32,
    namespaceName: "demo",
    subnetIds: props.vpc.publicSubnets.map((subnet) => subnet.subnetId),
    publiclyAccessible: true,
    securityGroupIds: [sg.securityGroupId],
  }
);
```

## Connection

Either using notebook sql or normal query editor, we need to create a connection first.

- double check the associated IAM roles
- create a connection with username, dbname as specified in the cluster stack above

then can run query to create a table

```sql
CREATE TABLE region (
  R_REGIONKEY bigint NOT NULL,
  R_NAME varchar(25),
  R_COMMENT varchar(152))
diststyle all;
```

then copy data from S3 to the table

```sql
COPY region FROM 's3://redshift-immersionday-labs/data/region/region.tbl.lzo'
iam_role default
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;
```

## Python Connector

create a virtual env

```bash
python3 -m venv .env
```

activate and install dependencies

```bash
source .env/bin/activate
```

create a connector and send quries, please check the port 5439 and security group

```py
import redshift_connector
import json

with open("./config.json", "r") as file:
    config = json.load(file)
    # print(config)

conn = redshift_connector.connect(
    host=config['host'],
    port=config['port'],
    user=config['user'],
    password=config['password']
)

cusor = conn.cursor()
cusor.execute("select * from region")
result: tuple = cusor.fetchall()
print(result)
```

## Explore Gdelt_data

create a table

```sql
DROP TABLE IF EXISTS gdelt_data CASCADE;

CREATE TABLE gdelt_data (
GlobalEventId   bigint,
SqlDate  bigint,
MonthYear bigint,
Year   bigint,
FractionDate double precision,
Actor1Code varchar(256),
Actor1Name varchar(256),
Actor1CountryCode varchar(256),
Actor1KnownGroupCode varchar(256),
Actor1EthnicCode varchar(256),
Actor1Religion1Code varchar(256),
Actor1Religion2Code varchar(256),
Actor1Type1Code varchar(256),
Actor1Type2Code varchar(256),
Actor1Type3Code varchar(256),
Actor2Code varchar(256),
Actor2Name varchar(256),
Actor2CountryCode varchar(256),
Actor2KnownGroupCode varchar(256),
Actor2EthnicCode varchar(256),
Actor2Religion1Code  varchar(256),
Actor2Religion2Code varchar(256),
Actor2Type1Code varchar(256),
Actor2Type2Code varchar(256),
Actor2Type3Code varchar(256),
IsRootEvent bigint,
EventCode bigint,
EventBaseCode bigint,
EventRootCode bigint,
QuadClass bigint,
GoldsteinScale double precision,
NumMentions bigint,
NumSources bigint,
NumArticles bigint,
AvgTone double precision,
Actor1Geo_Type bigint,
Actor1Geo_FullName varchar(256),
Actor1Geo_CountryCode varchar(256),
Actor1Geo_ADM1Code varchar(256),
Actor1Geo_Lat double precision,
Actor1Geo_Long double precision,
Actor1Geo_FeatureID bigint,
Actor2Geo_Type bigint,
Actor2Geo_FullName varchar(256),
Actor2Geo_CountryCode varchar(256),
Actor2Geo_ADM1Code varchar(256),
Actor2Geo_Lat double precision,
Actor2Geo_Long double precision,
Actor2Geo_FeatureID bigint,
ActionGeo_Type bigint,
ActionGeo_FullName varchar(256),
ActionGeo_CountryCode varchar(256),
ActionGeo_ADM1Code varchar(256),
ActionGeo_Lat double precision,
ActionGeo_Long double precision,
ActionGeo_FeatureID bigint,
DATEADDED bigint
) ;
```

download the data from s3 into the table

```sql
COPY gdelt_data from 's3://gdelt-open-data/events/1979.csv'
region 'us-east-1' iam_role default csv delimiter '\t';
```

select columns for training a model

```sql
select AvgTone, EventCode, NumArticles, Actor1Geo_Lat, Actor1Geo_Long, Actor2Geo_Lat, Actor2Geo_Long from gdelt_data
```

create a K-mean model, later on can be called as a function news_monitoring_cluster in redshift. The model name is news_data_cluster

```sql
CREATE MODEL news_data_clusters
FROM (select AvgTone, EventCode, NumArticles, Actor1Geo_Lat, Actor1Geo_Long, Actor2Geo_Lat, Actor2Geo_Long
from gdelt_data)
FUNCTION  news_monitoring_cluster
IAM_ROLE default
AUTO OFF
MODEL_TYPE KMEANS
PREPROCESSORS 'none'
HYPERPARAMETERS DEFAULT EXCEPT (K '7')
SETTINGS (S3_BUCKET 'bucket-name-same-region-only');
```

redishift launch a sagemaker training job, and we can check the status of the model

```sql
SHOW MODEL NEWS_DATA_CLUSTERS;
```

use the model to identify the clusters associated with each GlobalEventId

```sql
select globaleventid, news_monitoring_cluster ( AvgTone, EventCode, NumArticles, Actor1Geo_Lat, Actor1Geo_Long, Actor2Geo_Lat, Actor2Geo_Long ) as cluster
from gdelt_data;
```

the function below will return the cluster number (k-mean)

```sql
news_monitoring_cluster ( AvgTone, EventCode, NumArticles, Actor1Geo_Lat, Actor1Geo_Long, Actor2Geo_Lat, Actor2Geo_Long )
```


## Load Data from S3 

[workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/9f29cdba-66c0-445e-8cbb-28a092cb5ba7/en-US/lab2)

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

About data size 

```json 
REGION (5 rows) - 2s
CUSTOMER (15M rows) – 2m
ORDERS - (76M rows) - 10s
PART - (20M rows) - 2m
SUPPLIER - (1M rows) - 10s
LINEITEM - (303M rows) - 22s
PARTSUPPLIER - (80M rows) - 15s
```

Data validation 

```sql 
 --Number of rows= 5
select count(*) from region;

 --Number of rows= 25
select count(*) from nation;

 --Number of rows= 76,000,000
select count(*) from orders;
```


## Reference 
- [Redshift Workshop Load Data](https://catalog.us-east-1.prod.workshops.aws/workshops/9f29cdba-66c0-445e-8cbb-28a092cb5ba7/en-US/lab2)

- [Redsfhit Deep Dive Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/380e0b8a-5d4c-46e3-95a8-82d68cf5789a/en-US)
