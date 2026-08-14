# Deployment configuration

This directory contains environment-specific configuration for a maintainer-operated Pong Ladder deployment. It is retained temporarily because the active deployment does not yet have a verified replacement.

These files are not a supported self-hosting guide or a reusable Kubernetes example. Their resource names, ingress and certificate integrations, storage assumptions, secret references, and database topology belong to a particular environment and should not be copied as defaults.

The long-term decision is to move this configuration to the maintainers' infrastructure source of truth, verify the replacement, and then remove this directory. See [the deployment ownership decision](../../docs/readme-strategy.md#deployment-ownership) for the rationale and safety constraints.
