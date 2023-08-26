import { Stack, StackProps, aws_ec2, aws_iam, aws_rds } from "aws-cdk-lib";
import { Construct } from "constructs";

interface AuroraDbStackProps extends StackProps {
  vpc: aws_ec2.Vpc;
  dbName: string;
  dbSG: aws_ec2.SecurityGroup;
  role: aws_iam.Role;
}

export class AuroraDbStack extends Stack {
  constructor(scope: Construct, id: string, props: AuroraDbStackProps) {
    super(scope, id, props);

    const vpc: aws_ec2.Vpc = props.vpc;

    const clusterPG = new aws_rds.CfnDBClusterParameterGroup(
      this,
      "ParameterGroupAuroraEtlZero",
      {
        description: "parameter group for aurora zero-etl",
        family: "aurora-mysql8.0",
        dbClusterParameterGroupName: "ParameterGroupAuroraEtlZero",
        parameters: {
          binlog_backup: 0,
          binlog_replication_globaldb: 0,
          binlog_format: "ROW",
          aurora_enhanced_binlog: 1,
          binlog_row_metadata: "FULL",
          binlog_row_image: "FULL",
        },
      }
    );

    const dbPG = new aws_rds.CfnDBParameterGroup(
      this,
      "ParameterGroupAuroraDBInstance",
      {
        description: "parameter group for aurora db instance",
        dbParameterGroupName: "ParameterGroupAuroraDBInstance",
        family: "aurora-mysql8.0",
        parameters: {},
      }
    );

    const subnetGroup = new aws_rds.CfnDBSubnetGroup(
      this,
      "SubnetGroupAuroraEtlZero",
      {
        dbSubnetGroupDescription: "subnet group for aurora etl zero",
        dbSubnetGroupName: "SubnetGroupAuroraEtlZero",
        subnetIds: vpc.publicSubnets.map((subnet) => subnet.subnetId),
      }
    );

    const cluster = new aws_rds.CfnDBCluster(this, "AuroraEtlZero", {
      dbClusterIdentifier: "AuroraEtlZero",
      dbClusterParameterGroupName: clusterPG.dbClusterParameterGroupName,
      dbSubnetGroupName: subnetGroup.dbSubnetGroupName,
      deletionProtection: false,
      autoMinorVersionUpgrade: false,
      // availabilityZones: [],
      // backupRetentionPeriod: 1,
      // dbClusterInstanceClass: "db.r6g.2xlarge",
      databaseName: "demo",
      engine: "aurora-mysql",
      engineVersion: "8.0.mysql_aurora.3.03.1",
      engineMode: "provisioned",
      vpcSecurityGroupIds: [props.dbSG.securityGroupId],
      // publiclyAccessible: false,
      masterUsername: "admin",
      masterUserPassword: "Admin2023",
      // performanceInsightsEnabled: false,
      enableCloudwatchLogsExports: [],
      enableIamDatabaseAuthentication: false,
      associatedRoles: [
        {
          roleArn: props.role.roleArn,
        },
      ],
    });

    const db1 = new aws_rds.CfnDBInstance(this, "FirstDbInstance", {
      // sourceDbClusterIdentifier: cluster.ref,
      dbClusterIdentifier: cluster.ref,
      dbInstanceIdentifier: "FirstDbInstance",
      dbInstanceClass: "db.r6g.2xlarge",
      engine: "aurora-mysql",
      // engineVersion: "8.0.mysql_aurora.3.03.1",
      // dbParameterGroupName: dbPG.dbParameterGroupName,
      enablePerformanceInsights: false,
    });

    cluster.addDependency(clusterPG);
    cluster.addDependency(subnetGroup);
  }
}
