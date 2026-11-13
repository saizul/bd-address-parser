# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | yes |

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

Report privately through
[GitHub Security Advisories](https://github.com/saizul/bd-address-parser/security/advisories/new). Include the
affected version, a description, steps to reproduce and the impact you expect. You should receive a reply within
7 days. Once a fix is released, the advisory is published with credit to the reporter unless you prefer otherwise.

Do not include real customer addresses or phone numbers in reports; a made-up address that shows the problem is
enough.

## Scope

In scope: input that makes `parseAddress()` throw, hang or use excessive CPU or memory (for example regular
expression backtracking), and anything that could leak data between calls.

Out of scope: wrong parse results (please open a normal issue), and the accuracy of the bundled third-party data.

## Recommendations for users

- Treat the result as a suggestion. Show the parsed district and thana to the customer and let them correct it,
  especially when `confidenceLevel` is `low` or `ambiguities` is not empty.
- `parseAddress()` reads at most `maxLength` characters (default 500). Keep that limit; parse time grows with the
  input length.
- Addresses and phone numbers are personal data; do not log parse results in full in production.
