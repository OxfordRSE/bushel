import { App, Aspects, Tags } from "aws-cdk-lib";
import { BushelStack } from "../lib/aws_cdk-stack";
import { loadEnv } from "../lib/loadEnv";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { IConstruct } from "constructs";
import { CfnLogGroup } from "aws-cdk-lib/aws-logs";
import {
  SecretsManagerClient,
  DescribeSecretCommand,
  UpdateSecretCommand,
  CreateSecretCommand,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
loadEnv(process.env.NODE_ENV || "production");
import { AwsCredentialIdentityProvider } from "@aws-sdk/types";

async function resolveEnv() {
  const account = process.env.CDK_DEFAULT_ACCOUNT;
  const region = process.env.CDK_DEFAULT_REGION;

  if (account && region) {
    return { account, region, credentials: fromNodeProviderChain() };
  }

  const client = new STSClient({});
  const identity = await client.send(new GetCallerIdentityCommand({}));
  const resolvedRegion = process.env.AWS_REGION || "us-east-1";

  if (!identity.Account) {
    throw new Error("Could not resolve AWS Account ID.");
  }

  return {
    account: identity.Account,
    region: resolvedRegion,
    credentials: fromNodeProviderChain(),
  };
}

async function prepareSecrets(
  projectName: string,
  secretName: string,
  figshareClientId: string,
  figshareClientSecret: string,
  region: string,
  credentials: AwsCredentialIdentityProvider,
) {
  const client = new SecretsManagerClient({
    region,
    credentials,
  });

  try {
    await client.send(new DescribeSecretCommand({ SecretId: secretName }));

    console.log(
      `[INFO] Secret "${secretName}" already exists. Checking contents...`,
    );

    const secretValue = await client.send(
      new GetSecretValueCommand({ SecretId: secretName }),
    );

    if (secretValue.SecretString) {
      const parsed = JSON.parse(secretValue.SecretString);
      if (
        parsed.client_id === figshareClientId &&
        parsed.client_secret === figshareClientSecret
      ) {
        console.log(
          `[INFO] Secret "${secretName}" is up-to-date. No update needed.`,
        );
        return;
      }
    }

    console.log(`[INFO] Secret "${secretName}" contents differ. Updating...`);
    await client.send(
      new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: JSON.stringify({
          client_id: figshareClientId,
          client_secret: figshareClientSecret,
        }),
      }),
    );
  } catch (err) {
    if (err instanceof Error && err.name === "ResourceNotFoundException") {
      console.log(
        `[INFO] Secret "${secretName}" does not exist. Creating now...`,
      );
      await client.send(
        new CreateSecretCommand({
          Name: secretName,
          SecretString: JSON.stringify({
            client_id: figshareClientId,
            client_secret: figshareClientSecret,
          }),
          Tags: [
            {
              Key: "project-name",
              Value: projectName,
            },
          ],
        }),
      );
      return;
    }
    throw err; // Unexpected errors rethrown
  }
}

async function main() {
  const app = new App();

  const deploymentDomain = app.node.tryGetContext("deploymentDomain");
  const projectName = app.node.tryGetContext("projectName");

  if (!deploymentDomain || !projectName) {
    throw new Error(
      'Both "deploymentDomain" and "projectName" must be provided as context.',
    );
  }

  // REQUIRED: tell CDK what account + region to deploy to
  const env = await resolveEnv();

  console.log("AWS_PROFILE:", process.env.AWS_PROFILE);
  console.log(
    "AWS_ACCESS_KEY_ID[0:3]:",
    process.env.AWS_ACCESS_KEY_ID?.substring(0, 3),
  );

  const figshareClientId =
    app.node.tryGetContext("figshareClientId") ??
    process.env.FIGSHARE_CLIENT_ID ??
    "";
  const figshareClientSecret =
    app.node.tryGetContext("figshareClientSecret") ??
    process.env.FIGSHARE_CLIENT_SECRET ??
    "";

  if (!figshareClientId || !figshareClientSecret) {
    console.error({ figshareClientId, figshareClientSecret });
    throw new Error(
      'Both "figshareClientId" and "figshareClientSecret" must be provided as context or envvars (FIGSHARE_CLIENT_ID, FIGSHARE_CLIENT_SECRET).',
    );
  }

  // Prepare secrets in AWS Secrets Manager
  if (process.env.NODE_ENV !== "test") {
    await prepareSecrets(
      projectName,
      `${projectName}/figshare/oauth`,
      figshareClientId,
      figshareClientSecret,
      env.region,
      env.credentials,
    );
  }

  new BushelStack(app, `${projectName}-Stack`, {
    projectName,
    env,
    deploymentDomain,
    skipDomainLookup:
      app.node.tryGetContext("skipDomainLookup") === "true" ||
      process.env.SKIP_LOOKUPS === "true",
  });

  const isProduction =
    projectName.includes("prod") || projectName.includes("production");
  const retentionInDays = isProduction ? 365 : 7; // 1 year or 1 week

  Aspects.of(app).add({
    visit(node: IConstruct) {
      if (
        node instanceof CfnLogGroup &&
        node.node.tryGetContext("autoLogRetentionApplied") !== true
      ) {
        node.retentionInDays = retentionInDays;
        node.node.setContext("autoLogRetentionApplied", true);
      }
    },
  });

  // Optional but good practice: apply project-wide tag
  Tags.of(app).add("project-name", projectName);
}

main().catch((err) => {
  console.error("CDK App failed to start.");
  console.error(err);
  process.exit(1);
});
