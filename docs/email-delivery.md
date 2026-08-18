# Email delivery

Pong Ladder sends transactional email through a single Nodemailer transport configured in
`src/lib/email.ts`. In production that transport points at Resend's SMTP relay
(`smtp.resend.com`, user `resend`, password `RESEND_API_KEY`); outside production
`EMAIL_DELIVERY_MODE=console` prints a line instead of sending. Every message — email
verification, password reset, the Google Sign-In notice, and challenge notifications — uses
the same transport and the same `EMAIL_FROM` sender identity.

## Resend free tier

Checked against Resend's official documentation on 2026-08-18. Re-check before relying on
these numbers; Resend changes plan terms without notice.

| Limit | Free plan |
| --- | --- |
| Monthly volume | 3,000 emails (sent and received both count) |
| Daily volume | 100 emails per day |
| API rate limit | 10 requests/second per team, shared across API keys |
| Verified custom domains | 1 |
| Data retention | 30 days |
| Pay-as-you-go overage | Not available on the free plan |

Other findings that matter for this application:

- **Production sending from a custom domain is supported.** The free plan includes one
  verified domain, and a verified domain carries no recipient restrictions.
- **The shared `resend.dev` domain is test-only.** Messages sent from `onboarding@resend.dev`
  can only reach the address that owns the Resend account; anything else returns `403`. A
  verified custom domain is therefore mandatory for real challenge notifications.
- **Exceeding the quota pauses sending, it does not bill.** Overage is only purchasable on
  paid plans, so a free-plan account that runs out simply stops sending until the next billing
  cycle. Resend emails quota warnings at 80% and 100%.
- **Rate limiting surfaces as HTTP 429** with `ratelimit-limit`, `ratelimit-remaining`,
  `ratelimit-reset`, and `retry-after` headers.
- **Reputation thresholds apply to every plan**: sending pauses if the bounce rate exceeds 4%
  or the spam rate exceeds 0.08%.

### Is the free tier enough for challenge notifications?

Yes, for the current scale. Challenge notifications are sent one at a time from a user-initiated
server action, so the 10 requests/second API limit is not reachable — challenge creation is
additionally rate limited to 20 challenges per user per 5 minutes in `createChallenge`.

The binding constraint is volume. Every challenge produces exactly one email, and verification
and password-reset messages share the same quota. The free plan's 100 emails/day and
3,000 emails/month leave comfortable headroom for a ladder of a few dozen active players
creating a handful of challenges each per week.

**Move to the Pro plan (from $20/month for 50,000 emails/month, no daily limit) when either holds:**

- daily challenge and account email volume approaches ~80 messages, which is the point where a
  busy day can trip the 100/day cap; or
- monthly volume approaches ~2,400 messages (80% of the quota), which is where Resend starts
  sending quota warnings.

A second verified sending domain, or retention of delivery logs beyond 30 days for support
purposes, would also force the upgrade.

## Challenge notifications

`notifyChallengedPlayer` in `src/lib/challenge-notifications.ts` runs after `createChallenge`
commits. It reads the challenger, recipient, and organization from the stored challenge, so the
message body and the `View challenge` link always stay inside that challenge's organization.

- The challenger is never emailed; only `challenge.challenged` is.
- A rejected challenge (self-challenge, ladder window, duplicate, unique-index race) never
  reaches the notification step, so no email is sent.
- `Challenge.notifiedAt` is claimed with a conditional `updateMany` before delivery, which keeps
  a retried or concurrent run from sending a second copy of the same notification.
- Delivery failures are caught and logged with the challenge id and the error message only —
  never the recipient address or any credential — and never undo the persisted challenge.

Run `npm run email:preview` to render every transactional template, including this one, to a
temporary directory with placeholder data.
