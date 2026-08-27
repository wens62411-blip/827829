# Empty seed policy

There are intentionally no business seed records. In particular, this repository
contains no synthetic `APPROVED`, `HUMAN_REVIEWED`, `PUBLISHED`, `LIVE`, paid order,
upload, device, deployment, or release evidence.

The payment flag's schema default is `DISABLED` in
`database/schemas/defaults.json`. Creating a real feature-flag document is an
environment bootstrap action outside this LOCAL_ONLY foundation task.
