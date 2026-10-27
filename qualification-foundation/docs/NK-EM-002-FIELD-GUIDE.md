# Field Guide — NK-EM-002: Temporary Artifact Lifecycle

**Audience:** someone learning the security side from scratch. No prior
red-team vocabulary assumed.

## The security concept

When an attacker operates on a machine, they usually leave something
behind — a file, a registry entry, a scheduled task. Defenders learn to
spot these leftovers, called **artifacts**. A good exercise needs to
produce a realistic artifact a defender can find, **and then clean it up
completely**, so the test machine is left exactly as it started.

The hard part is not creating the file. The hard part is *proving* it
was really removed. If the same program that made the mess also grades
whether it cleaned up, you have no real assurance — a buggy or dishonest
program would just say "all clean."

## The adversary behavior being represented

A low-sophistication adversary action: drop a small file somewhere
temporary, use it, delete it. This is the simplest possible "touch the
disk and tidy up" behavior. It is the floor of the payload library — if
we cannot do this safely and prove cleanup independently, nothing more
complex should be attempted.

## Why a security team cares

- It exercises the detect-an-artifact-then-confirm-removal loop.
- It establishes the pattern every later, riskier module must follow:
  the thing that acts does not get to grade itself.

## What the exercise simulates

The appearance and disappearance of a single, clearly-labeled,
throwaway file inside a directory set aside for the exercise.

## What it actually does to the computer

1. Creates a brand-new temporary directory *inside a workspace folder
   the exercise explicitly authorized* (never a random system location).
2. Writes one small JSON file (max 4 KB) into it, using exclusive
   creation so it can never overwrite an existing file.
3. Computes the file's SHA-256 (a fingerprint) and confirms the bytes it
   read back match what it wrote.
4. Deletes the file and lets the temporary directory be removed.
5. Stops and reports `CLEANUP_PENDING` — "I believe I cleaned up; please
   verify."

Then a **separate program** (the verifier) independently checks the disk
and is the only thing allowed to declare `CLEANUP_VERIFIED`.

## What it deliberately does NOT do

- No network access of any kind.
- No administrator/root privileges.
- No change to startup items, services, scheduled tasks, or any system
  configuration.
- Never touches user documents or any pre-existing file.
- Never writes outside the authorized workspace directory.
- Never declares its own cleanup successful.

## What a normal user or administrator would observe

Briefly, a folder named `nk_em_002_*` appears inside the exercise
workspace and then vanishes within the same run. Nothing elsewhere on
the machine changes. After the run, the workspace is empty again.

## What counts as a successful exercise

All of the following, together:

1. The module reached `CLEANUP_PENDING` (it created, used, and removed
   its artifact without error).
2. A separate verifier, re-checking the disk itself, found both the file
   and its temporary directory truly absent and emitted
   `CLEANUP_VERIFIED`.
3. The two records correlate (same event id, same exercise/operation/
   participant/asset).
4. The hash-chained ledger holding all of this is intact.

If any one of those is missing, the asset does **not** become READY.
That is the whole point: success is the independently-confirmed version,
never the module's own say-so.
