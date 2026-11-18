# 🌸💪 HaruKaizen (春改善)

[![Node.js](https://img.shields.io/badge/Node.js-v22%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16_Turbopack-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React Native](https://img.shields.io/badge/Expo-SDK_52-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17_Alpine-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7_Alpine-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

> **"Physical transformation is not a single event, but the compound sum of daily continuous improvements."**  
> *Haru* (春, spring and renewal) meets *Kaizen* (改善, continuous improvement).

**HaruKaizen** is a self-hosted, sovereign health and fitness tracking OS:
- 🚫 **No subscriptions, no paywalls**: all features (macro calculator, custom recipes, gym logger, telemetry) are unlocked.
- 🔒 **Data ownership**: your PostgreSQL database stays on your own machine/server.
- 🥗 **Pure Calorie Counter**: deterministic metabolic formulas (Mifflin-St Jeor) with safety guardrails for minors, pregnancy, and lactation.

> [!CAUTION]
> ### ⚠️ Medical and Healthcare Disclaimer
> **HaruKaizen is personal tracking software and does not provide medical diagnoses, therapies, or dietary prescriptions.**  
> Energy expenditure estimations and nutritional targets are theoretical models and **do not replace licensed healthcare providers, physicians, or registered dietitians**.

---

## 📊 Project Status

| Module | Channel | Status | Maturity Notes |
|---|---|:---:|---|
| **Backend API (`apps/api`)** | REST NestJS | **Beta** | TDEE engine, biomechanical gym expenditure, recipes, dynamic meal slots, Open Food Facts rate limiter, data export/deletion. |
| **Frontend Web (`apps/web`)** | Next.js 16 | **Beta** | Telemetry charts, dynamic meal manager, recipe & quick add modals, live gym session logger. |
| **Mobile App (`apps/mobile`)** | React Native / Expo | **Alpha** | Barcode scanner (via server proxy), diary view, AsyncStorage outbox queue. Push-only sync (pull sync and local SQLite planned). |
| **Shared Core (`packages/shared`)** | TypeScript | **Stable** | Deterministic formulas for TDEE, macro distribution, and recipe nutrition calculator. |

---

## 🚀 Quickstart (Local Development)

```bash
# 1. Clone repository
git clone https://github.com/mix_max111/harukaizen.git
cd harukaizen

# 2. Install monorepo dependencies
npm install

# 3. Copy environment configuration
cp .env.local.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env

# 4. Start PostgreSQL and Redis via Docker Compose
docker compose -f docker-compose.local.yml up -d postgres redis

# 5. Initialize database & seed demo data
npm run db:generate
npm run db:push
npm run db:seed
npm run db:dedup-foods

# 6. Run web & backend concurrently
npm run dev
```

- Web Dashboard: `http://localhost:3000`
- API Core: `http://localhost:8002/api/v1`

---

## 🛡️ Privacy & Outgoing Network Flows
- **Open Food Facts**: barcode lookup and product search queries are forwarded to `world.openfoodfacts.org` (ODbL license).
- **USDA FoodData Central**: fallback search for US foods.
- **AI Providers (BYOK)**: meal images (EXIF stripped) and macro prompts sent to OpenAI/Anthropic/Gemini only if user explicitly enters their personal API key.

For licensing options, see [docs/license-options.md](file:///c:/Users/Antonino/Documents/HaruKaizen/docs/license-options.md).

