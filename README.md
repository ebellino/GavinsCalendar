# Event Calendar

Finds events from multiple sources (currently Ticketmaster and SeatGeek) and lets you save the
ones you care about to your own calendar via a subscribable iCal feed.

This app is self-hosted: you run your own copy on your own computer. Nothing is sent to a
shared server other than the event-source APIs you search.

## Running it (no coding experience needed)

### 1. Get the code

Download this project as a ZIP (green "Code" button on GitHub → "Download ZIP") and unzip it
somewhere you'll remember, like your Desktop. (If you're comfortable with git, `git clone` works too.)

### 2. Install Docker Desktop

Download it from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
and install it. You can skip any sign-in prompt — it's not required to run this app.

**If Docker Desktop shows an error like "Docker Desktop is unable to start" the first time you
open it (common on Windows machines that haven't used WSL before):** open a terminal and run:

```bash
wsl --update
```

Then restart Docker Desktop. This installs/updates a required piece of Windows' Linux subsystem
that Docker depends on — it's a one-time fix.

### 3. Open a terminal in the project folder

- **Windows:** open the unzipped folder in File Explorer, then right-click inside it and choose
  "Open in Terminal" (or hold Shift and right-click, then "Open PowerShell window here").
- **Mac:** open the folder in Finder, then right-click and choose "New Terminal at Folder"
  (you may need to enable this once in Finder → Settings → Advanced).

### 4. Set up your config file

Find `.env.example` in the folder, make a copy of it, and rename the copy to `.env`. Open `.env`
in any text editor and fill in API keys — see the comments inside it for where to get free keys.

**You can skip this and run the app without any keys** — it'll start up fine, you just won't get
search results until at least one key is filled in.

### 5. Start it up

In the terminal you opened in step 3, run:

```bash
docker compose up -d
```

The first run downloads and builds everything, which can take a few minutes depending on your
internet connection — that's normal. Every run after that is fast (seconds).

### 6. Open the app

Go to [http://localhost:3000](http://localhost:3000) in your browser.

That's it. Your saved events and settings stay in a local database that persists even if you
stop the app, restart your computer, etc. — as long as you don't delete the project folder.

## Stopping it

```bash
docker compose down
```

This stops the app but keeps your data. Run `docker compose up -d` again any time to start it back up.

## Checking for updates

The app checks GitHub Releases on startup and shows a banner if a newer version exists.
To actually update: download the latest code the same way you did in step 1 (or `git pull`), then
from the project folder run:

```bash
docker compose up -d --build
```

## Security note

There's no login on this app — it's designed to run on your own computer for your own use.
By default it only listens on `localhost`, so nothing on your network can reach it. If you edit
`docker-compose.yml` to expose it more widely (e.g. to use it from your phone), anyone who can
reach that address can view and edit your saved events, since there's nothing to stop them.

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
