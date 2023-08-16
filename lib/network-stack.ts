// 17 JAN 2022
// vpc for redshift at least three subnets

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
      cidr: "192.168.0.0/16",
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
          name: "PrivateSubnet",
          subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // security group for notebook
    const sgNotebook = new aws_ec2.SecurityGroup(
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
      aws_ec2.Peer.securityGroupId(sgNotebook.securityGroupId),
      aws_ec2.Port.tcp(5439)
    );

    this.serverlessSG.addIngressRule(
      aws_ec2.Peer.securityGroupId(sgNotebook.securityGroupId),
      aws_ec2.Port.tcp(5439)
    );

    // iam role for data engineer

    // iam role for data analysis

    // iam role for redshift
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

    // export roles for redshift cluster later on
    this.roles.push(deRole);
    this.roles.push(daRole);
  }
}
