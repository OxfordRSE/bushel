import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { BushelStack } from "../lib/aws_cdk-stack";

// Helper to create a minimal valid stack for testing
function createTestStack() {
  const app = new cdk.App();

  const stack = new BushelStack(app, "BushelStackTest", {
    projectName: "bushel-test",
    env: { account: "111111111111", region: "eu-west-2" },
    deploymentDomain: "staging.bushel.example.com",
  });

  return Template.fromStack(stack);
}

test("Just create a stack", () => {
  createTestStack();
});

describe("BushelStack", () => {
  let template: Template;

  beforeAll(() => {
    template = createTestStack();
  });

  test("creates an Application Load Balancer in public subnets", () => {
    template.hasResourceProperties(
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
      {
        Scheme: "internet-facing",
        Type: "application",
      },
    );
  });

  test("ALB security group allows HTTP and HTTPS from 0.0.0.0/0 and ::/0", () => {
    template.hasResourceProperties(
      "AWS::EC2::SecurityGroup",
      Match.objectLike({
        SecurityGroupIngress: Match.arrayWith([
          Match.objectLike({
            CidrIp: "0.0.0.0/0",
            FromPort: 80,
            ToPort: 80,
            IpProtocol: "tcp",
          }),
          Match.objectLike({
            CidrIp: "0.0.0.0/0",
            FromPort: 443,
            ToPort: 443,
            IpProtocol: "tcp",
          }),
        ]),
      }),
    );

    template.hasResourceProperties(
      "AWS::EC2::SecurityGroup",
      Match.objectLike({
        SecurityGroupIngress: Match.arrayWith([
          Match.objectLike({
            CidrIpv6: "::/0",
            FromPort: 80,
            ToPort: 80,
            IpProtocol: "tcp",
          }),
          Match.objectLike({
            CidrIpv6: "::/0",
            FromPort: 443,
            ToPort: 443,
            IpProtocol: "tcp",
          }),
        ]),
      }),
    );
  });

  test("ECS SG only allows ALB SG on port 3000", () => {
    template.hasResourceProperties(
      "AWS::EC2::SecurityGroupIngress",
      Match.objectLike({
        IpProtocol: "tcp",
        FromPort: 3000,
        ToPort: 3000,
        GroupId: {
          "Fn::GetAtt": Match.arrayWith([
            Match.stringLikeRegexp(".*ECSSG.*"),
            "GroupId",
          ]),
        },
        SourceSecurityGroupId: {
          "Fn::GetAtt": Match.arrayWith([
            Match.stringLikeRegexp(".*ALBSG.*"),
            "GroupId",
          ]),
        },
      }),
    );
  });

  test("Fargate service is created with expected networking config", () => {
    template.hasResourceProperties(
      "AWS::ECS::Service",
      Match.objectLike({
        LaunchType: "FARGATE",
        NetworkConfiguration: {
          AwsvpcConfiguration: Match.objectLike({
            AssignPublicIp: "ENABLED",
            Subnets: Match.anyValue(),
            SecurityGroups: Match.anyValue(),
          }),
        },
      }),
    );
  });

  test("creates a listener and target group for the ALB", () => {
    template.resourceCountIs("AWS::ElasticLoadBalancingV2::Listener", 2);
    template.resourceCountIs("AWS::ElasticLoadBalancingV2::TargetGroup", 1);
  });
});
