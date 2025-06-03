// aws_cdk.stack.ts
import {
  aws_secretsmanager as secretsmanager,
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps, Tags,
} from "aws-cdk-lib";
import { Construct } from "constructs";

import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import * as logs from "aws-cdk-lib/aws-logs";
import * as targets from "aws-cdk-lib/aws-route53-targets";

import { parse } from "tldts";

interface BushelStackProps extends StackProps {
  projectName: string;
  deploymentDomain: string;
  skipDomainLookup?: boolean;
}

export class BushelStack extends Stack {
  production: boolean;
  figshareSecret: secretsmanager.ISecret;
  vpc: ec2.Vpc;
  zone: route53.IHostedZone;
  cert: acm.ICertificate;
  sgs: { alb: ec2.SecurityGroup; ecs: ec2.SecurityGroup };
  cluster: ecs.Cluster;
  taskDefinition: ecs.FargateTaskDefinition;
  fargateService: ecs.FargateService;
  loadBalancer: elbv2.ApplicationLoadBalancer;
  listener: elbv2.ApplicationListener;

  constructor(scope: Construct, id: string, props: BushelStackProps) {
    super(scope, id, props);
    this.production = process.env.NODE_ENV === "production";

    const { projectName, deploymentDomain, skipDomainLookup } = props;
    const { domain: zoneDomain, subdomain } = parse(deploymentDomain);

    if (!zoneDomain) {
      throw new Error(`Invalid deployment domain ${deploymentDomain}`);
    }
    if (!subdomain) {
      throw new Error(
        `Deployment domain must have a subdomain ${deploymentDomain}`,
      );
    }

    this.figshareSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      `${projectName}-FigshareOAuthSecret`,
      `${projectName}/figshare/oauth`,
    );

    // --- VPC ---
    this.vpc = new ec2.Vpc(this, `${projectName}-VPC`, {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });
    Tags.of(this.vpc).add("project-name", projectName);

    // --- Route53 ---
    this.zone = skipDomainLookup
      ? HostedZone.fromHostedZoneAttributes(this, `${projectName}-Zone`, {
          hostedZoneId: "DUMMY",
          zoneName: zoneDomain,
        })
      : route53.HostedZone.fromLookup(this, `${projectName}-Zone`, {
          domainName: zoneDomain,
        });

    // --- ACM Certificate ---
    this.cert = new acm.Certificate(this, `${projectName}-Certificate`, {
      domainName: deploymentDomain,
      validation: acm.CertificateValidation.fromDns(this.zone),
    });
    Tags.of(this.cert).add("project-name", projectName);

    this.sgs = {
      alb: new ec2.SecurityGroup(this, `${projectName}-ALB-SG`, {
        vpc: this.vpc,
        description: "Allow HTTP/HTTPS from anywhere",
        allowAllOutbound: true,
      }),
      ecs: new ec2.SecurityGroup(this, `${projectName}-ECS-SG`, {
        vpc: this.vpc,
        description: "Allow ALB to communicate with ECS service",
        allowAllOutbound: true,
      }),
    };
    // ALB SG allows internet traffic
    this.sgs.alb.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    this.sgs.alb.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(80));
    this.sgs.alb.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));
    this.sgs.alb.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(443));
    // ECS SG only allows ALB SG
    this.sgs.ecs.addIngressRule(
      this.sgs.alb,
      ec2.Port.tcp(3000),
      "Ingress from ALB",
    );

    this.cluster = new ecs.Cluster(this, `${projectName}-Cluster`, {
      vpc: this.vpc,
    });
    Tags.of(this.cluster).add("project-name", projectName);

    this.taskDefinition = new ecs.FargateTaskDefinition(
      this,
      `${projectName}-TaskDefinition`,
      {
        cpu: 512,
        memoryLimitMiB: 1024,
      },
    );
    this.taskDefinition.addContainer(`${projectName}-Container`, {
      image: ecs.ContainerImage.fromAsset(".."),
      portMappings: [{ containerPort: 3000 }],
      secrets: {
        FIGSHARE_CLIENT_ID: ecs.Secret.fromSecretsManager(
          this.figshareSecret,
          "client_id",
        ),
        FIGSHARE_CLIENT_SECRET: ecs.Secret.fromSecretsManager(
          this.figshareSecret,
          "client_secret",
        ),
      },
      logging: ecs.LogDriver.awsLogs({
        logGroup: new logs.LogGroup(this, `${projectName}-LogGroup`, {
          logGroupName: `/${projectName}/ecs`,
          retention: this.production
            ? logs.RetentionDays.ONE_YEAR
            : logs.RetentionDays.ONE_WEEK,
          removalPolicy: this.production
            ? RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE
            : RemovalPolicy.DESTROY,
        }),
        streamPrefix: `ecs`,
      }),
    });

    this.fargateService = new ecs.FargateService(
      this,
      `${projectName}-Service`,
      {
        cluster: this.cluster,
        taskDefinition: this.taskDefinition,
        assignPublicIp: true,
        securityGroups: [this.sgs.ecs],
        vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        desiredCount: 1,
        maxHealthyPercent: 200,
        minHealthyPercent: 50,
        enableECSManagedTags: true,
        enableExecuteCommand: !this.production,
        circuitBreaker: {
          rollback: true,
          enable: true,
        },
      },
    );

    this.loadBalancer = new elbv2.ApplicationLoadBalancer(
      this,
      `${projectName}-ALB`,
      {
        vpc: this.vpc,
        internetFacing: true,
        securityGroup: this.sgs.alb,
        vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      },
    );

    // HTTPS listener - forwards to ECS
    this.listener = this.loadBalancer.addListener(
      `${projectName}-HTTPSListener`,
      {
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        certificates: [this.cert],
        open: true,
      },
    );

    this.listener.addTargets(`${projectName}-HTTPSTarget`, {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.fargateService],
      healthCheck: {
        path: "/",
        interval: Duration.seconds(30),
      },
    });

    // HTTP listener - redirects to HTTPS
    this.loadBalancer.addListener(`${projectName}-HTTPListener`, {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: "HTTPS",
        port: "443",
        permanent: true,
      }),
    });

    new route53.ARecord(this, `${projectName}-Alias-A`, {
      zone: this.zone,
      recordName: subdomain,
      target: route53.RecordTarget.fromAlias(
        new targets.LoadBalancerTarget(this.loadBalancer),
      ),
    });

    new route53.AaaaRecord(this, `${projectName}-Alias-AAAA`, {
      zone: this.zone,
      recordName: subdomain,
      target: route53.RecordTarget.fromAlias(
        new targets.LoadBalancerTarget(this.loadBalancer),
      ),
    });

    // --- Outputs ---
    new CfnOutput(this, `${projectName}-AppURL`, {
      value: `https://${deploymentDomain}`,
    });

    new CfnOutput(this, `${projectName}-ALB-DNS`, {
      value: this.loadBalancer.loadBalancerDnsName,
    });
  }
}
