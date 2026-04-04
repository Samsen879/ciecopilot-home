# AO State Retention Policy

## Scope

This document defines the phase-5 retention rule for repo-local AO durable state.

The goal is to avoid the bad split where:

- Git is cleaned up
- GitHub is closed out
- AO state silently disappears or stays misleadingly active

## What Closeout Cleans Up

Normal workflow closeout removes:

- the local task worktree
- the local task branch

These are workspace artifacts, not durable AO history.

## What Closeout Retains

Normal workflow closeout retains:

- managed task records
- PR bindings
- ownership leases
- checkpoints
- handoff requests / claims / decisions / transfers
- audit entries
- controller and execution metrics

Closeout changes those records to released / retired state where appropriate. It does not delete them.

## Why Retain Durable State

The retained records answer questions that still matter after merge:

- was this task properly retired
- which PR did it belong to
- who owned it last
- did it resume from a checkpoint
- did it require a handoff
- why did AO hold or continue it

## Archive Boundary

Phase 5 retention is not long-term archival compaction.

Phase 5 rule:

- retain durable AO history during normal closeout

Phase 6 rule:

- decide which historical records become archive material
- decide which records can be compacted or cleaned safely

Until then, normal closeout should prefer traceability over aggressive cleanup.
