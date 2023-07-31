import { aws_ec2, aws_iam, aws_redshift, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

const wlm = [
  {
    auto_wlm: true,
    user_group: ["data_engineers"],
    query_group: ["load", "transform"],
    queue_type: "auto",
    name: "ETL",
    rules: [
      {
        rule_name: "Rule_0",
        action: "abort",
        predicate: [
          {
            metric_name: "return_row_count",
            operator: ">",
            value: 1000,
          },
        ],
      },
    ],
    concurrency_scaling: "off",
    priority: "normal",
  },
  {
    auto_wlm: true,
    user_group: [],
    query_group: [],
    name: "Default queue",
  },
  {
    short_query_queue: true,
  },
];

interface RedshiftClusterProps extends StackProps {
  vpc: aws_ec2.Vpc;
  sg: aws_ec2.SecurityGroup;
  version: string;
}

export class RedshiftCluster extends Stack {
  constructor(scope: Construct, id: string, props: RedshiftClusterProps) {
    super(scope, id, props);

    // associate role for data analyst
    const daRole = new aws_iam.Role(
      this,
      "RedshiftAssociateIAMRoleForDataAnalyst",
      {
        roleName: "RedshiftAssociateIAMRoleForDataAnalyst",
        assumedBy: new aws_iam.CompositePrincipal(
          new aws_iam.ServicePrincipal("redshift.amazonaws.com"),
          new aws_iam.ServicePrincipal("sagemaker.amazonaws.com"),
          new aws_iam.ServicePrincipal("redshift-serverless.amazonaws.com")
        ),
      }
    );

    daRole.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["s3:*"],
      })
    );

    daRole.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonRedshiftAllCommandsFullAccess"
      )
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

    deRole.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonRedshiftAllCommandsFullAccess"
      )
    );

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
      iamRoles: [deRole.roleArn, daRole.roleArn],
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
