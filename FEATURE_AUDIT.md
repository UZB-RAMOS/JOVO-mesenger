# JOVO Messenger — FEATURE_AUDIT.md

Audit sanasi: 2026-11-20 (Asia/Tashkent).
Asos: amaldagi kod (`apps/*`, `packages/shared`), Prisma schema (`prisma/schema.prisma`),
REST/Socket controllerlari, web komponentlari, avtomatik testlar va mavjud hujjatlar
(`docs/FEATURE_MATRIX.md`, `docs/GAP_ANALYSIS_V2.md`, `docs/ADVANCED_FEATURE_AUDIT.md`).

Bu hujjat JOVO'ni "ULTIMATE EXPANSION" spetsifikatsiyasi bilan solishtiradi va har bir
funksiyaning **haqiqiy** holatini belgilaydi. Soxta "ishlaydi" yoki soxta tugmalar belgilanmaydi.

## Holat belgilari

| Belgi | Ma'no |
|---|---|
| ✅ DONE | To'liq ishlaydi, kod va (ko'p hollarda) test bilan tasdiqlangan |
| 🟡 PARTIAL | Qisman; aniq cheklov bilan |
| ⚠️ UI-ONLY | Faqat interfeys; backend/persistens yo'q |
| 🔴 MISSING | Yo'q (control ham, backend ham) |
| 🚧 FLAGGED | Ataylab o'chirilgan / flag ortida (masalan E2EE) |

---

## 0. Umumiy holat (baseline)

Monorepo — React 19 + Vite PWA (`apps/web`), NestJS 11 + Socket.IO (`apps/api`),
BullMQ worker skeleti (`apps/worker`), Prisma 7 + PostgreSQL/PGlite, Redis/MinIO Docker infra.
Rebrand Sfera → JOVO yakunlandi. Tekshiruv: `typecheck`, `lint`, 10 test, 4 build — **PASS**.
Lokal rejim (`npm run dev:local:run`) ishlaydi; `bob@jovo.local / JOVO1234` bilan kirish va
real-time socket ulanishi brauzerda tasdiqlandi.

**Prisma schemada MAVJUD modellar:** User, UserProfile, UserStatus, UserPrivacySettings,
UserPreferences, AuthIdentity, VerificationChallenge, PasswordCredential, Session, UserContact,
UserBlock, Chat (DIRECT/GROUP/CHANNEL/SAVED enum), ChatMember (OWNER/ADMIN/MEMBER/SUBSCRIBER),
ChatReadCursor, ChatDraft, ChatPin, Message, MessageReaction, MessagePin, MessageDelivery,
MessageReadReceipt.

**Prisma schemada YO'Q (spec talab qiladi):** GroupPermission, Channel*, ChannelSubscriber,
ChannelPost, MessageAttachment, ScheduledMessage, ChatFolder, Notification, Call,
BotAccount, UserDevice, Poll/PollVote, Story, Report. Bu funksiyalar avval **additive migration**
talab qiladi.

---

## 1. Hisob (Account) — spec §1

| Funksiya | Holat | Izoh |
|---|---|---|
| Email/parol ro'yxat + login | ✅ | Zod, Argon2id, `httpOnly` refresh rotation |
| Development OTP | ✅ | 6 xonali, hash, expiry, 5 urinish cap, replay bloklanadi |
| **+998 telefon OTP** | 🟡 | **Phase 2 (2026-11-20) bajarildi**: parolsiz phone+OTP ro'yxat/login, +998 validatsiya (shared, test bilan), country-prefix UI, Eskiz.uz SMS adapteri. Browserda register→OTP→auto-login tasdiqlandi. **Real SMS uchun `.env`da `SMS_PROVIDER=eskiz` + Eskiz token kerak**; aks holda dev-kod rejimida ishlaydi. |
| Profil tahrirlash (ism, bio) | ✅ | `PATCH /api/me`; UserProfile |
| Username | 🟡 | Username bor va unique; **tahrirlash UI va availability-check yo'q** |
| Profil rasm yuklash | 🔴 | `avatarUrl` maydoni bor, upload pipeline yo'q |
| Bir nechta profil rasmi / profil video | 🔴 | Model yo'q |
| Birthday + privacy | 🟡 | `birthday` maydoni bor; UI va privacy toggle yo'q |
| Sessiyalar ro'yxati / remote revoke | 🟡 | REST endpoint (`GET/DELETE /api/auth/sessions`) bor; **alohida UI yo'q** |
| Login tarixi / yangi login ogohlantirish | 🔴 | Session.ipHash bor, audit/alert yo'q |
| Ikki bosqichli tasdiq (2FA/TOTP) | 🔴 | Yo'q |
| Hisobni o'chirish / deaktivatsiya | 🔴 | `deletedAt` soft-delete maydoni bor, endpoint/UI yo'q |
| Account recovery | 🔴 | `VerificationPurpose.RECOVERY` enum bor, flow yo'q |
| QR / public profil havolasi (t.me uslubi) | 🔴 | Yo'q |
| Multi-account switch (bitta qurilmada) | ✅ | Menyuda akkaunt almashish; browser QA |

