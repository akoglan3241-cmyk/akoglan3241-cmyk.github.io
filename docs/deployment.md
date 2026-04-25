# Deployment

## Client

- copy [client/.env.example](/C:/benimdünyam/client/.env.example) to `.env`
- set `VITE_SERVER_URL`
- run `npm.cmd run build` in `client`

## Server

- copy [server/.env.example](/C:/benimdünyam/server/.env.example) to `.env`
- set `JWT_SECRET`
- set `DATABASE_URL` for production
- optional: set `ADMIN_BADGE_SECRET`
- run `npm.cmd test`
- run `npm.cmd run start` in `server`

## Database

- PostgreSQL is initialized by server startup
- in production, do not rely on memory fallback
- use a dedicated database and persistent volume/backups
