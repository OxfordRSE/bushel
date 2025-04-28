// aws_cdk.stack.ts
import {
  Stack,
  StackProps,
  CfnOutput,
  RemovalPolicy, SecretValue,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  aws_ecs as ecs,
  aws_ecs_patterns as ecsPatterns,
  aws_ec2 as ec2,
  aws_route53 as route53,
  aws_certificatemanager as acm,
  aws_logs as logs,
} from 'aws-cdk-lib';
import { HostedZone } from 'aws-cdk-lib/aws-route53';

import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import {getDomain} from "tldts";

interface BushelStackProps extends StackProps {
  deploymentDomain: string;
  figshareClientId: string;
  figshareClientSecret: string;
  skipDomainLookup?: boolean;
}

export class BushelStack extends Stack {
  albApp: ecsPatterns.ApplicationLoadBalancedFargateService;
  vpc: ec2.Vpc;
  cluster: ecs.Cluster;
  zone: route53.IHostedZone;
  cert: acm.ICertificate;
  figshareSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: BushelStackProps) {
    super(scope, id, props);

    const { deploymentDomain, figshareClientId, figshareClientSecret } = props;
    const zoneDomain = getDomain(deploymentDomain);

    if (!zoneDomain) {
      throw new Error(`Invalid deployment domain ${deploymentDomain}`);
    }

    // --- VPC ---
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
    });

    // --- Route53 ---
    this.zone = skipDomainLookup
        ? HostedZone.fromHostedZoneAttributes(this, 'Zone', {
          hostedZoneId: 'DUMMY',
          zoneName: zoneDomain,
        })
        : route53.HostedZone.fromLookup(this, 'Zone', {
          domainName: zoneDomain,
        });

    // --- ACM Certificate ---
    this.cert = new acm.Certificate(this, 'Certificate', {
      domainName: deploymentDomain,
      validation: acm.CertificateValidation.fromDns(this.zone),
    });


    // --- ECS Cluster ---
    this.cluster = new ecs.Cluster(this, 'Cluster', { vpc: this.vpc });

    this.figshareSecret = new secretsmanager.Secret(this, 'FigshareOAuthSecret', {
      secretName: 'figshare/oauth',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          client_id: SecretValue.unsafePlainText(figshareClientId),
          client_secret: SecretValue.unsafePlainText(figshareClientSecret),
        }),
        generateStringKey: 'placeholder',
      },
      removalPolicy: RemovalPolicy.RETAIN, // change to DESTROY if desired
    });


    // --- Fargate App + ALB ---
    this.albApp = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'App', {
      cluster: this.cluster,
      desiredCount: 1,
      cpu: 512,
      memoryLimitMiB: 1024,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('..'),
        containerPort: 3000,
        enableLogging: true,
        logDriver: ecs.LogDriver.awsLogs({
          streamPrefix: 'bushel',
          logRetention: logs.RetentionDays.ONE_WEEK,
        }),
        secrets: {
          FIGSHARE_CLIENT_ID: ecs.Secret.fromSecretsManager(this.figshareSecret, 'client_id'),
          FIGSHARE_CLIENT_SECRET: ecs.Secret.fromSecretsManager(this.figshareSecret, 'client_secret'),
        },
      },
      domainName: deploymentDomain,
      domainZone: this.zone,
      certificate: this.cert,
      redirectHTTP: true,
    });

    this.albApp.service.autoScaleTaskCount({ maxCapacity: 4 }).scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 60,
    });


    // --- Outputs ---
    new CfnOutput(this, 'AppURL', {
      value: `https://${deploymentDomain}`,
    });
  }
}
