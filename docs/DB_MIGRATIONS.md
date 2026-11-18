# DB migratsiyalar

## Joriy holat

`prisma/migrations/20261111130000_init` Phase 1 va V2.1’da ishlatilgan `replyToId`, `editedAt`, `deletedAt`, `deleteScope` hamda `MessageReaction` obyektlarini o‘z ichiga oladi. V2.1 reply/edit/delete/reaction slice uchun yangi migratsiya kerak bo‘lmadi.

## Qoida

- Yangi modullar faqat additive migratsiya bilan qo‘shiladi.
- Existing column/model destructive rename yoki drop qilinmaydi; avval backfill va compatibility window beriladi.
- Deploy: `npm run db:deploy`; lokal yaratish: `npm run db:migrate -- --name <nom>`.
- Production rollback schema’ni orqaga majburan tushirish emas, oldingi app versiyasiga qaytish va forward-fix migratsiya orqali bajariladi.
- Har migratsiyadan oldin backup, keyin constraint/index va old data bilan smoke test talab qilinadi.
