# Individual assessment draft safety

User journeys were derived from the feature/input-flow evaluation in this session.
Scope: the individual assessment UI and responsive controls. No database schema,
score formula, API handler, or existing material-mode behavior was changed.

## Regression evidence

The executable browser regression is `scripts/individual-assessment-check.mjs`.
It intercepts every `/api/**` request with fictional classes, students, sessions,
and scores; unknown endpoints return 404. Service workers are blocked, each case
uses a fresh browser context, and no application data is written.

Run against the actual local Lerd site:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node scripts/individual-assessment-check.mjs
```

Optional environment variables: `PIB_TEST_URL`, `CHROME_BIN`. The default target
is `https://penilaian-pib.test`; the default Chrome binary is
`/opt/google/chrome/chrome`. Playwright was reused from an existing installation,
not added as a project dependency.

Before the fix, runtime assertions reproduced loss of another material's input
after single save, loss after student navigation, loss of invalid input on bulk
save, and editable controls during saving. Two additional tests initially failed
because the new safe actions were not implemented yet. The completion test was
already green with the mock fixture; it is regression coverage, not proof of a
previous server-side failure.

After the fix, all 11 scenarios pass:

1. Saving one material preserves another material's draft.
2. Drafts survive student changes and page reload.
3. Bulk saving preserves invalid input, marks it invalid, and sends only changed valid drafts.
4. Filling unassessed materials preserves existing scores and existing drafts.
5. Saving disables editing and context changes.
6. Failed bulk save preserves drafts and prevents automatic student navigation.
7. Correcting a completed session does not send completion twice.
8. Conflict survives reload and requires explicit restoration before editing.
9. Save-and-next writes to the original student before switching.
10. Unavailable browser storage preserves in-memory input and warns before navigation.
11. At 320px, controls fit the viewport and the input remains usable.

The first responsive run detected overflow; container-based control layout fixed
it. The final screenshot uses fictional data and waits for viewport transitions.

## Other checks and limits

- `npm run typecheck`: passed.
- `npm test`: 65 tests in 16 files passed (existing database tests use memory databases).
- `npm run build`: passed, including type checking.
- `npm run perf:check`: passed; browser assets measured 2.25 MB before the final CSS-only adjustment.
- `git diff --check`: passed.
- Browser tests exercise the production UI with simulated APIs, not real database writes.
- Numeric coverage was not collected; no 80% coverage claim is made.
- No checkpoint commits were made: application files already contained overlapping
  local changes before this task. The working-tree changes and executable test
  retain the implementation and RED/GREEN evidence without committing prior work.
