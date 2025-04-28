import { App, Tags } from 'aws-cdk-lib';
import { BushelStack } from '../lib/aws_cdk-stack';
import {Tags} from "aws-cdk-lib";

const app = new App();

const deploymentDomain = app.node.tryGetContext('deploymentDomain');
const projectName = app.node.tryGetContext('projectName');

if (!deploymentDomain || !projectName) {
    throw new Error('Both "deploymentDomain" and "projectName" must be provided as context.');
}

// REQUIRED: tell CDK what account + region to deploy to
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
    figshareClientId: process.env.FIGSHARE_CLIENT_ID,
    figshareClientSecret: process.env.FIGSHARE_CLIENT_SECRET,
};

const figshareClientId = app.node.tryGetContext('figshareClientId') ?? process.env.FIGSHARE_CLIENT_ID ?? '';
const figshareClientSecret = app.node.tryGetContext('figshareClientSecret') ?? process.env.FIGSHARE_CLIENT_SECRET ?? '';

if (!figshareClientId || !figshareClientSecret) {
    throw new Error('Both "figshareClientId" and "figshareClientSecret" must be provided as context or envvars.');
}

new BushelStack(app, 'BushelStack', {
    env,
    deploymentDomain,
    figshareClientId,
    figshareClientSecret,
    skipDomainLookup: app.node.tryGetContext('skipDomainLookup') === 'true' || process.env.SKIP_LOOKUPS === 'true',
});

// Optional but good practice: apply project-wide tag
Tags.of(app).add('project-name', projectName);
