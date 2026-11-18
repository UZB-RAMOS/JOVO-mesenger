# Socket.IO contract

Connection auth:

```json
{ "auth": { "token": "short-lived-access-jwt" } }
```

Server sessionni DB’dan tekshiradi va faqat a’zo bo‘lgan `chat:{chatId}` room’lariga qo‘shadi.

## Client → server

- `message:send` — `{chatId,clientMessageId,content,replyToId?}`; ack `{ok,message}`
- `chat:typing` — `{chatId,active}`
- `chat:read` — `{chatId,messageId}`

## Server → client

- `session:ready`
- `session:error`
- `message:created`
- `message:edited` — to‘liq yangilangan `MessageDto`
- `message:deleted` — body’siz tombstone `MessageDto`
- `message:reactionAdded`
- `message:reactionRemoved`
- `chat:updated`
- `chat:typing`
- `chat:read`

## One-to-one call signaling (partial)

- `call:initiate` — `{chatId,mode:'audio'|'video'}`; sender active chat member bo‘lishi va chat DIRECT bo‘lishi kerak; ack `{ok,callId}` yoki band holati.
- Server → callee `call:incoming` — `{callId,chatId,callerId,mode}`.
- `call:accept`, `call:reject`, `call:end` — faqat shu call’ning ikki participantidan.
- `call:signal` — `{callId,kind:'offer'|'answer'|'ice',data}`; server boshqa participantga uzatadi, 64 KB limit bilan.
- Server timeout `call:timeout`; yakun `call:ended`.

Call state hozir API process xotirasida turadi va restart’da yo‘qoladi; call history persist qilinmaydi. TURN credentials clientga chiqarilmaydi; faqat public STUN ishlatiladi.

Message mutation eventlari faqat backend membership asosida qo‘shilgan `chat:{chatId}` room’iga yuboriladi.

Har event server-side membership tekshiradi. `clientMessageId` retry dublikatini bartaraf qiladi. Redis multi-instance adapter va presence TTL Phase 2’da qo‘shiladi.
