# Database

PostgreSQL authoritative storage. Prisma schema va SQL migratsiya `prisma/` ichida.

Core model guruhlari:

- identity: `User`, `UserProfile`, `UserStatus`, privacy/preferences
- auth: `AuthIdentity`, `VerificationChallenge`, `PasswordCredential`, `Session`
- social: `UserContact`, `UserBlock`
- messaging: `Chat`, `ChatMember`, `ChatReadCursor`, `ChatDraft`, `ChatPin`
- message state: `Message`, reaction, pin, delivery, read receipt

Muhim constraintlar:

- normalized lowercase `username` unique;
- email `(type,value)` unique;
- direct chat canonical `directKey` unique;
- membership `(chatId,userId)` unique;
- message idempotency `(senderId,clientMessageId)` unique;
- history index `(chatId,createdAt,id)`.

Soft-delete maydonlari mavjud; hozir user/chat hard-delete endpointi yo‘q. Cascade faqat ichki dependent recordlar uchun ishlatiladi. Advanced schema (groups/channels/media/stories/calls/bots/billing) tegishli feature slice’da migratsiya bilan qo‘shiladi.
# V2.1 message slice

Reply (`Message.replyToId`), edit (`editedAt`), delete tombstone (`deletedAt`, `deleteScope`) va reaction (`MessageReaction`) bazaviy schema/migratsiyada avvaldan mavjud edi. Shu slice schema o‘zgartirmadi va eski ma’lumotlarga migratsiya talab qilmadi. Keyingi edit-history slice additive `MessageVersion` migratsiyasini talab qiladi.

