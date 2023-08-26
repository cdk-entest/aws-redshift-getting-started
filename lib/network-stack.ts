// 17 JAN 2022
// vpc for redshift at least three subnets

import {
  aws_ec2,
  aws_iam,
  aws_servicecatalog,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface NetworkProps extends StackProps {
  cidr: string;
  name: string;
}

export class NetworkStack extends Stack {
  public readonly vpc: aws_ec2.Vpc;
  public readonly clusterSG: aws_ec2.SecurityGroup;
  public readonly serverlessSG: aws_ec2.SecurityGroup;
  public readonly notebookSG: aws_ec2.SecurityGroup;
  public readonly auroraSG: aws_ec2.SecurityGroup;
  public readonly notebookRole: aws_iam.Role;
  public readonly auroraRole: aws_iam.Role;
  public readonly roles: aws_iam.Role[] = new Array<aws_iam.Role>();

  constructor(scope: Construct, id: string, props: NetworkProps) {
    super(scope, id, props);

    this.vpc = new aws_ec2.Vpc(this, "VpcRedshift", {
      vpcName: props.name,
      cidr: props.cidr,
      maxAzs: 3,
      enableDnsSupport: true,
      enableDnsHostnames: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "PublicSubnet",
          subnetType: aws_ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "PrivateSubnet",
          subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // aurora security group
    this.auroraSG = new aws_ec2.SecurityGroup(
      this,
      "SecurityGroupForAuroraEtlRedshift",
      {
        securityGroupName: "SecurityGroupForAuroraEtlRedshift",
        vpc: this.vpc,
      }
    );

    // security group for notebook
    this.notebookSG = new aws_ec2.SecurityGroup(
      this,
      "SecurityGroupForSageMakerNotebookToRedshift",
      {
        securityGroupName: "SecurityGroupForSageMakerNotebookRedshift",
        vpc: this.vpc,
      }
    );

    // security group for serverless redshift
    this.serverlessSG = new aws_ec2.SecurityGroup(
      this,
      "SecurityGroupForRedshiftServerless",
      {
        securityGroupName: "SecurityGroupForRedshiftServerless",
        vpc: this.vpc,
      }
    );

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
      aws_ec2.Peer.securityGroupId(this.notebookSG.securityGroupId),
      aws_ec2.Port.tcp(5439)
    );

    this.serverlessSG.addIngressRule(
      aws_ec2.Peer.securityGroupId(this.notebookSG.securityGroupId),
      aws_ec2.Port.tcp(5439)
    );

    this.auroraSG.addIngressRule(
      aws_ec2.Peer.securityGroupId(this.notebookSG.securityGroupId),
      aws_ec2.Port.tcp(3306)
    );

    // notebook role
    this.notebookRole = new aws_iam.Role(
      this,
      "RoleForSageMakerNotebookRedshift",
      {
        roleName: "RoleForSageMakerNotebookRedshift",
        assumedBy: new aws_iam.ServicePrincipal("sagemaker.amazonaws.com"),
      }
    );

    this.notebookRole.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonSageMakerFullAccess"
      )
    );

    this.notebookRole.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonRedshiftDataFullAccess"
      )
    );

    this.notebookRole.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        resources: ["*"],
        actions: ["logs:*", "redshift-serverless:*", "redshift:*", "s3:*"],
      })
    );

    // associated role for aurora
    this.auroraRole = new aws_iam.Role(this, "RoleForAuroraZeroEtl", {
      roleName: "RoleForAuroraZeroEtl",
      assumedBy: new aws_iam.ServicePrincipal("rds.amazonaws.com"),
    });

    this.auroraRole.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess")
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

    deRole.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess")
    );

    // export roles for redshift cluster later on
    this.roles.push(deRole);
  }
}
