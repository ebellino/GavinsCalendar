# Event Calendar

Finds events from multiple sources (Ticketmaster, Eventbrite, Meetup) and lets you save the
ones you care about to your own calendar via a subscribable iCal feed.

This app is self-hosted: you run your own copy on your own computer. Nothing is sent to a
shared server other than the event-source APIs you search.

## Running it (no coding experience needed)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and make sure it's running.
2. Copy `.env.example` to `.env` and fill in API keys (see comments in that file for where to get free keys).
3. From this folder, run:

   ```bash
   docker compose up -d
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

That's it. Your data stays in a local database that persists even if you stop and restart.

## Checking for updates

The app checks GitHub Releases on startup and shows a banner if a newer version exists.
To actually update, pull the latest code and rebuild:

```bash
git pull
docker compose up -d --build
```

## Local development (without Docker)

```bash
npm install
docker compose up -d db   # just the database
npx prisma migrate dev     # apply schema to your local db
npm run dev
```

## Stack

Next.js (TypeScript) + PostgreSQL + Prisma + Docker Compose. Event sources are implemented
as pluggable adapters in `src/lib/sources/`.
