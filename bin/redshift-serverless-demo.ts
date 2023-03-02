#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/network-stack";
import { RedshiftCluster } from "../lib/redshift-cluster-stack";
import { RedshiftServerlessStack } from "../lib/redshift-serverless-stack";

const app = new cdk.App();

const network = new NetworkStack(app, "NetworkStack", {
  env: {
    region: "us-east-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

new RedshiftServerlessStack(app, "RedshiftServerlessStack", {
  vpc: network.vpc,
  env: {
    region: "us-east-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

const cluster = new RedshiftCluster(app, "RedshiftCluster", {
  vpc: network.vpc,
  sg: network.sg, 
  env: {
    region: "us-east-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

cluster.addDependency(network)
