# Security policy

Eolietech's main promise is that your files never leave your device. If you find a way to break
that promise, or any other security problem, please tell us privately first.

## How to report

- **Email:** info@eolietech.com
- **Or GitHub:** use "Report a vulnerability" on the
  [Security tab](https://github.com/candygoogy/eolietech/security) of this repository. Only the
  maintainer can see these reports.

Please include what you found, the steps to reproduce it, and what an attacker could do with it.
Screenshots, a proof of concept or a HAR file help.

Please don't open a public issue for a vulnerability, and don't test against other people's data.

## What happens next

Eolietech is run by one person, so we can't promise round-the-clock replies, but we aim to:

- confirm we received your report within 7 days;
- tell you whether we can reproduce it and what we plan to do;
- fix serious problems as fast as we can, and tell you when the fix is live.

We're happy to credit you when the fix is published, under your name or handle, unless you'd
rather stay anonymous. There is no paid bug bounty.

## Scope

In scope:

- https://eolietech.com, including the security headers (`public/_headers`) and the tools;
- the Worker API under `/api/` (the Pro waitlist sign-up);
- the code in this repository.

Especially interesting: anything that makes a tool send a file, or data from a file, anywhere;
ways around the Content-Security-Policy; and ways to read or change the waitlist.

Out of scope: denial-of-service and volume attacks, problems in Cloudflare's own infrastructure,
social engineering, findings that need a compromised device or browser, and reports from automated
scanners without a working proof.

Only the live site and the `main` branch are supported. There are no older versions to patch.

A machine-readable version of the contact details is at
https://eolietech.com/.well-known/security.txt
