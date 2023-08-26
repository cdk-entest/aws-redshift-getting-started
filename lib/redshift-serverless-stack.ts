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
  sg: aws_ec2.SecurityGroup;
  roles: aws_iam.Role[];
  defaultRole: aws_iam.Role;
}

export class RedshiftServerlessStack extends Stack {
  constructor(scope: Construct, id: string, props: RedshiftServerlessProps) {
    super(scope, id, props);

    const namespace = new aws_redshiftserverless.CfnNamespace(
      this,
      "RedshiftNameSpace",
      {
        namespaceName: "demo",
        adminUsername: "admin",
        adminUserPassword: "Admin2023",
        dbName: "demo",
        defaultIamRoleArn: props.defaultRole.roleArn,
        iamRoles: props.roles.map((role) => role.roleArn),
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
        securityGroupIds: [props.sg.securityGroupId],
      }
    );

    workgroup.addDependency(namespace);
  }
}
