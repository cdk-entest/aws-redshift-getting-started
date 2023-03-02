// 17 JAN 2022
// vpc for redshift at least three subnets

import { aws_ec2, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

export class NetworkStack extends Stack {
  public readonly vpc: aws_ec2.Vpc;
  public readonly sg: aws_ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

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

    // security group for redshift cluster
    this.sg = new aws_ec2.SecurityGroup(
      this,
      "SecurityGroupForRedshiftCluster",
      {
        securityGroupName: "SecurityGroupForRedshiftCluster",
        vpc: this.vpc,
      }
    );

    this.sg.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(5439));
  }
}
