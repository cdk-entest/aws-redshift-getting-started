#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/network-stack";
import { RedshiftCluster } from "../lib/redshift-cluster-stack";
import { RedshiftServerlessStack } from "../lib/redshift-serverless-stack";
import { SagemakerNotebookStack } from "../lib/saegmaker-notebook-stack";
import { AuroraDbStack } from "../lib/aurora-stack";

const app = new cdk.App();

const network = new NetworkStack(app, "RedshiftNetworkStack", {
  cidr: "10.0.0.0/16",
  name: "RedshiftVpc",
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

const serverless = new RedshiftServerlessStack(app, "RedshiftServerlessStack", {
  vpc: network.vpc,
  sg: network.serverlessSG,
  roles: network.roles,
  defaultRole: network.roles[0],
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

const cluster = new RedshiftCluster(app, "RedshiftCluster", {
  vpc: network.vpc,
  sg: network.clusterSG,
  version: "redshift-1.0",
  roles: network.roles,
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

const notebook = new SagemakerNotebookStack(app, "SagemakerNotebookStack", {
  sg: network.notebookSG,
  role: network.notebookRole,
  subnetId: network.vpc.publicSubnets[0].subnetId,
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

const aurora = new AuroraDbStack(app, "AuroraStack", {
  vpc: network.vpc,
  dbName: "demo",
  dbSG: network.auroraSG,
  role: network.auroraRole,
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});
