# Security policy

## Supported releases

The latest commit on `main` is the only maintained public branch. This repository is currently a demonstration release and must not be used to process real orders or payment data.

## Reporting a vulnerability

Please do not open a public issue containing credentials, personal information, payment data, or exploit details. Contact the repository maintainers privately through GitHub's security reporting feature when enabled, or use a private channel associated with the repository owner. Include the affected commit, concise reproduction steps, impact, and any safe mitigation. Do not include real customer data.

If private reporting is not enabled, ask the maintainer to provide a secure channel without posting sensitive details publicly.

## Secret exposure

If a token, password, cookie, private key, or database export is exposed, revoke or rotate it at its issuer immediately. Rewriting a commit does not revoke a secret or erase copies already fetched by others.

## Scope

Reports may cover authentication, authorization, session handling, API validation, data exposure, cryptographic storage, deployment configuration, and dependency vulnerabilities. The presence of payment or supplier code does not mean those integrations are enabled in this demo.
