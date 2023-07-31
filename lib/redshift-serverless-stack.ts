import {
  aws_ec2,
  aws_iam,
  aws_redshiftserverless,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";

interface RedshiftServerlessProps extends StackProps {
  vpc: aws_ec2.Vpc;
}

export class RedshiftServerlessStack extends Stack {
  constructor(scope: Construct, id: string, props: RedshiftServerlessProps) {
    super(scope, id, props);

    const role = new aws_iam.Role(this, "IamRoleForRedshift", {
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

    role.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess")
    );

    const sg = new aws_ec2.SecurityGroup(
      this,
      "SecurityGroupForRedshiftServerless",
      {
        securityGroupName: "SecurityGroupForRedshiftServerless",
        vpc: props.vpc,
      }
    );

    // security block this
    // sg.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(5439));

    const namespace = new aws_redshiftserverless.CfnNamespace(
      this,
      "RedshiftNameSpace",
      {
        namespaceName: "demo",
        adminUsername: "admin",
        adminUserPassword: "Admin2023",
        dbName: "demo",
        defaultIamRoleArn: role.roleArn,
        iamRoles: [role.roleArn],
        logExports: ["userlog", "connectionlog", "useractivitylog"],
      }
    );

    const workgroup = new aws_redshiftserverless.CfnWorkgroup(
      this,
      "RedshiftWorkGroup",
      {
        workgroupName: "demo",
        baseCapacity: 32,
        namespaceName: "demo",
        subnetIds: props.vpc.publicSubnets.map((subnet) => subnet.subnetId),
        publiclyAccessible: false,
        securityGroupIds: [sg.securityGroupId],
      }
    );

    workgroup.addDependency(namespace);
  }
}
