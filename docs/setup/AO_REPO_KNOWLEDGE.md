# AO Repo Knowledge

This document publishes the canonical AO repo-knowledge contract for `ciecopilot-home`.

AO should treat the JSON contract below as the inspectable source for:

- canonical setup, verify, and build commands
- repo-specific risky surfaces that require elevated scrutiny
- runtime hints for the local GitHub workspace execution path

The contract is intentionally narrow. It is not a general prose scrape target and it does not replace task-specific verification requirements.

<!-- ao:repo-knowledge-contract -->
```json
{
  "schema_version": "ao.repo-knowledge-profile.v1alpha1",
  "project_id": "ciecopilot-home",
  "profile_version": 1,
  "generated_at": "2026-03-31T12:00:00.000Z",
  "canonical_commands": {
    "setup": [
      {
        "command_id": "setup.install_dependencies",
        "command": "npm install",
        "source_ref": "package.json"
      }
    ],
    "verify": [
      {
        "command_id": "verify.test_run_in_band",
        "command": "npm test -- --runInBand",
        "source_ref": "package.json#scripts.test"
      }
    ],
    "build": [
      {
        "command_id": "build.production_bundle",
        "command": "npm run build",
        "source_ref": "package.json#scripts.build"
      }
    ]
  },
  "risky_surfaces": [
    {
      "surface_id": "workflow.github_workflows",
      "kind": "workflow",
      "match_type": "prefix",
      "pattern": ".github/workflows/"
    },
    {
      "surface_id": "infra.github_actions",
      "kind": "infra",
      "match_type": "prefix",
      "pattern": ".github/actions/"
    },
    {
      "surface_id": "infra.infrastructure_dir",
      "kind": "infra",
      "match_type": "prefix",
      "pattern": "infra/"
    },
    {
      "surface_id": "infra.pulumi",
      "kind": "infra",
      "match_type": "prefix",
      "pattern": "pulumi/"
    },
    {
      "surface_id": "infra.terraform",
      "kind": "infra",
      "match_type": "prefix",
      "pattern": "terraform/"
    },
    {
      "surface_id": "infra.terraform_files",
      "kind": "infra",
      "match_type": "suffix",
      "pattern": ".tf"
    },
    {
      "surface_id": "infra.terraform_vars",
      "kind": "infra",
      "match_type": "suffix",
      "pattern": ".tfvars"
    },
    {
      "surface_id": "secret.env_files",
      "kind": "secret",
      "match_type": "prefix",
      "pattern": ".env"
    },
    {
      "surface_id": "secret.named_env_files",
      "kind": "secret",
      "match_type": "prefix",
      "pattern": ".env."
    },
    {
      "surface_id": "secret.pem_files",
      "kind": "secret",
      "match_type": "suffix",
      "pattern": ".pem"
    },
    {
      "surface_id": "secret.pkcs12_files",
      "kind": "secret",
      "match_type": "suffix",
      "pattern": ".p12"
    },
    {
      "surface_id": "secret.pfx_files",
      "kind": "secret",
      "match_type": "suffix",
      "pattern": ".pfx"
    },
    {
      "surface_id": "secret.key_files",
      "kind": "secret",
      "match_type": "suffix",
      "pattern": ".key"
    }
  ],
  "runtime_hints": {
    "runtime_ref": "runtime.github_local",
    "policy_ref": "policy.operator_gated",
    "node_engine": ">=18.0.0",
    "package_manager": "npm",
    "test_runner": "jest",
    "npm_engine": ">=9.0.0"
  }
}
```
