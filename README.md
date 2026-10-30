# Barangay Resident and Request System (early version)

Stack: React (Vite) + Node/Express + MongoDB (Mongoose).

## Setup
1. Install Node.js (v18+) and have MongoDB ready (local MongoDB, or an Atlas connection string).
2. Open `server/.env` and set `MONGO_URI` (default is local MongoDB).

## Run (two terminals)
```
cd server
npm install
npm run dev        # API on http://localhost:5000
```
```
cd client
npm install
npm run dev        # App on http://localhost:5173
```
Open http://localhost:5173. Collections `residents` and `requests` appear in MongoDB Compass/Atlas (database `barangay`) once you add data.

## What works now
- Residents: add (with validation), list, edit, delete, search by name
- Requests: create linked to a resident, change status Pending -> Approved -> Released
- Dashboard counts (basic)

## Not built yet
Admin login, printable certificate/PDF, filters by purok/type/status, styling.
