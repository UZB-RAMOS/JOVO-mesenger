# Advanced upgrade report

Yangilangan sana: 2026-11-13

## Tuzatildi

- Chat scroll uchun bitta mustaqil scroll konteyneri; xabarlar prepend qilinganda ko‘rinadigan anchor saqlanadi.
- Pagination cursor mavjud bo‘lsa yuqoriga yetganda older page yuklanadi; parallel so‘rovlar to‘siladi; xabarlar ID bo‘yicha dedupe qilinadi.
- Pastdagi foydalanuvchi yangi xabarni ko‘radi; oldingi xabarlarni o‘qiyotgan foydalanuvchiga majburiy scroll qilinmaydi, yangi xabarlar tugmasi chiqadi.
- Oldingi V2 slice’dan reply/edit/delete/reaction: API va realtime saqlangan; sender ownership serverda tekshiriladi.

## Calls holati

Direct chatda birga ishlaydigan WebRTC audio/video UI va Socket.IO signaling qo‘shildi: incoming, qabul/rad, caller timeout, SDP offer/answer, ICE candidate uzatish, mikrofon/kamera toggle va cleanup. Server har signaling amalida participantni tekshiradi. Hozir call state faqat API process xotirasida; call history, TURN credentials endpoint, reconnect/ICE restart va real qurilmalar sinovi qolgan. Shu sabab PARTIAL, production tayyorligi emas.

## O‘zgargan fayllar

- `apps/web/src/components/Messenger.tsx`
- `apps/web/src/styles.css`
- `docs/ADVANCED_FEATURE_AUDIT.md`
- `docs/ADVANCED_UPGRADE_REPORT.md`
- `docs/FEATURE_MATRIX.md`

## Ma’lumotlar bazasi, API va Socket

Scroll repair DB/API/Socket kontraktlarini o‘zgartirmadi; migration kerak emas. Xabar mutation endpointlari va realtime eventlari avvalgi V2 ishidan foydalanadi.

## Cheklovlar

- `Delete for me`, forwarding, pin UI/API, edit history, offline queue va call log yo‘q.
- Scroll regression’ni real two-context browser va touch device’da tekshirish keyingi acceptance qadam.
- Composer’da upload/voice recording UI yo‘q; media’ni fake qilmaymiz.
