---
author: haimtran
title: lab 2 create a redshift cluster
date: 24/08/2023
---

## Create a VPC

- A VPC with a public subnet, single az

```ts
import { aws_ec2, aws_iam, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

export class NetworkStack extends Stack {
  public readonly vpc: aws_ec2.Vpc;
  public readonly clusterSG: aws_ec2.SecurityGroup;
  public readonly serverlessSG: aws_ec2.SecurityGroup;
  public readonly roles: aws_iam.Role[] = new Array<aws_iam.Role>();

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.vpc = new aws_ec2.Vpc(this, "VpcRedshift", {
      vpcName: "VpcRedshift",
      cidr: "10.10.0.0/16",
      maxAzs: 1,
      enableDnsSupport: true,
      enableDnsHostnames: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "PublicSubnet1",
          subnetType: aws_ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // security group for redshift cluster
    this.clusterSG = new aws_ec2.SecurityGroup(
      this,
      "SecurityGroupForRedshiftCluster",
      {
        securityGroupName: "SecurityGroupForRedshiftCluster",
        vpc: this.vpc,
      }
    );

    // peer redshift security group with notebook
    this.clusterSG.addIngressRule(
      aws_ec2.Peer.securityGroupId(sgNotebook.securityGroupId),
      aws_ec2.Port.tcp(5439)
    );

    // associate role for data engineer
    const deRole = new aws_iam.Role(
      this,
      "RedshiftAssociateIAMRoleForDataEngineer",
      {
        roleName: "RedshiftAssociateIAMRoleForDataEngineer",
        assumedBy: new aws_iam.CompositePrincipal(
          new aws_iam.ServicePrincipal("redshift.amazonaws.com"),
          new aws_iam.ServicePrincipal("sagemaker.amazonaws.com"),
          new aws_iam.ServicePrincipal("redshift-serverless.amazonaws.com")
        ),
      }
    );

    deRole.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["s3:*"],
      })
    );

    deRole.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["glue:*"],
      })
    );

    deRole.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonRedshiftAllCommandsFullAccess"
      )
    );

    //
    this.roles.push(deRole);
  }
}
```

## Create a Cluster

- Parameter Group
- Subnet Group

```ts
interface RedshiftClusterProps extends StackProps {
  vpc: aws_ec2.Vpc;
  sg: aws_ec2.SecurityGroup;
  roles: aws_iam.Role[];
  version: string;
}

export class RedshiftCluster extends Stack {
  constructor(scope: Construct, id: string, props: RedshiftClusterProps) {
    super(scope, id, props);

    // subnet group
    const subnetGroup = new aws_redshift.CfnClusterSubnetGroup(
      this,
      "SubnetGroupForRedshiftCluster",
      {
        description: "subnet group for redshift cluster",
        subnetIds: props.vpc.publicSubnets.map((subnet) => subnet.subnetId),
      }
    );

    // parameter group
    const parameterGroup = new aws_redshift.CfnClusterParameterGroup(
      this,
      "ParameterGroupDemo",
      {
        description: "demo",
        // currently only redshift-1.0 version
        parameterGroupFamily: props.version,
        parameterGroupName: "ParameterGroupDemo",
        parameters: [
          {
            parameterName: "statement_timeout",
            // 0 means turn-off limitation
            parameterValue: "0",
          },
          {
            parameterName: "max_concurrency_scaling_clusters",
            // 0 means turn-off limitation
            parameterValue: "10",
          },
          {
            parameterName: "wlm_json_configuration",
            parameterValue: JSON.stringify(wlm),
          },
        ],
        tags: [
          {
            key: "name",
            value: "demo",
          },
        ],
      }
    );
    // redshift cluster
    const cluster = new aws_redshift.CfnCluster(this, "RedshiftCluster", {
      clusterType: "multi-node",
      dbName: "demo",
      masterUsername: "demo",
      masterUserPassword: "Admin2023",
      nodeType: "dc2.large",
      numberOfNodes: 2,
      port: 5439,
      // for security purpose
      publiclyAccessible: false,
      // publiclyAccessible: true,
      iamRoles: props.roles.map((role) => role.roleArn),
      availabilityZone: props.vpc.availabilityZones[0],
      clusterSubnetGroupName: subnetGroup.ref,
      vpcSecurityGroupIds: [props.sg.securityGroupId],
      clusterParameterGroupName: parameterGroup.parameterGroupName,
      snapshotCopyRetentionPeriod: 1,
      manualSnapshotRetentionPeriod: 1,
    });

    cluster.addDependency(subnetGroup);
    cluster.addDependency(parameterGroup);
  }
}
```

## Basic Query

Let show table information

```sql
SELECT * FROM pg_table_def
```

Let create a item table

```sql
CREATE TABLE items (
    id INT PRIMARY KEY,
    name VARCHAR(25),
    description VARCHAR(150)
)

```

Show informabtion about item table

```sql
SELECT *
FROM pg_table_def
WHERE tablename = 'items'

```

Retrieve information about user

```sql
SELECT * FROM pg_user
```

## Create User

Let creat an user

```sql
CREATE USER student PASSWORD 'Redshift123'
```

View updated information about users

```sql
SELECT * FROM pg_user
```

Upate the student user to be a superuser

```sql
ALTER USER student CREATEUSER
```

## Query History

```sql
SELECT * FROM stl_query
```

and

```sql
SELECT *
FROM stl_query
WHERE userid != 1

```

Show all parameteres setting which is from parameter group

```sql
SHOW ALL
```
