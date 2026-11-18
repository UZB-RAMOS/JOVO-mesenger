# Keyingi amallar

1. `MessageVersion` additive modelini qo‘shib edit history siyosatini yozish.
2. `MessagePin` uchun POST/DELETE endpoint, admin/member policy va `message:pinChanged` event.
3. `SAVED` chatni har user uchun seed/backfill qilib “Saqlangan xabarlar” oqimini qo‘shish.
4. Real PostgreSQL’da unauthorized edit/delete/reaction va cross-chat IDOR integration testlari.
5. Ikki mustaqil browser context bilan realtime edit/delete/reaction Playwright E2E.

Tekshiruv buyruqlari:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run dev:local
```
