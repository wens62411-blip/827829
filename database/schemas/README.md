# Database schema contract

`collections.json` is the frozen v1.0.0 document-shape catalog. The explicit
collection list contains 25 names, so all 25 are retained.

This folder defines boundaries only. It does not create a CloudBase environment,
run migrations, or seed business records. Private profiles, verification evidence,
and public card projections are separate collections. `orders` is reserved and the
payment feature default is `DISABLED`.

The frozen city directory stays in the shared geography contract. The `cities`
collection stores only an operational overlay keyed by frozen `CityId`; it cannot
copy or redefine immutable city name, country, region, or timezone fields.
