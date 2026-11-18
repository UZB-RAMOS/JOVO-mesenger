# JOVO V2 roadmap

## V2.0 — audit va xavfsiz baseline

- [x] Existing repository, schema, REST/Socket va UI auditi.
- [x] Baseline typecheck/lint/test/build.
- [x] Gap analysis, roadmap va feature matrix yangilanishi.
- [ ] PostgreSQL integration test harness va ikki browser Playwright E2E.

## V2.1 — messaging perfection

- [x] Reply preview va exact-message jump.
- [x] Sender-only edit + edited label + realtime update.
- [x] Sender-only delete-for-everyone + realtime tombstone.
- [x] Emoji reaction add/remove + aggregate + realtime update.
- [ ] Edit history va forward attribution/privacy.
- [ ] Message pin, Saved Messages, archive va folders.
- [ ] Offline retry/reconnect reconciliation va delivery states.

Acceptance: Alice va Bobur alohida akkauntlarda reply/edit/reaction natijasini bir xil ko‘radi; begona sender edit/delete qila olmaydi; reload’dan keyin holat DB’dan tiklanadi.

## V2.2 — media va privacy

Secure upload init/complete, MIME/magic-byte tekshiruvi, scan hook, ACL fetch, quota, cleanup; undan keyin image/file UI va shared media.

## Keyingi aniq slice

`V2-MSG-08` message pin va `V2-INBOX-03` Saved Messages. Avval Prisma additive migration, keyin permissioned REST/Socket, UI va ikki-user integration test.
