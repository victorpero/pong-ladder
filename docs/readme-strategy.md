# README content strategy

This note records the research and content decisions behind the product-first Pong Ladder README introduced for PL-24.

## Research sample

The review used GitHub's README and licensing guidance plus a representative set of established open-source web applications:

- [GitHub: About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) describes the README as a visitor's usual entry point and recommends covering what the project does, why it is useful, how to begin, and where to get help.
- [Formbricks](https://github.com/formbricks/formbricks) leads with a product position, hosted-service call to action, capabilities, and links to focused contribution, security, and license documents.
- [Plausible Analytics](https://github.com/plausible/analytics) explains the product and intended value before technology, contribution, roadmap, and licensing details.
- [Outline](https://github.com/outline/outline) explicitly distinguishes its hosted application from the source repository and sends operational detail to separate documentation.
- [Immich](https://github.com/immich-app/immich) keeps prominent product, documentation, demo, feature, and contribution links close to the top rather than embedding every operational procedure.

The goal is not to reproduce any one README. The recurring convention is to help a new visitor understand the product and choose a next action before presenting repository internals.

## Recommended structure

The Pong Ladder README should stay concise and use this order:

1. Product name, meaningful status badge, one-sentence value proposition, and hosted-service link.
2. A clear distinction between the hosted service and its source repository.
3. Core capabilities and intended audiences.
4. Honest project status with a link to issues for roadmap and support.
5. A short technology overview for technical evaluators.
6. Links to contribution guidance and the license.

Development setup, test commands, environment variables, branch policy, deployment runbooks, and database details belong in focused contributor or operational documentation.

## Content decisions

### Hosted application

`https://pongladder.com` is the canonical call to action. It was verified to load the Pong Ladder authentication screen over HTTPS. The copy does not imply that the repository itself is the hosted service.

### Screenshots

No screenshot is included yet. The only durable unauthenticated view is the login screen, which does not demonstrate the ladder experience. A screenshot should be added later only when the project has a representative, maintained product capture that contains no personal or production data.

### Badges

The README includes the `dev` CI badge because it communicates the health of the integration branch and links directly to its workflow. A decorative technology badge set was rejected. GitHub detects and surfaces the root license, so a separate third-party license badge would add another external dependency without improving discoverability.

### Status and roadmap

The README describes the hosted application as live and the project as under active development, then links to GitHub issues. It makes no unsupported stability, scale, uptime, or adoption claims.

### Support and community files

GitHub issues remain the support and feature-request path. Issue templates and a separate support guide are deferred until recurring issue patterns justify their maintenance cost.

A security policy is warranted for a hosted application, but it must provide a real private reporting channel. Private vulnerability reporting is not currently enabled and no public security contact has been designated, so PL-24 does not add a misleading `SECURITY.md`. Sensitive reports must not be directed to public issues; the policy should be added when a private channel is configured.

A code of conduct is also deferred until the maintainer selects an enforcement contact and commits to its response process. Adding boilerplate without that operating commitment would not create a trustworthy community standard.

### License

The project is explicitly intended to be open source, and a root MIT license is added. MIT is OSI-approved, widely understood, and consistent with permitting use, modification, and distribution without introducing an unsupported contributor-license or commercial licensing program.

## Deployment ownership

The Kubernetes manifests are environment-specific operational configuration: they encode particular namespaces, ingress and certificate integrations, storage, image publishing, database topology, and hostnames. They are not generalized or documented as a supported self-hosting interface, so they do not belong in the application repository long term.

The selected direction is to move the production configuration to the maintainers' dedicated infrastructure source of truth and remove `deploy/kubernetes` from this repository after the replacement has reconciled successfully. A generic deployment example should be added here only if self-hosting becomes a supported product goal with a documented compatibility contract.

The current manifests remain temporarily because no verified replacement exists. Removing or restructuring an active production path before its replacement is confirmed would create an avoidable availability and recovery risk. Until migration is complete:

- the root README does not advertise the manifests as product or self-hosting documentation;
- contributor guidance identifies them as maintainer-operated configuration;
- `deploy/kubernetes/README.md` records their temporary ownership status; and
- environment-specific runbooks and infrastructure identifiers are excluded from public-facing documentation.
