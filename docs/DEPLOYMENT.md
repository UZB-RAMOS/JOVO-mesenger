# Deployment

## Local Compose

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

API startup `prisma migrate deploy` bajaradi. Production’dan oldin `.env` dagi password/JWT secretlarni real secret manager qiymatlari bilan almashtiring.

## Service portlari

- web `5173`
- api/socket `4000`
- PostgreSQL `5432`
- Redis `6379`
- MinIO API `9000`, console `9001`

## Production checklist

- TLS reverse proxy va qat’iy CORS origin.
- Managed Postgres backup/PITR.
- Redis auth/TLS va Socket adapter.
- Private S3 bucket, lifecycle va malware scanner.
- Real OTP provider fail-closed.
- TURN faqat Phase 5 call slice’da.
- Horizontal deploydan oldin sticky session yoki Redis Socket adapter.
