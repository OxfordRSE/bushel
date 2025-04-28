# Bushel AWS CDK Infrastructure

This directory (`aws_cdk/`) defines the AWS infrastructure needed to deploy the **Bushel** application using AWS CDK.

## Key Concepts

- **Dynamic Naming**: Resources (stacks, secrets, etc.) are named dynamically based on the provided `projectName` context.
    - Example stack name: `bushel-staging-Stack`, `bushel-production-Stack`

- **Required Context Values**:
    - `projectName`: Logical name for this deployment (e.g., `bushel-staging`, `bushel-production`).
    - `deploymentDomain`: The domain name to use for DNS and HTTPS certificates (e.g., `staging.bushel.example.com`).

  These must be passed as context parameters via `-c` or set in your `cdk.json`.

- **Secrets Management**:
    - We **prepare** the required FigShare OAuth secret (`${projectName}/figshare/oauth`) *before* stack creation.
    - If the secret exists, it is **updated only if needed**.
    - If the secret doesn't exist, it is **created automatically**.

- **CDK Wrapper Script**:
    - We provide a `cdk.sh` wrapper script.
    - This ensures that the correct `AWS_PROFILE` is set dynamically when calling `cdk deploy`, `cdk synth`, etc.
    - This avoids credential issues when working with AWS SSO or multiple profiles.

## Usage

### Deploy a Stack

```bash
./cdk.sh deploy --profile matt-sso -c projectName=bushel-staging -c deploymentDomain=staging.bushel.example.com
```

_Note_: This command can take quite a long time. If it takes more than 30 minutes, something might be wrong.

### Destroy a Stack

Make sure you use the full dynamic stack name derived from `projectName`:

```bash
./cdk.sh destroy bushel-staging-Stack --profile matt-sso
```

_Note_: This command can take quite a long time. If it takes more than 30 minutes, something might be wrong.

### Other Commands

```bash
./cdk.sh synth --profile matt-sso -c projectName=bushel-staging -c deploymentDomain=staging.bushel.example.com
```


## Notes

- Secrets are managed automatically but require valid `FIGSHARE_CLIENT_ID` and `FIGSHARE_CLIENT_SECRET` values, either from context or environment variables.
- Stack outputs will include important values like the deployed App URL.
- Log groups are automatically assigned a retention policy (7 days for dev/staging, 365 days for production).
- VPCs are configured without NAT gateways for cost efficiency.
- Fargate tasks are set up with access to SecretsManager using a private VPC endpoint.

## Prerequisites

- Run `aws sso login --profile your-profile` if using SSO.
- Export your AWS_PROFILE if you are not using the `cdk.sh` wrapper.
- Ensure you have valid AWS credentials locally.


---

**This setup is designed to be safe, minimal, and production-grade.**

For questions or troubleshooting, check the comments inside `bin/aws_cdk.ts` or the CDK documentation.
