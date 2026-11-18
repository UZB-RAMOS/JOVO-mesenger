# JOVO V2 gap tahlili

Tekshirildi: 2026-11-13, Asia/Tashkent. Asos: amaldagi kod, Prisma schema, REST/Socket controllerlari, web komponentlari va avtomatik testlar.

## Baseline

Loyiha bo‘sh emas: npm workspaces, React/Vite PWA, NestJS/Socket.IO, Prisma/PostgreSQL, PGlite lokal rejim, Redis/MinIO Docker infratuzilmasi va Phase 1 direct messaging mavjud. Audit boshlanishida `typecheck`, `lint`, 6 test va build PASS bo‘ldi. Git metadata mavjud emas; shu sabab commit yaratilmaydi.

## V2 modul holati

| Modul | ID oralig‘i | Holat | Asosiy gap | Hajm / prerequisite |
|---|---|---|---|---|
| Identity | V2-ID-01…10 | PARTIAL | Multi-account va sessiya revoke bor; QR login, TOTP/passkey, recovery va profil tarixlari yo‘q | M–L; auth audit |
| Inbox | V2-INBOX-01…08 | PARTIAL | Inbox, unread, draft va lokal qidiruv bor; folder/archive/saved/global search/export yo‘q | M–L; yangi schema |
| Messages | V2-MSG-01…16 | PARTIAL | Reply/edit/delete/reaction endi ishlaydi; rich AST, forward, schedule, offline queue, pin va delivery reconciliation yo‘q | S–L; slice bo‘yicha |
| Media | V2-MEDIA-01…12 | NOT_STARTED | MinIO infra bor, xavfsiz upload pipeline va UI yo‘q | L; storage + worker |
| Groups | V2-GROUP-01…11 | NOT_STARTED | Schema/API/UI yo‘q | L; roles/ACL first |
| Channels | V2-CHANNEL-01…09 | NOT_STARTED | Schema/API/UI yo‘q | L; groupsdan keyin |
| Stories | V2-STORY-01…07 | NOT_STARTED | Schema/API/UI yo‘q | L; media pipeline |
| Calls | V2-CALL-01…08 | BLOCKED | TURN/SFU va media permission test muhiti sozlanmagan | L; WebRTC/TURN |
| Bots | V2-BOT-01…16 | NOT_STARTED | Grant/token/webhook modellari yo‘q | L; permission engine |
| AI | V2-AI-01…07 | FLAGGED | Provider va opt-in data policy yo‘q; foydalanuvchi ma’lumoti tashqariga yuborilmaydi | M–L; provider review |
| Business | V2-BIZ-01…05 | NOT_STARTED | Business profile/team inbox yo‘q | L; groups/roles |
| Premium | V2-PREMIUM-01…05 | FLAGGED | Billing faqat tasdiqlangan sandbox provider bilan | L; legal/provider |
| Privacy | V2-PRIVACY-01…08 | PARTIAL | Block va direct-message policy bor; report/export/security center yo‘q; E2EE OFF | M–L; security review |
| Look | V2-LOOK-01…10 | PARTIAL | Responsive shell, theme, i18n dictionaries va PWA bor; to‘liq offline/push/a11y audit yo‘q | S–M |

## Birinchi yakunlangan slice

`V2-MSG-03` va `V2-MSG-04`: mavjud additive schema ishlatildi. Backend har mutationda chat membershipni tekshiradi; edit/delete faqat senderga ruxsat beradi; o‘chirish message body’ni bo‘shatadi. REST natijasi Socket.IO orqali chatning autorizatsiyalangan room’iga uzatiladi. UI reply konteksti, edit holati, action menu va reaction agregatini ko‘rsatadi.

## Dependency ketma-ketligi

1. Message permission/integration E2E → pin/forward/saved/archive.
2. Secure upload lifecycle → media UI → groups/channels/stories.
3. Group role matrix → channels/communities/bots/business.
4. TURN bilan 1:1 call → faqat undan keyin SFU group calls.
5. Security center va privacy matrix → alohida auditdan keyingina E2EE design review.

## Risklar

- PGlite development server parallel querylarda ogohlantirish beradi; real integration test PostgreSQL’da ham bajarilishi kerak.
- Access token qisqa muddatli; multi-account uchun har akkauntga alohida refresh-cookie arxitekturasi hali yo‘q.
- Message edit history modeli yo‘q; hozirgi edit eski body’ni saqlamaydi.
- “Delete for me” uchun per-user visibility modeli kerak; mavjud global enum bilan soxta implementatsiya qilinmadi.
