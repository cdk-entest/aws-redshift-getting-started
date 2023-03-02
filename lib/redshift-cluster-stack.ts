import { aws_ec2, aws_iam, aws_redshift, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

interface RedshiftClusterProps extends StackProps {
  vpc: aws_ec2.Vpc;
  sg: aws_ec2.SecurityGroup;
}

export class RedshiftCluster extends Stack {
  constructor(scope: Construct, id: string, props: RedshiftClusterProps) {
    super(scope, id, props);

    //    const sg = new aws_ec2.SecurityGroup(
    //      this,
    //      "SecurityGroupForRedshiftCluster",
    //      {
    //        securityGroupName: "SecurityGroupForRedshiftCluster",
    //        vpc: props.vpc,
    //      }
    //    );
    //
    //    sg.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(5439));

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

    const subnetGroup = new aws_redshift.CfnClusterSubnetGroup(
      this,
      "SubnetGroupForRedshiftCluster",
      {
        description: "subnet group for redshift cluster",
        subnetIds: props.vpc.publicSubnets.map((subnet) => subnet.subnetId),
      }
    );

    const cluster = new aws_redshift.CfnCluster(this, "RedshiftCluster", {
      clusterType: "multi-node",
      dbName: "demo",
      masterUsername: "demo",
      masterUserPassword: "Agribank#865525",
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
  }
}