## 2. Xabarlar (Messaging) — spec §2

| Funksiya | Holat | Izoh |
|---|---|---|
| Matn yuborish/qabul (realtime) | ✅ | Socket.IO room, ack, reconnect, idempotent (`clientMessageId`) |
| Edit | ✅ | `PATCH /api/messages/:id`, sender-only, realtime |
| Delete for everyone | ✅ | Sender-only, body tozalanadi |
| **Delete for me (per-user)** | 🔴 | Per-user visibility modeli yo'q; soxta qilinmadi |
| Reply | ✅ | `replyToId`, reply preview UI |
| **Forward** | 🔴 | Yo'q |
| Reactions | ✅ | Emoji add/remove, agregat, realtime |
| Custom emoji reactions | 🔴 | Yo'q |
| Read receipts / delivered | 🟡 | ReadCursor + MessageReadReceipt/Delivery modellari bor; delivered reconciliation to'liq emas |
| Typing indikatori | ✅ | Throttle/timeout |
| Unread hisoblagich | ✅ | Per-chat count (katta inbox uchun optimallashtirilmagan) |
| Draft + sync | ✅ | DB upsert + local fallback |
| **Pin / unpin** | 🔴 | `MessagePin` schema bor, API/UI yo'q |
| Chat ichida qidiruv | 🟡 | Ochiq tarix bo'yicha lokal qidiruv; server-side/global emas |
| Qidiruv: sender/sana/tur bo'yicha | 🔴 | Yo'q |
| Select multiple / bulk delete/forward | 🔴 | Yo'q |
| Scheduled / silent / send-when-online | 🔴 | `ScheduledMessage` modeli yo'q |
| Rich formatting (bold/italic/spoiler/code/quote) | 🔴 | Faqat oddiy matn |
| Message context menu | 🟡 | Edit/delete/reply/reaction menyusi bor; to'liq emas |

## 3. Media va fayllar — spec §3, §6

| Funksiya | Holat | Izoh |
|---|---|---|
| Rasm/video/hujjat yuklash | 🔴 | MinIO container bor; **upload/download endpoint va UI yo'q** |
| MessageAttachment modeli | 🔴 | Schemada yo'q |
| Image viewer / gallery / zoom | 🔴 | Yo'q |
| Video player / PiP | 🔴 | Yo'q |
| Ovozli xabar (record/waveform) | 🔴 | Yo'q |
| Doira video xabar | 🔴 | Yo'q |
| Upload progress / cancel | 🔴 | Yo'q |

## 4. Guruhlar — spec §4

| Funksiya | Holat | Izoh |
|---|---|---|
| Guruh yaratish / a'zolar / rollar | 🔴 | `Chat.type=GROUP` va `ChatMember.role` enum bor, lekin **API/UI/permission matrix yo'q** |
| Invite link / join request | 🔴 | Model yo'q |
| Admin huquqlari / custom title / anonymous | 🔴 | GroupPermission modeli yo'q |
| Restrict/ban/mute/slow mode/topics | 🔴 | Yo'q |

## 5. Kanallar — spec §5

| Funksiya | Holat | Izoh |
|---|---|---|
| Public/private kanal, obuna, postlar | 🔴 | `Chat.type=CHANNEL` enum bor; Channel/Subscriber/Post modellari va API/UI yo'q |
| Statistika / views | 🔴 | Yo'q (soxta statistika yaratilmaydi) |

## 6. Pollar va viktorinalar — spec §6
🔴 MISSING — Poll/PollVote modeli, API, UI yo'q.

## 7. Qidiruv tizimi — spec §7
🟡 PARTIAL — Foydalanuvchi qidiruvi (`GET /api/users`) ✅; chat ichida lokal qidiruv ✅.
Global/indexed search (xabar, fayl, hashtag, filtrlar, tarix) 🔴.

## 8. Chat papkalari va tartib — spec §8, §12
| Funksiya | Holat | Izoh |
|---|---|---|
| Kontaktlar (qo'shish/o'chirish) | ✅ | `UserContact`, REST |
| Block/unblock | ✅ | `UserBlock`, REST + ACL (qidiruv/DM) |
| Saqlangan xabarlar (Saved) | 🟡 | `ChatType.SAVED` enum bor; to'liq UI/flow tasdiqlanmagan |
| Chat papkalari (folders) | 🔴 | `ChatFolder` modeli yo'q |
| Arxiv | 🔴 | Yo'q |

