# Migration Matrix — v0.9.0

## `.phonodoc`

| Input | v0.9 reader | Save result | Important behavior |
|---|---|---|---|
| 0.7.0 | yes | 0.9.0 | no invented Japanese pitch; missing newer metadata receives safe defaults |
| 0.8.0 | yes | 0.9.0 | structured Japanese pitch preserved when present |
| 0.8.1 | yes | 0.9.0 | `data-pitch-stale` preserved |
| 0.8.2 | yes | 0.9.0 | identity lineage preserved |
| 0.9.0 | yes | 0.9.0 | `usagePolicy` and `extensions` preserved |

## `.phonodb`

| Input | v0.9 importer | Export result | Important behavior |
|---|---|---|---|
| 0.7.0 | yes | 0.9.0 | legacy observations accepted; missing newer fields remain absent/defaulted, not inferred |
| 0.8.0 | yes | 0.9.0 | projection/event and structured-pitch semantics retained |
| 0.9.0 | yes | 0.9.0 | freeze-candidate contract |

## Test fixtures

Purpose-built migration/adversarial files are under `qa/fixtures/`. They are synthetic QA material, not personal learning samples.
