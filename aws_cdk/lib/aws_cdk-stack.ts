import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export class BushelStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });

    const cluster = new ecs.Cluster(this, 'BushelCluster', {
      vpc,
    });

    const repository = new ecr.Repository(this, 'BushelRepository', {
      repositoryName: 'bushel-staging',
      removalPolicy: RemovalPolicy.DESTROY, // fine for staging
      emptyOnDelete: true,
    });

    const certificateArn = 'arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; // Replace this
    const certificate = certificatemanager.Certificate.fromCertificateArn(
      this,
      'BushelStagingCert',
      certificateArn
    );

    new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'BushelService', {
      cluster,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 1,
      listenerPort: 443,
      domainName: undefined, // not using custom domain
      domainZone: undefined,
      certificate,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
        containerPort: 3000,
        enableLogging: true,
        environment: {
          NODE_ENV: 'production'
        },
        containerName: 'bushel-app'
      },
      publicLoadBalancer: true,
      assignPublicIp: true,
      healthCheckGracePeriod: Duration.seconds(60),
    });
  }
}
