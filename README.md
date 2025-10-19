# Dispatch POC

This repository contains a proof‑of‑concept that simulates the core loop of an on‑demand mobility dispatcher. It ships with a NestJS backend and a React (Vite) front‑end console that let you seed drivers and riders, trigger trip requests, watch pooling/matching in real time, and walk offers through their lifecycle.

---

## Table of Contents

1. [System Overview](#system-overview)  
2. [High‑Level Flow](#high-level-flow)  
3. [Backend Architecture](#backend-architecture)  
4. [Frontend Console](#frontend-console)  
5. [Environment Configuration](#environment-configuration)  
6. [Running the Apps](#running-the-apps)  
7. [Operational Notes](#operational-notes)  
8. [Extending the Prototype](#extending-the-prototype)

---

## System Overview

```
┌───────────┐        ┌────────────┐        ┌────────────┐        ┌────────────┐
│ Rider App │ ─────► │ Dispatch   │ ─────► │ Pooling &  │ ─────► │ Offer      │
└───────────┘        │ Controller │        │ Matching   │        │ Orchestr.  │
                     └────────────┘        └────────────┘        └────────────┘
                          ▲                       │                    │
                          │                       ▼                    ▼
                    ┌────────────┐         ┌────────────┐        ┌────────────┐
                    │ Telemetry  │ ◄────── │ Live Map & │ ◄──────│ Driver App │
                    └────────────┘         │ Console    │        └────────────┘
```

* **Backend (NestJS)** exposes CRUD APIs for drivers/riders/trips, manages the pooling & matching pipeline, orchestrates offer lifecycles, and logs telemetry in memory.
* **Frontend (React)** provides an operator console: manage entities, launch synthetic trips, monitor pooling/matching, act on offers, and view telemetry. Live map and generator pages help with quick demos.

---

## High-Level Flow

This is a condensed walk‑through of the flow implemented in the codebase. It mirrors the original sequence diagram.

1. **Trip Intake**
   * Frontend posts to `POST /trips` with rider + pickup/dropoff.
   * Trips service indexes pickup and dropoff into H3 cells (default resolution 8).
   * Trip is queued with status `queued` and immediately passed to the pooling service.

2. **Pooling**
   * `PoolingService.queueTrip` bins trips by pickup H3 index.
   * Operator can either wait for the auto refresh or press **Release All** / **Release** on a specific pool in the UI (this calls `POST /dispatch/pools/flush` with optional `h3Index`).
   * Once flushed, the pool is deleted and the trips are handed to the matching service.

3. **Matching**
   * `MatchingService.solve` pulls available drivers within the pool’s H3 cell and neighbors (`gridDisk` at `k=1`).
   * Builds a cost matrix (distance + rating blend), runs a Hungarian assignment, and guards against selecting the same driver twice in the same batch.
   * Returns assignments plus a detailed scorecard for the UI.
   * Trips not assigned are re‑queued automatically into pooling.

4. **Offers**
   * `OffersService.createForMatching` creates one pending offer per assignment.
   * Drivers are moved from `available` to `reserved` immediately so other pools cannot race them.
   * If a driver already has a pending offer, the trip is re‑queued instead of issuing another offer.
   * Offers carry an expiry timestamp (`OFFER_TIMEOUT_SECONDS` env var).
   * Accepting an offer sets trip status to `assigned` and driver to `busy`.
   * Decline/timeout releases the driver back to `available` and re‑queues the trip.

5. **Telemetry**
   * Each pooling, matching, and offer event emits to the in‑memory telemetry service.
   * The Trips page polls `/dispatch/telemetry` to display the latest events.

6. **Live Map**
   * Polls `/drivers` and `/trips` every 5 seconds.
   * Only drivers with status `available` are rendered; the summary cards show both available and busy counts.
   * Active trips display pickup markers.

---

## Backend Architecture

### Modules

| Module            | Responsibilities                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `drivers`         | CRUD for drivers, bulk generator (random polygon sampling), H3 indexing of driver location.        |
| `riders`          | CRUD for riders.                                                                                    |
| `trips`           | Trip intake, update, bulk generator, conversion to `PoolEntry`, requeue helper.                    |
| `dispatch`        | Pooling and matching services, telemetry service, dispatch controller endpoints.                   |
| `offers`          | Offer creation, timeout handling, accept/decline endpoints; enforces driver reservation semantics. |
| `common`          | H3 helper service (configurable resolution via `H3_RESOLUTION`).                                    |

### Key Services

* **PoolingService**
  * Maintains `Map<h3Index, PoolBatch>`.
  * `queueTrip` merges trips into the batch and emits `trip_queued` telemetry.
  * `flush` runs matching for each batch (or a targeted batch), emits telemetry, creates offers, deletes the batch, and re‑queues unmatched trips.

* **MatchingService**
  * Pulls drivers in the originating H3 cell and its `gridDisk` neighbors.
  * Cost = `0.5 * normalised_distance + 0.5 * rating_score` (configurable place for weighting).
  * Uses the Hungarian algorithm to solve the matrix; drivers already claimed within the batch are skipped, marking the trip as unassigned.

* **OffersService**
  * Before generating an offer: expires any existing offers for the trip and sets the driver to `reserved` (if available).
  * Offers contain `expiresAt`; timers transition expired offers to `expired`, release the driver, and re‑queue the trip.
  * Accept/decline resets driver/trip status appropriately and clears timers.

* **TelemetryService**
  * In‑memory queue limited to 200 latest events for lightweight auditing.

### Environment Variables (`back/.env`)

| Variable              | Default | Description                                  |
| --------------------- | ------- | -------------------------------------------- |
| `H3_RESOLUTION`       | `8`     | Global H3 resolution for driver/trip cells.  |
| `OFFER_TIMEOUT_SECONDS` | `30` | Offer expiry window used by OffersService.   |
| `MONGODB_URI`         | -       | Connection string for MongoDB (dotenv).      |

---

## Frontend Console

Page summary:

| Page                    | Features                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Overview**            | High-level summary cards describing the prototype.                                                             |
| **Drivers**             | CRUD form with map picker, status selector, rating, bulk delete button, table listing H3 indexes.              |
| **Riders**              | CRUD form with pickup picker, table of riders.                                                                 |
| **Trips**               | Trip intake form with pickup/dropoff pickers, delete-all button, tables for trips/pending offers/matching results. Pooling window allows releasing all pools or per H3 pool release.  |
| **Offers**              | Placeholder page describing future metrics (detailed monitoring lives on Trips page currently).                |
| **Telemetry**           | Lists telemetry events (batch flushes, matching results).                                                      |
| **Live Map**            | Map showing available drivers (blue) and active trip pickups (orange), with counters for available/busy drivers and active trips. |
| **Driver Generator**    | Draw polygon to seed synthetic drivers; displays H3 lattice overlays.                                          |
| **Trip Generator**      | Draw polygon, optionally select rider subset, seed trips; shows H3 lattice overlays.                           |

### React Query Hooks

* `useDriversQuery`, `useTripsQuery` accept optional query options (used for polling in the Live Map).
* `useFlushPoolsMutation` accepts `{ h3Index?: string }` to flush either all pools or a single H3 pool.

### Routing

* All pages live under the `AppLayout` Navigation (Overview, Live Map, Drivers, Riders, Trips, Offers, Telemetry, Generators).

---

## Environment Configuration

### Backend (`back/.env.example`)
```
H3_RESOLUTION=8
OFFER_TIMEOUT_SECONDS=30
MONGODB_URI=mongodb://localhost:27017/dispatch_poc
```

### Frontend (`front/.env.example`)
```
VITE_API_BASE_URL=http://localhost:3000
VITE_H3_RESOLUTION=8
```

Copy the examples to `.env` in each folder and tweak as needed.

---

## Running the Apps

1. **Install Dependencies**
   ```bash
   # backend
   cd back
   npm install

   # frontend
   cd ../front
   npm install
   ```

2. **Start Backend**
   ```bash
   cd back
   npm run start:dev
   ```
   Ensure MongoDB is running locally (or update `MONGODB_URI`).

3. **Start Frontend**
   ```bash
   cd ../front
  npm run dev
   ```

4. **Navigate**
   * Frontend is served at `http://localhost:5173` (default Vite port).
   * Backend Swagger (optional) is available at `http://localhost:3000/docs` if Swagger module is enabled.

---

## Operational Notes

* **Driver Reservation:** Once an offer is issued, the driver moves to `reserved`. Only upon acceptance do they become `busy`; decline/timeout resets them to `available`. Matching only considers drivers whose status is `available`.
* **Trip Requeueing:** Any trip skipped during matching/offer creation (e.g., driver already reserved) is immediately queued for the next pooling cycle.
* **Telemetry Size:** In-memory telemetry is capped to 200 entries; it's purely for demo inspection.
* **Concurrency:** The current “reservation” approach avoids double booking across concurrent pools but does not yet use database transactions. For production, consider Mongo transactions or explicit status‑update guards.

---

## Extending the Prototype

Ideas for future iterations:

1. **Persistent Telemetry:** Swap the in-memory queue for a real store (e.g., Mongo collection) and add pagination/filtering on the frontend.
2. **Configurable Strategies:** Externalize cost weights, SLA thresholds, and pooling intervals via API + UI.
3. **Driver Notifications:** Simulate driver responses via a dedicated page or WebSocket notifications.
4. **Analytics Dashboard:** Build charts for offer acceptance, timeout rates, and lag metrics using the telemetry feed.
5. **Geo Enhancements:** Integrate actual routing/ETA service (e.g., OSRM) to replace the simple Haversine distance blend.

Use this README as a primer when opening new conversations—the sections above provide the necessary context about architecture, control flow, and how to operate the prototype end-to-end.
