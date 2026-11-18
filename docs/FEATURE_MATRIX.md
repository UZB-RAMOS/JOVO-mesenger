# Funksiya matritsasi

Holatlar: **DONE** ishlaydi; **PARTIAL** aniq cheklov bilan; **FLAGGED** kod/infra flag ortida; **NOT_STARTED** ko‘rinadigan ishlamaydigan control yo‘q.

| Funksiya | Holat | Izoh / test |
|---|---|---|
| Original JOVO brendi va Telegram-uslubidagi responsive shell | DONE | Ikki/uch panel, mobil full-screen chat, drawer, profil paneli; browser QA va `Avatar.test.tsx` |
| Uzbek default UI | DONE | Auth va asosiy chat oqimi |
| Rus/ingliz dictionary | PARTIAL | Messenger settings va asosiy shell tarjima qilingan; auth matni hali Uzbek |
| Email/parol register | DONE | Zod, Argon2id; API build smoke |
| Development OTP | DONE | 6 xonali, hash, expiry, 5 attempt cap, replay bloklanadi |
| Production email/SMS | NOT_STARTED | Provider yo‘q; production fail-closed bo‘lishi kerak |
| Login / refresh rotation / logout | DONE | Hashlangan refresh token, revocation, `httpOnly` cookie |
| Bir nechta akkaunt va tez almashish | DONE | Alice va Bobur akkauntlari menyuda saqlanadi; parol saqlanmaydi; browser QA |
| Sirojiddin demo akkaunti va Alisa bilan o‘zaro chat | DONE | Seed login + permanent direct chat; Alisa va Sirojiddin account-switcher’da browserda tekshirildi |
| Device/session list va remote revoke | DONE | REST endpointlar bor; alohida UI hali yo‘q |
| Foydalanuvchi qidiruvi | DONE | Username/display name; block ACL |
| Bevosita chat uniqueness | DONE | Canonical pair unique; `chats.utils.test.ts` |
| Xabar persist va pagination | DONE | `(chatId, createdAt, id)` index, bounded page |
| Scroll anchoring va yangi xabar indikatori | PARTIAL | Cursor pagination, prepend anchor, duplicate guard, near-bottom follow va new-message jump qo‘shildi; real browser/touch regression test hali kerak |
| Realtime send/receive | DONE | Authenticated Socket room, ack va reconnect client |
| Idempotent send | DONE | `(senderId, clientMessageId)` unique |
| Typing | DONE | Authorized event; client throttle/timeout |
| Unread/read receipt | DONE | DB cursor + socket event |
| Draft sync | DONE | DB upsert va chat-open restore; local cache fallback |
| Chat ichida lokal qidiruv | DONE | Ochiq tarix bo‘yicha natija soni va bo‘sh holat; browser QA |
| Emoji picker | DONE | Composerga emoji kiritish va oddiy xabar sifatida yuborish; browser QA |
| Kontakt ma’lumot paneli | PARTIAL | Profil, bio, lokal mute holati va qidiruv; shared media backend hali yo‘q |
| Block/privacy enforcement | PARTIAL | Block va direct-message privacy REST/Socket send’da; to‘liq privacy matrix keyin |
| V2-MSG-03 Reply/edit/delete | PARTIAL | Reply, sender-only edit va sender-only “hamma uchun o‘chirish” REST + realtime + UI ishlaydi; forward, edit tarixi va “men uchun” o‘chirish hali yo‘q; `messages.service.test.ts`, browser QA |
| V2-MSG-04 Reactions | DONE | Direct chatda emoji qo‘shish/olib tashlash, agregat va realtime sinxronizatsiya; shared validation + ikki akkauntli browser QA |
| Message pin | NOT_STARTED | `MessagePin` schema bor; API/UI hali yo‘q |
| One-to-one audio/video calls | NOT_STARTED | WebRTC signaling, call model, TURN va UI yo‘q; platform/test setup talab qiladi |
| Group/channel | NOT_STARTED | Phase 3/4 |
| Media upload/attachment | NOT_STARTED | MinIO infra bor, endpoint/UI yo‘q; Phase 3 |
| One-to-one audio/video call signaling | PARTIAL | Direct-chat authorization, incoming/accept/reject/end, offer/answer/ICE va 45s timeout mavjud; TURN, persisted history, reconnect/ICE restart va real microphone/camera two-browser QA yo‘q |
| Push/stories/bots/payments | NOT_STARTED | Keyingi bosqichlar |
| Secret Chat / E2EE | FLAGGED | OFF; reviewed protocol va audit bo‘lmaguncha yoqilmaydi |

## Avtomatik testlar

- shared validation: 3 test
- API canonical direct chat va message mutation authorization: 5 test
- web Avatar/accessibility: 2 test; scroll uchun browser regression hali bajarilmagan
- production build, strict typecheck, ESLint

Lokal PGlite migratsiya/seed, login → search → chat → send va Alice ↔ Bobur akkaunt almashish brauzer oqimlari tekshirildi. Ikki mustaqil browser context bilan realtime receive/read E2E keyingi majburiy qadam.
