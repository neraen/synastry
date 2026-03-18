# AstroMatch - Development Setup

## Prerequisites

- Docker Desktop (running)
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Physical phone with Expo Go app

## Quick Start

### 1. Start Backend

```bash
# From project root
./scripts/start-dev.sh
```

Or manually:
```bash
docker compose up -d
```

### 2. Get Your Local IP

```bash
ifconfig | grep "inet " | grep 192
```

Example output: `inet 192.168.1.12 netmask...`

### 3. Configure Mobile App

Edit `app/.env`:
```
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000
```

### 4. Start Mobile App

```bash
cd app
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

## Services

| Service | URL | Description |
|---------|-----|-------------|
| Backend API | http://localhost:8000 | Symfony 7 API |
| MySQL | localhost:3307 | Database |

## API Endpoints

### Authentication (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register a new user |
| POST | `/api/login` | Login and get JWT token |
| POST | `/api/token/refresh` | Refresh JWT token |

### Protected (Require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/me` | Get current user profile |

### Example: Register
```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Example: Login
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user@example.com","password":"password123"}'
```

### Example: Access Protected Endpoint
```bash
curl http://localhost:8000/api/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Useful Commands

```bash
# View backend logs
docker compose logs -f php

# Stop all containers
docker compose down

# Rebuild containers
docker compose up -d --build

# Access PHP container
docker compose exec php bash

# Run Symfony console
docker compose exec php php bin/console

# Create database migration
docker compose exec php php bin/console make:migration

# Run migrations
docker compose exec php php bin/console doctrine:migrations:migrate
```

## Troubleshooting

### Phone can't connect to backend

1. Ensure both devices are on the same WiFi network
2. Check your firewall allows port 8000
3. Verify the IP in `app/.env` matches your Mac's IP
4. Test with: `curl http://YOUR_IP:8000` from terminal

### CORS errors

The backend accepts requests from:
- `localhost`
- `127.0.0.1`
- Any `192.168.x.x` IP

If needed, update `backend/.env`:
```
CORS_ALLOW_ORIGIN='^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:[0-9]+)?$'
```

### Database connection issues

```bash
# Check if MySQL is healthy
docker compose ps

# View MySQL logs
docker compose logs db

# Reset database
docker compose down -v
docker compose up -d
```