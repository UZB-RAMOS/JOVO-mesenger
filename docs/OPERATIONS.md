# Operations

## Lokal Windows ishga tushirish

```powershell
npm install
npm run dev:local
```

Web: `http://localhost:5173`; API health: `http://localhost:4000/api/health/live`.

## Release tekshiruvlari

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

## Database

```powershell
npm run db:generate
npm run db:deploy
npm run db:seed
```

Lokal PGlite development uchun. Production stack PostgreSQL, Redis, MinIO va worker bilan `infra/docker-compose.yml` orqali ishlaydi. Backup/restore avtomatizatsiyasi va alerting hali production-ready deb belgilanmagan.
