# Advanced feature audit

Audit sana: 2026-11-13. Bu hujjat mavjud JOVO repo dalillariga asoslanadi.

## Arxitektura

- Web: React 19 + TypeScript + Vite, Zustand local state.
- API: NestJS 11 REST + Socket.IO gateway.
- DB: PostgreSQL + Prisma; lokalda persistent PGlite.
- Media storage: MinIO compose’da bor, lekin upload/download yo‘li yo‘q.
- Calls: WebRTC/CallSession moduli va signaling hozir mavjud emas.

## Messaging va real-time

- Xabarlar DB’da transaction bilan yoziladi, `clientMessageId` unique idempotency.
- Socket auth JWT/session tekshiradi; connect paytida aktiv chat room’lariga qo‘shadi.
- Reply, sender-only edit, sender-only delete-for-everyone va reactions REST + UI + realtime’da bor.
- Forward, per-user delete, edit history, pin/unpin, selection/bulk, message links va scheduled send yo‘q.
- Draft saqlanadi; reconnect uchun message fetch-after-sequence/offline queue yo‘q.

## Scroll muammolari va tuzatish

Oldingi kod prepend qilingan paginationdan keyin scroll anchor’ni tiklamas edi, incoming message’da esa foydalanuvchi tarix o‘qiyotganida joylashuvni boshqarmas edi. Endi list bitta `.message-scroll` konteyneridan foydalanadi, topga yaqinlashganda cursor page so‘raydi, birinchi ko‘rinadigan message elementining joyini saqlab prepend qiladi, ID bo‘yicha duplicate’larni filtrlaydi, pastga yaqin bo‘lsa incoming’ga ergashadi, yuqoriroq o‘qiyotganda esa “yangi xabarlar” tugmasini ko‘rsatadi.

## Edit va interaction

- API: `PATCH /api/messages/:id`; membership + sender ownership serverda tekshiriladi.
- UI: context menu, edit composer, edited label, Escape orqali modal/overlay yopish; real API xatosi ko‘rsatiladi.
- Reply/reaction natijalari message ID bo‘yicha yangilanadi va scroll offset o‘zgarmasligi kerak.
- Edit concurrency version guard va edit-history modeli yo‘q.

## Calls — yangilandi

Direct chat uchun Socket.IO orqali authenticated initiate/incoming/accept/reject/end/timeout va SDP/ICE signaling qo‘shildi. Browser’da `RTCPeerConnection` + `getUserMedia`, mic/camera toggle va incoming overlay mavjud. Hozir state process xotirasida; call history, TURN, ICE restart/reconnect va ikki browserda real media test hali yo‘q. Production tayyorligi da’vo qilinmaydi.

## Muhim keyingi ishlar

1. Browser automation bilan prepend anchoring, incoming/no-force-scroll, touch va mobil viewportni tekshirish.
2. Edit-time policy, version conflict va MessageVersion additive migration.
3. MessagePin API/UI, forwarding privacy va saved messages.
4. Call feature uchun TURN, signaling state machine, call persistence va two-device test plan.
5. Secure media upload pipeline; hozir composer upload/voice controls yo‘q.
