# ContentAI Backend API

AI-Powered Content Creation Studio - Backend API Service

## Tech Stack
- **Runtime:** Node.js + Express.js
- **Language:** TypeScript
- **Database:** Prisma ORM + SQLite (easily switchable to PostgreSQL)
- **AI:** z-ai-web-dev-sdk

## API Endpoints

### Auth
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth` - List users

### Content
- `GET /api/content?userId=xxx&type=xxx` - Get user content
- `GET /api/content/:id` - Get single content
- `POST /api/content` - Create content
- `PUT /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content

### AI
- `POST /api/ai/generate` - Generate content (blog, social, ad, email, product, seo)
- `POST /api/ai/improve` - Improve content (improve, rewrite, expand, shorten, grammar)

### Health
- `GET /api/health` - API health check

## Setup

```bash
npm install
npx prisma db push
npm run dev
```

## Environment Variables

```
DATABASE_URL="file:./dev.db"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

## Deployment

This backend can be deployed on:
- **Render** (Free tier available)
- **Railway** (Free tier available)
- **Fly.io**
- **Any VPS** (DigitalOcean, AWS EC2, etc.)

For production, switch SQLite to PostgreSQL by updating `DATABASE_URL` and changing the Prisma provider.
