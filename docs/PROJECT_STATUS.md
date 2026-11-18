# Loyiha holati

Yangilangan: 2026-11-18 (Asia/Tashkent)

## Rebrand: Sfera → JOVO (2026-11-18)

Mahsulot **JOVO Messenger** nomiga to‘liq ko‘chirildi. O‘zgargan joylar: npm workspace scope `@sfera/*` → `@jovo/*` (relink qilindi), UI brend matnlari va tagline, yangi original JOVO logotipi (`apps/web/public/logo.svg` — kichik "j" belgisi), `index.html`/manifest/service worker, i18n (uz/ru/en), Docker Compose va volume nomlari, `.env`/`.env.example` DB/bucket identifikatorlari, seed demo hisoblari (`*@jovo.local` / `JOVO1234`, `@bob_jovo`), cookie nomi `jovo_refresh`, BullMQ queue `jovo-jobs`, localStorage kalitlari. Lokal PGlite ma'lumot katalogi `.data/sfera-pg` ataylab o‘zgartirilmadi (mavjud lokal bazani saqlab qolish uchun). Tekshiruv: typecheck, lint, 10 test, va to‘rtala workspace build — barchasi PASS.

## Boshlang‘ich audit

Repository katalogi bo‘sh va Git repository emas edi. Saqlanishi kerak bo‘lgan mavjud kod yoki user change topilmadi. Monorepo, original branding, migratsiya va hujjatlar noldan yaratildi.

## Hozir ishlaydigan qism

- Phase 0 foundation: workspace, strict TypeScript, lint/test/build, Compose, Postgres/Redis/MinIO, Docker API/web/worker, Prisma migratsiya va seed.
- Phase 1 vertical slice: register → development OTP → login → user search → direct chat → realtime message → typing/read → reload persistence arxitekturasi.
- Telegram-uslubidagi, lekin original JOVO brendidagi responsive desktop/mobile UI: ikki/uch panelli shell, hamburger menyu, chat ichida qidiruv, profil paneli, emoji picker, dark/light va Uzbek/Russian/English sozlamalari.
- Menyudagi “Akkauntlar” bo‘limi: Alice va Bobur Rahimov akkauntlarini bir qurilmada saqlash va parolni saqlamasdan tez almashish.
- Seed’da Sirojiddin demo akkaunti va Alisa bilan saqlanadigan direct chat qo‘shildi; akkaunt switcher’ga login orqali ulanadi.
- V2 messaging slice: reply preview, sender-only edit, sender-only hamma uchun o‘chirish va realtime emoji reaksiyalar.

## Verifikatsiya natijasi

| Tekshiruv | Natija |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 10 test |
| `npm run build` | PASS |
| `npm audit --omit=dev` | PASS — 0 production vulnerability |
| Prisma generate + migration SQL | PASS |
| API production start | PASS |
| `/api/health/live` | PASS — HTTP 200 |
| `/api/health/ready` | PASS — lokal PGlite bilan HTTP 200 |
| Login → search → direct chat → message | PASS — real browser va seed hisoblari bilan |
| Telegram-uslubidagi desktop shell QA | PASS — menyu, chat qidiruvi, profil paneli va emoji composer |
| Alice ↔ Bobur akkaunt almashish | PASS — real browserda ikkala akkaunt ham menyuda ko‘rindi va almashdi |
| Alisa ↔ Sirojiddin chat va akkaunt ulash | PASS — ikkala inbox va account-switcher real browserda tekshirildi |
| V2 reply/edit/reaction ikki akkaunt QA | PASS — Alice’dagi natija Bobur oynasida saqlangan holatda ko‘rindi |
| Browser desktop/mobile QA | PASS; 700px breakpoint va to‘liq ekran chat oqimi |

## Lokal ishga tushirish

Docker va alohida PostgreSQL bo‘lmagan kompyuterlar uchun `npm run dev:local` qo‘shildi. U PGlite socket serverini ishga tushiradi, Prisma migratsiya/seed’ni qo‘llaydi va web/API’ni bir buyruqda ochadi. PGlite development uchun; production va to‘liq worker/media infratuzilmasida Docker/PostgreSQL/Redis/MinIO oqimi saqlanadi.

## Ma’lum cheklovlar

- Registration endpoint’da account-level OTP cap bor; IP/device global rate limiter hali qo‘shilmagan.
- Inbox unread hisoblash MVP’da har chat uchun count ishlatadi; katta inbox uchun agregat/query optimizatsiyasi zarur.
- Russian/English auth sahifalari hali tarjima qilinmagan.
- Redis Socket adapter hali ulanmagan; bitta API instance real-time uchun yetarli.
- MinIO container bor, media upload hali yo‘q.
- Worker faqat fail-closed skelet; scheduled message va media scanning implementatsiyasi yo‘q.

## Keyingi slice

1. Ikki mustaqil browser context bilan realtime receive/read E2E’ni avtomatlashtirish.
2. IP/device rate limiting va login audit.
3. Reply/edit/delete/reaction/pin authorization + integration test.
4. Secure attachment upload (signed URL, MIME/magic bytes, quota, scan hook).
