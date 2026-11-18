# Arxitektura qarori

## Qaror

JOVO modul chegaralari aniq bo‘lgan NestJS API, Socket.IO realtime gateway va React/Vite PWA sifatida qurildi. PostgreSQL — authoritative holat; Redis presence/jobs uchun ephemeral qatlam; MinIO esa keyingi media slice uchun private object storage bo‘ladi.

Mahalliy Windows/OneDrive muhiti pnpm symlinklarini bloklagani sabab Phase 0 da npm workspaces tanlandi. `package-lock.json` aniq dependency tree’ni pin qiladi. Bu arxitektura yoki Docker deploy formatini o‘zgartirmaydi.

## Paketlar

```text
apps/web       React UI, PWA shell, Socket.IO client
apps/api       NestJS REST + Socket.IO, auth va authorization
apps/worker    BullMQ worker skeleti (faqat konfiguratsiyalangan jobs ishlaydi)
packages/shared Zod validatsiya, DTO va umumiy turlar
prisma         PostgreSQL schema, migratsiya, seed
infra          Compose, Dockerfiles va nginx
```

## Asosiy oqim

1. REST login access JWT va `httpOnly` refresh cookie beradi.
2. Har HTTP request va Socket ulanishida session DB’dan tekshiriladi.
3. Client faqat server ruxsat bergan `chat:{id}` room’lariga qo‘shiladi.
4. Xabar transaction ichida yaratiladi, `clientMessageId` dublikat retry’ni qaytaradi.
5. Authoritative xabar Socket.IO orqali barcha chat a’zolariga tarqatiladi.

## Vaqt va presence

DB vaqtlar `timestamptz` bilan UTC’da saqlanadi. UI Tashkent (`Asia/Tashkent`) vaqtini ko‘rsatadi. Redis presence Phase 2 da qisqa TTL bilan qo‘shiladi; u hech qachon DB foydalanuvchi holatining authoritative manbasi bo‘lmaydi.
# V2.1 message mutation oqimi

Client `PATCH/DELETE /api/messages/:id` yoki reaction endpointini chaqiradi → `AuthGuard` access tokenni tekshiradi → `ChatsService` message chatini topib aktiv membershipni tekshiradi → edit/delete uchun sender ownershipni tekshiradi → Prisma authoritative state’ni yangilaydi → `ChatGateway` faqat `chat:{chatId}` room’iga typed `MessageDto` eventini uzatadi → client message’ni ID bo‘yicha atomik almashtiradi.

