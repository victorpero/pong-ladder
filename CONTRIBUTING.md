# Contributing

Use `dev` as the integration branch and keep `main` production-ready.

1. Create a feature branch from `dev`.
2. Implement and test the change locally.
3. Open a pull request into `dev` and wait for all required checks to pass.
4. Verify the integrated change on `dev`.
5. Open a pull request from `dev` into `main`.
6. Merge only after all required checks pass. Do not push directly to `main`.

The `main` branch publishes the production image to GHCR. Flux then updates the
Talos deployment to the published image digest.

## GitHub branch settings

Configure these rules in GitHub when your plan supports branch protection:

- **main:** require a pull request, require the `Quality checks` status check,
  and block force pushes and deletion.
- **dev:** require the `Quality checks` status check for pull requests, and
  block force pushes and deletion.

Do not require branches to be up to date on `main`. Promoting `dev` to `main`
leaves a merge commit that only `main` carries, so the requirement blocks the
next promotion until `main` is merged back into `dev`. Because `main` only ever
receives merges from `dev`, and `dev` runs the same checks against the same
tree, the requirement costs a synchronisation pull request per release without
adding cover. Squash and rebase promotions have the same problem: both put
commits on `main` that `dev` does not contain.
