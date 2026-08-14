# Pong Ladder

[![CI](https://github.com/victorpero/pong-ladder/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/victorpero/pong-ladder/actions/workflows/ci.yml)

Pong Ladder helps workplaces and table-tennis clubs run an ongoing, competitive ladder without managing challenges, results, and rankings by hand.

**[Open the hosted application](https://pongladder.com)**

Pong Ladder is the hosted service. This repository contains its open-source application code.

## What Pong Ladder does

- Gives each workplace or club its own organization workspace and membership controls.
- Organizes competition into fixed seasons with individual and team ladders.
- Lets players challenge nearby opponents and record best-of-five results.
- Updates rankings from completed matches and preserves challenge history.
- Supports invitations, access codes, approval flows, and organization administration.

## Who it is for

Pong Ladder is designed for groups that play regularly and want a clear, lightweight competitive structure: office leagues, sports clubs, community spaces, and similar organizations.

## Project status

The hosted application is live and the project is under active development. Follow the [issue tracker](https://github.com/victorpero/pong-ladder/issues) for planned work, known problems, and feature discussions.

## Technology

The application uses Next.js and TypeScript, PostgreSQL with Prisma, Tailwind CSS, and Vitest. Authentication, organization access, rankings, and match workflows are enforced server-side.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for prerequisites, local setup, tests, pull-request expectations, and the `dev` to `main` delivery flow.

For a bug report or feature proposal, [open a GitHub issue](https://github.com/victorpero/pong-ladder/issues/new).

## License

Pong Ladder is available under the [MIT License](LICENSE).
