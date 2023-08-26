import {
  Stack,
  StackProps,
  aws_ec2,
  aws_iam,
  aws_sagemaker,
} from "aws-cdk-lib";
import { Construct } from "constructs";

interface SagemakerNotebookProps extends StackProps {
  role: aws_iam.Role;
  sg: aws_ec2.SecurityGroup;
  subnetId: string;
}

export class SagemakerNotebookStack extends Stack {
  constructor(scope: Construct, id: string, props: SagemakerNotebookProps) {
    super(scope, id, props);

    new aws_sagemaker.CfnNotebookInstance(this, "NotebookForRedshift", {
      notebookInstanceName: "NotebookForRedshift",
      instanceType: "ml.t3.large",
      platformIdentifier: "notebook-al2-v2",
      roleArn: props.role.roleArn,
      securityGroupIds: [props.sg.securityGroupId],
      rootAccess: "Enabled",
      subnetId: props.subnetId,
      volumeSizeInGb: 128,
      directInternetAccess: "Enabled",
    });
  }
}
