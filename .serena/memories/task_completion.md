# Completion checks
- Always run npm run typecheck, npm test -- --run, npm run build, and npm run perf:check for frontend changes.
- UX changes also require browser smoke/interaction checks at 375, 768, and 1440 widths plus keyboard/accessibility review; repository currently has no browser harness.
- Check git diff --check and preserve unrelated working-tree edits.
- Before database-changing tests, verify test DB isolation; do not reset pib.sqlite for readiness checks.