# HTTP API

Barcha private endpointlar `Authorization: Bearer <accessToken>` talab qiladi. JSON validatsiya xatolari HTTP 400, auth 401, ACL 403, topilmasa 404 qaytaradi.

## Auth

- `POST /api/auth/register` — `{email, username, displayName, password}`
- `POST /api/auth/verify` — `{email, code}`
- `POST /api/auth/login` — `{email, password}` → `{accessToken,user}` + refresh cookie
- `POST /api/auth/refresh` — refresh cookie rotation
- `POST /api/auth/logout`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/:id`

## User va privacy

- `GET /api/me`
- `PATCH /api/me` — `{displayName?,bio?,avatarUrl?}`
- `GET /api/users?search=...`
- `GET /api/users/by-username/:username`
- `POST /api/blocks` — `{userId}`
- `DELETE /api/blocks/:id`

## Chat va xabar

- `GET /api/chats`
- `POST /api/chats/direct` — `{userId}`
- `GET /api/chats/:id`
- `GET /api/chats/:id/messages?cursor=<messageId>&limit=40`
- `POST /api/chats/:id/messages` — `{clientMessageId,content,replyToId?}`
- `PATCH /api/messages/:id` — faqat sender; `{content}`; membership qayta tekshiriladi
- `DELETE /api/messages/:id` — faqat sender uchun delete-for-everyone; body tozalanadi
- `POST /api/messages/:id/reactions` — chat a’zosi; `{emoji}`; idempotent upsert
- `DELETE /api/messages/:id/reactions/:emoji` — foydalanuvchining o‘z reaksiyasini olib tashlaydi
- `POST /api/chats/:id/read` — `{messageId}`
- `PUT /api/chats/:id/draft` — `{content}`

## Health

- `GET /api/health/live` — process ishlayapti
- `GET /api/health/ready` — PostgreSQL connection tayyor

Limitlar: xabar 4096 belgi; pagination 1–100; username 4–32.