## 9. Bildirishnomalar — spec §9, §13
🔴 MISSING — In-app unread ✅, lekin push/service-worker notification, Notification modeli,
mute-per-chat, exceptions yo'q. (PWA service worker mavjud, lekin push emas.)

## 10. Secret chat / xavfsizlik — spec §10
🚧 FLAGGED — E2EE ataylab **OFF**; audited protokol va review bo'lmaguncha yoqilmaydi
(soxta "end-to-end encrypted" yorlig'i qo'yilmaydi). Rate limiting 🟡 (account-level OTP cap bor,
IP/device global limiter yo'q). Report/abuse/security dashboard 🔴.

## 11. Qo'ng'iroqlar — spec §11
🟡 PARTIAL — Direct chat uchun Socket signaling (initiate/accept/reject/end/timeout, SDP/ICE),
brauzer `RTCPeerConnection`+`getUserMedia`, mic/camera toggle, incoming overlay bor.
**TURN/STUN, call history (Call modeli yo'q), ICE restart/reconnect, group calls (SFU) va
ikki qurilmada real media test yo'q.** Production tayyorligi da'vo qilinmaydi.

## 12. Botlar / Mini Apps — spec §13
🔴 MISSING — BotAccount, grant/token/webhook modellari, API, UI yo'q.

## 13. Lokatsiya ulashish — spec §14
🔴 MISSING.

## 14. Sozlamalar — spec §15
| Bo'lim | Holat |
|---|---|
| Appearance: dark/light/system | ✅ |
| Language: uz/ru/en | 🟡 (uz to'liq; ru/en qisman — auth sahifalari uz) |
| Privacy: block, last-seen, DM toggle | 🟡 (bir qismi backendda; to'liq matrix yo'q) |
| Security / Devices / Notifications / Data&Storage / Power | 🔴 ko'p qismi |

## 15. Admin dashboard — spec §21
🔴 MISSING — Alohida himoyalangan admin panel, RBAC, audit log, statistika yo'q.

## 16. Moderatsiya / hisobot — spec §19
🔴 MISSING (block bundan mustasno ✅).

## 17. Backup / data export — spec §20
🔴 MISSING — Account export / data deletion / backup hujjatlari yo'q.

## 18. UX / Performance / A11y — spec §16–18
🟡 PARTIAL — Responsive shell ✅, dark/light ✅, skeleton/empty/error states qisman,
scroll anchoring + new-message jump ✅. Virtualized list, code-splitting, offline queue,
to'liq a11y/screen-reader audit 🔴.

## 19. i18n — spec §18
🟡 PARTIAL — Markazlashgan dictionary (uz/ru/en), to'g'ri o'zbek harflari (o', g').
Auth matnlari hali faqat o'zbekcha; ba'zi stringlar tarjima qilinishi kerak.

---

## Prioritetli roadmap (dependency tartibida)

1. **Phase 2 — +998 telefon OTP + Eskiz SMS adapter** (acceptance-criteria blokeri).
   Phone identity, country selector, validatsiya; dev-OTP fallback token berilgunча.
2. **Phase 3 — Xavfsiz media upload pipeline** (MinIO/S3 signed URL, MIME/magic-bytes,
   quota, MessageAttachment migration) → media UI. Ko'p funksiyani ochadi.
3. **Phase 4 — Message kengaytmalari**: pin/unpin, forward, delete-for-me (per-user model),
   rich formatting, global search indekslari.
4. **Phase 5 — Guruhlar** (role/permission matrix, invite links, join requests).
5. **Phase 6 — Kanallar** (post/subscriber/stats, guruhlardan keyin).
6. **Phase 7 — Bildirishnomalar** (Notification modeli + web push + service worker).
7. **Phase 8 — Qo'ng'iroq hardening** (TURN, Call history modeli) → keyin SFU group calls.
8. **Phase 9 — Pollar, botlar, lokatsiya, admin dashboard, moderatsiya** (kengaytmalar).
9. **Kesib o'tuvchi**: Privacy matrix, IP/device rate limiting, a11y, i18n to'ldirish.

E2EE (secret chats) alohida security review'dan keyingina — hozir FLAGGED OFF.

## Tashqi xizmatlar / kalitlar (kerak bo'ladi)

- **SMS/OTP** (Uzbekiston): Eskiz.uz yoki Play Mobile — ro'yxatdan o'tgan hisob + API token (`.env`).
- **Deploy**: Vercel (web) + Node host (Railway/Render/Fly) api+worker + S3-mos bucket.
- **Push** (keyin): Web Push VAPID kalitlari (bepul generatsiya).
- **TURN/SFU** (qo'ng'iroqlar uchun): coturn yoki boshqa provayder.
