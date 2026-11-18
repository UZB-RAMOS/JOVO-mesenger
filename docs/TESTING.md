# Testing

## Avtomatik

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

## DB integration checklist

1. Lokal tez sinov uchun `npm run dev:local` ni ishga tushiring. To‘liq infra uchun Docker Compose’dan foydalaning.
2. `dev:local` migratsiya va seed’ni avtomatik bajaradi.
3. API readiness HTTP 200 ekanini tekshiring.
4. Alice/Bob alohida browser contextlarda login bo‘lsin.
5. Search → direct chat → `Salom` → realtime response.
6. Typing active/off, unread/read va reconnect.
7. Reloaddan keyin xabar qolishi; 40+ xabarda pagination dublikatsiyasiz.
8. Non-member message/history so‘rovlari 403.
9. Blockdan keyin REST va Socket send rad qilinishi.
10. Revoked session bilan REST/Socket kirish 401/disconnect.

## Manual responsive

- Chrome desktop 1440×900
- Chrome mobile 390×844
- Firefox desktop
- Klaviatura bilan auth, new chat, composer va modal navigation
- 200% zoom va reduced-motion

Joriy sessiyada PGlite bilan login, foydalanuvchi qidiruvi, direct chat yaratish va xabar yuborish real brauzerda tekshirildi. Ikki alohida browser contextdagi realtime receive/read avtomatlashtirilishi hali keyingi qadam.
