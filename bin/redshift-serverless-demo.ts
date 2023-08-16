#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/network-stack";
import { RedshiftCluster } from "../lib/redshift-cluster-stack";
import { RedshiftServerlessStack } from "../lib/redshift-serverless-stack";

const REGION = "ap-southeast-1";

const app = new cdk.App();

const network = new NetworkStack(app, "RedshiftNetworkStack", {
  env: {
    region: REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

new RedshiftServerlessStack(app, "RedshiftServerlessStack", {
  vpc: network.vpc,
  sg: network.serverlessSG,
  env: {
    region: REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

const cluster = new RedshiftCluster(app, "RedshiftCluster", {
  vpc: network.vpc,
  sg: network.clusterSG,
  version: "redshift-1.0",
  roles: network.roles,
  env: {
    region: REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

cluster.addDependency(network);
