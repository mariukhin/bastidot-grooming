# Bastidot Grooming

Web platform for the Bastidot pet grooming salon — a marketing site with a full online booking flow, service and groomer catalogs, and a grooming academy section.

The repository is a monorepo containing a Next.js frontend and **two** interchangeable REST API implementations that expose the same contract: one in Go (clean architecture) and one in Node.js (Express 5).

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [1. Database](#1-database)
    - [2. Backend — Go](#2-backend--go)
    - [3. Backend — Node](#3-backend--node)
    - [4. Frontend](#4-frontend)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Available scripts](#available-scripts)
- [License](#license)

---

## Features

**Booking**
- Multi-step booking modal: breed & services → extra services → groomer → date and time → contact form → confirmation
- Busy-slot lookup per groomer so unavailable times are filtered out of the calendar
- Live order summary that updates as the client moves through the steps

**Catalog**
- Breeds, services priced per breed, and groomer profiles
- Team, reviews, publications, and contacts sections
- Academy page with grooming courses

**Accounts**
- Email/password sign-up and login
- Google OAuth sign-in
- JWT access tokens with refresh-token rotation, protected profile endpoint

---

## Tech stack

| Layer | Stack |
| --- | --- |
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, SCSS modules, Zustand, react-hook-form + yup, dayjs, `@react-oauth/google`, SimpleBar |
| **Backend (Go)** | Go 1.23, chi v5, MongoDB driver, `golang-jwt`, Viper, testify + mockery, Docker / docker-compose |
| **Backend (Node)** | Node 22+, Express 5, MongoDB driver, native TypeScript via `--experimental-strip-types`, pino-http, `node --test` |
| **Database** | MongoDB 7 |
| **Tooling** | Yarn 4 (Berry), ESLint 9, Prettier, EditorConfig |

---

## Repository structure

```
.
├── frontend/            # Next.js 15 application
│   └── src/
│       ├── api/         # fetch clients for the REST API
│       ├── app/         # App Router pages, layout, error/loading states
│       ├── components/  # UI blocks — booking modal, header, services, team, ...
│       ├── hooks/       # use-confirm-modal, use-focus-trapping
│       ├── store/       # Zustand stores (user, order, groomer)
│       ├── styles/      # SCSS variables, breakpoints, scrollbar
│       └── utils/       # constants, helpers, mocks
│
├── backend/             # Go API — clean architecture
│   ├── api/             # controllers, routes, JWT middleware
│   ├── bootstrap/       # app wiring, env, database, indexes
│   ├── cmd/             # entry point
│   ├── domain/          # entities, DTOs, interfaces, generated mocks
│   ├── repository/      # MongoDB data access
│   ├── usecase/         # business logic
│   └── mongo/           # MongoDB abstraction + mocks
│
└── backend-node/        # Node/Express API — feature-first
    └── src/
        ├── features/    # auth, breed, groomer, order, pet, profile, service
        ├── shared/      # config, db, cors, jwt, password, logger, middleware
        ├── app.ts       # app assembly (separated from server start for tests)
        └── server.ts    # entry point
```

Each backend owns its own concerns end to end — controller, business logic, and data access — so either one can serve the frontend on its own.

**Go backend layering**

```
Router → Controller → Usecase → Repository → MongoDB
                ↑          ↑
             domain interfaces (mockable)
```

**Node backend layering**

```
Router → Controller → Service → MongoDB collection
```

---

## Getting started

### Prerequisites

- Node.js **22+** and Yarn **4**
- Go **1.23+** (only if you run the Go backend)
- MongoDB 7, or Docker with docker-compose

### 1. Database

The quickest path is the compose file shipped with the Go backend, which starts MongoDB alongside the API:

```bash
cd backend
cp .env.example .env
docker compose up -d
```

To run only MongoDB:

```bash
docker run -d --name mongodb -p 27017:27017 mongo:7
```

Seed data for groomers is available at `backend/groomers_seed.json`.

### 2. Backend — Go

```bash
cd backend
cp .env.example .env      # then fill in DB and JWT values
go mod download
go run cmd/main.go
```

The API listens on `SERVER_ADDRESS` (`:8080` by default).

Run the tests:

```bash
go test ./...
```

### 3. Backend — Node

```bash
cd backend-node
cp .env.example .env      # DB_HOST, DB_USER, DB_PASS, DB_NAME, token secrets
yarn install
yarn dev                  # watch mode
```

The API listens on `PORT` (`8081` by default) and exposes `GET /health` for liveness checks. Configuration is validated at startup — a missing required variable fails the process immediately rather than at the first request.

```bash
yarn typecheck
yarn test
```

### 4. Frontend

```bash
cd frontend
yarn install
yarn dev
```

The app runs at [http://localhost:3000](http://localhost:3000) and expects an API on the port configured in `src/api/*.ts`.

---

## Environment variables

Both backends read the same set of variables.

| Variable | Description | Default |
| --- | --- | --- |
| `APP_ENV` | Runtime environment | `development` |
| `SERVER_ADDRESS` | Listen address (Go) | `:8080` |
| `PORT` | Listen port | `8080` / `8081` |
| `CONTEXT_TIMEOUT` | Request timeout, seconds | `2` |
| `DB_HOST` | MongoDB host | — |
| `DB_PORT` | MongoDB port | `27017` |
| `DB_USER` | MongoDB user | — |
| `DB_PASS` | MongoDB password | — |
| `DB_NAME` | Database name | — |
| `ACCESS_TOKEN_SECRET` | Access token signing secret | — |
| `REFRESH_TOKEN_SECRET` | Refresh token signing secret | — |
| `ACCESS_TOKEN_EXPIRY_HOUR` | Access token lifetime, hours | `2` |
| `REFRESH_TOKEN_EXPIRY_HOUR` | Refresh token lifetime, hours | `168` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | — |

Never commit a real `.env` — keep secrets out of version control and use `.env.example` as the template.

---

## API reference

### Public

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/public/signup` | Register a new user |
| `POST` | `/public/login` | Log in with email and password |
| `POST` | `/public/login/google` | Log in with a Google ID token |
| `POST` | `/public/refresh` | Exchange a refresh token for a new access token |
| `GET` | `/breed` | List breeds |
| `GET` | `/breed/:id` | Get a single breed *(Node)* |
| `POST` | `/breed` | Create a breed |
| `POST` | `/service` | List services for a given `breedId` |
| `GET` | `/groomer` | List groomers |
| `POST` | `/pet` | Create a pet *(Node)* |
| `GET` | `/pet`, `/pet/:id` | List or fetch pets *(Node)* |
| `POST` | `/order` | Create a booking |
| `GET` | `/order/busy-slots` | Busy slots for `groomerId` within `from`–`to` |
| `GET` | `/health` | Health check *(Node)* |

### Protected — requires `Authorization: Bearer <access_token>`

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/protected/profile` | Current user's profile |

---

## Available scripts

**frontend**

| Script | Description |
| --- | --- |
| `yarn dev` | Dev server + open the browser |
| `yarn build` / `yarn start` | Production build and serve |
| `yarn lint` / `yarn lint:fix` | ESLint |
| `yarn format` | Prettier across the project |

**backend-node**

| Script | Description |
| --- | --- |
| `yarn dev` | Watch mode with `.env` loaded |
| `yarn start` | Run the server |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn test` | Native Node test runner |

---

## License

© Bastidot Grooming, 2026. All rights reserved. See [LICENSE](LICENSE).