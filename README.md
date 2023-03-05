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
Actor2Religion1Code  varchar(256),hai_table
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
