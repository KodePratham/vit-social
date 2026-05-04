# Security policy

Thanks for helping keep vitsocial.xyz and its users safe. This document
describes how to responsibly report a security issue.

## Supported versions

vitsocial.xyz is a live web application rather than a versioned library. We
support the **`main` branch** and the currently-deployed production site
(<https://vitsocial.xyz>). There is no long-term support (LTS) track for
older commits.

## What counts as a security issue

Typical examples we care about:

- Authentication or session-handling bugs (bypassing the `@vit.edu` check,
  session fixation, CSRF, leaked cookies …).
- Authorisation bugs — e.g. reading posts, profiles or friend data you
  shouldn't see. This includes bypassing Supabase Row Level Security or the
  server-side friend filter in `/api/posts`.
- Leaks of secrets or personally identifying information.
- Server-side request forgery, remote code execution, SQL injection, and
  similar classic web vulnerabilities.
- Any chain of small issues that leads to account takeover.

Issues that are usually **out of scope** (please still tell us, just not
through the private channel):

- Missing best-practice HTTP headers on third-party static assets.
- Self-inflicted XSS that requires pasting code into DevTools.
- Rate-limits, denial-of-service, or spammy content issues.
- Social-engineering of maintainers or contributors.

## How to report

**Please do not open a public GitHub issue for security problems.**

Use one of the private channels below:

1. **GitHub private advisory** — open a
   ["Report a vulnerability"](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
   entry on this repository. This is the preferred route.
2. **Email** — `security@vitsocial.xyz` (if that address is configured for
   the project). Include `SECURITY` in the subject line.

When reporting, please include:

- A clear description of the issue and the impact.
- Reproduction steps (or proof-of-concept code) — the more minimal, the
  better.
- Any relevant logs, URLs, HTTP requests, or screenshots — please redact
  other users' personal data.
- Your name / handle and how you'd like to be credited (or "anonymous").

## What to expect from us

- **Acknowledgement:** within **3 business days** of your report.
- **Triage & status update:** within **7 business days** we'll confirm whether
  we believe the report is valid, its severity, and an initial plan.
- **Fix & disclosure:** once a fix is merged and deployed, we'll credit the
  reporter (unless you prefer to stay anonymous) and may publish a short
  write-up in the release notes or a GitHub advisory.

We'll keep you in the loop while we investigate. If we disagree about
severity or scope we'll explain why; you can always re-raise via one of the
channels above.

## Safe-harbour

We consider good-faith security research conducted under this policy to be
authorised and we will not pursue legal action for reports that:

- Do not access data that isn't your own beyond what's necessary to
  demonstrate the issue.
- Do not degrade service for other users (no destructive testing, no
  credential stuffing).
- Give us a reasonable chance to fix the issue before publishing details.

Thanks for making the campus safer!
