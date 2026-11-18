# Security

## Implementatsiya qilingan

- Argon2id password va OTP hashing.
- Yuqori entropiyali refresh token SHA-256 hash ko‘rinishida saqlanadi va har refreshda aylanadi.
- `httpOnly`, `SameSite=Lax`, production’da `Secure` cookie.
- Session revocation har REST va Socket auth’da DB’dan tekshiriladi.
- Membership va block tekshiruvi backendda; yashirin UI ACL hisoblanmaydi.
- Zod input bounds, Helmet, CORS allowlist, Prisma parameterization.
- OTP expiry, attempt cap va replay prevention.
- Production dependency audit: 0 vulnerability (2026-11-11).

## Hali production uchun zarur

- IP/account/device distributed rate limiting (Redis), login audit va alert.
- CSRF threat model refresh/logout endpointlari uchun qat’iy Origin/CSRF token enforcement bilan yakunlash.
- Real email/SMS provider, secrets manager va rotation.
- Upload magic-byte validation, antivirus hook, private signed URLs.
- SSRF-safe link preview worker.
- Monitoring, backup/restore drill va independent penetration test.

## Kriptografiya da’vosi

JOVO Secret Chat yoki application-level E2EE’ni implementatsiya qilmagan. HTTPS/WebSocket transport encryption deployment konfiguratsiyasiga bog‘liq; bu E2EE emas.
# V2 message mutation trust boundary

Edit, delete va reaction endpointlari message ID’dan chatni topadi va har so‘rovda aktiv membershipni backendda qayta tekshiradi. Edit/delete faqat asl senderga ruxsat etiladi. Delete-for-everyone body’ni bo‘shatadi; clientdagi yashirilgan tugma authorization sifatida ishlatilmaydi.

