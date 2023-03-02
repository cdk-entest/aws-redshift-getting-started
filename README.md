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
    namespaceName: "haimtrandemo",
    adminUsername: "admin",
    adminUserPassword: "Agribank#865525",
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
    workgroupName: "haimtrandemo",
    baseCapacity: 32,
    namespaceName: "haimtrandemo",
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
