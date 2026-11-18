# JOVO Messenger

JOVO — Telegram’dan ilhomlangan axborot arxitekturasiga ega, lekin mustaqil nom, logo va kod bazasidan foydalanadigan real-time messenjer. Hozirgi vertikal kesim email/parol orqali ro‘yxatdan o‘tish, development OTP tasdiqlashi, sessiyalar, foydalanuvchi qidiruvi, bevosita chat, saqlanadigan xabarlar, typing va read holatlarini qamrab oladi.

> JOVO Telegram mahsuloti emas va Telegram tarmog‘iga ulanmaydi. Secret Chat/E2EE, xavfsiz qo‘ng‘iroq yoki production tayyorlik da’vo qilinmaydi.

## Texnologiyalar

- React 19 + TypeScript + Vite PWA
- NestJS 11 + Socket.IO
- PostgreSQL + Prisma 7
- Redis + BullMQ worker
- MinIO (Phase 3 media saqlash uchun tayyor infratuzilma)
- npm workspaces, Vitest, ESLint, Prettier

## Tez boshlash

Talablar: Node.js 24+ va npm 11+. Oddiy lokal ishlatish uchun Docker kerak emas.

### Docker’siz lokal rejim

```powershell
npm install
npm run dev:local
```

`dev:local` doimiy PGlite bazasini `.data/sfera-pg` ichida ishga tushiradi, migratsiya va seed’ni avtomatik bajaradi, so‘ng API hamda web’ni ochadi. Lokal xavfsiz development qiymatlari ham avtomatik beriladi; `.env` majburiy emas.

Web: `http://localhost:5173`  
API live health: `http://localhost:4000/api/health/live`  

Seed hisoblari:

- `alice@jovo.local` / `JOVO1234`
- `bob@jovo.local` / `JOVO1234`
- `sirojiddin@jovo.local` / `JOVO1234`

Seed’dagi Alice va Sirojiddin o‘rtasida bevosita chat avtomatik yaratiladi. Ikki akkauntni bitta brauzerda ishlatish uchun menyu → **Akkaunt qo‘shish** orqali Sirojiddin loginini qo‘shing.

Development ro‘yxatdan o‘tishida OTP javobda ko‘rsatiladi (`DEV_SHOW_VERIFICATION_CODE=true`). Production’da bu o‘chiriladi va real email/SMS provider hali ulanmagan.

Interfeys Telegram’ning axborot arxitekturasidan ilhomlangan, lekin JOVO nomi, logosi va rang tizimi mustaqil. `Ctrl/Cmd + K` chat qidiruviga fokus beradi; `Esc` ochiq menyu, qidiruv, emoji yoki profil panelini yopadi.

## To‘liq Docker stack

PostgreSQL, Redis, MinIO va worker bilan to‘liq infratuzilma uchun Docker Desktop kerak:

```powershell
Copy-Item .env.example .env
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
docker compose -f infra/docker-compose.yml ps
```

API konteyneri mavjud migratsiyalarni start oldidan qo‘llaydi. MinIO console: `http://localhost:9001`.

## Tekshiruvlar

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

## Ikki foydalanuvchili tekshiruv

1. Oddiy brauzerda Alice, inkognito yoki boshqa brauzerda Bob bilan kiring.
2. Alice’da **Yangi suhbat** orqali `@bob_jovo` ni toping.
3. `Salom` yuboring; Bob’da refreshsiz paydo bo‘lishi kerak.
4. Bob javob yozsin; typing va unread/read holatlarini ikki oynada kuzating.
5. Ikkala oynani yangilang: chat va xabarlar PostgreSQL’dan qayta yuklanadi.

## Foydali buyruqlar

```bash
npm run dev:web
npm run dev:api
npm run db:local
npm run db:migrate -- --name describe_change
npm run db:seed
npm run compose:down
```

Ma’lumotlarni butunlay o‘chirib lokal stackni reset qilish:

```bash
docker compose -f infra/docker-compose.yml down -v
```

Batafsil holat: [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md), funksiyalar: [docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md).
