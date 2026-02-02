
Binary-Bees---Cafeteria-Management
Cafeteria Seat Reservation
A full-stack cafeteria management service: employees log in (w3 SSO / mock for dev), view seat availability, and reserve one seat per day. Single location, 100 seats, 1000 employees.

Tech stack
Backend: Node.js, Express, TypeScript, Prisma, MongoDB, Swagger (OpenAPI 3), JWT
Frontend: React, Vite, TypeScript
Tests: Jest (backend unit + API tests)
Prerequisites
Node.js 18+
npm
MongoDB (local or MongoDB Atlas free tier)
Quick start (localhost)
1. Install dependencies
cd cafeteria_seat_reservation
npm install
cd server
npm install
cd ..
cd client
npm install
cd ..
2. Backend: database and env
MongoDB: Prisma requires MongoDB to be run as a replica set (even with one node). Easiest options:

MongoDB Atlas (free tier): create a cluster, get connection string, use as DATABASE_URL. Atlas is already a replica set.
Local replica set: Run MongoDB as a single-node replica set (e.g. mongod --replSet rs0 then rs.initiate() in the shell). **
Ensure MongoDB is running, then:

cd server
cp .env.example .env
# Edit .env and set DATABASE_URL (e.g. mongodb://localhost:27017/cafeteria or your Atlas URI)
npx prisma db push
npx prisma generate
3. Run backend
cd server
npm run dev
Server: http://localhost:3001
Swagger UI: http://localhost:3001/api-docs

4. Run frontend (new terminal)
cd client
npm run dev
UI: http://localhost:5173 — use any email and name to “Sign in” (mock SSO).

5. Run backend tests
cd server
npm run test
Tests use an in-memory MongoDB replica set (via mongodb-memory-server), so you don’t need a real MongoDB running for tests. No extra setup required.

Project structure
cafeteria_seat_reservation/
├── server/                 # API
│   ├── prisma/
│   │   └── schema.prisma   # Employee, Reservation
│   └── src/
│       ├── config/        # constants, swagger
│       ├── lib/           # prisma client
│       ├── middleware/   # auth (JWT)
│       ├── routes/        # auth, reservations, availability, employees
│       ├── services/      # auth, reservation, availability
│       └── index.ts
├── client/                 # React UI
│   └── src/
│       ├── api/           # API client
│       ├── components/
│       ├── context/       # AuthContext
│       └── pages/         # Login, Dashboard
└── README.md
API summary
Method	Path	Description
POST	/api/auth/login	Login (mock: email + name → JWT)
GET	/api/availability?date=YYYY-MM-DD	Seat availability for date
POST	/api/reservations	Reserve seat (body: { "date": "YYYY-MM-DD" })
GET	/api/reservations	My reservations (optional ?date=)
DELETE	/api/reservations/:id	Cancel my reservation
GET	/api/employees/me	Current employee profile
Protected routes use header: Authorization: Bearer <token>.

Business rules
One reservation per employee per day.
Maximum 100 reservations per date (seat capacity).
Employee and reservation data stored in DB (Prisma + MongoDB). Easy to inspect collections in MongoDB Compass or Atlas.
w3 SSO (production)
w3 SSO is integrated. The app supports both mock login (dev) and w3 OIDC:

Mock login: POST /api/auth/login with email and name (or use “Demo user” on the login page).
w3 SSO: User clicks “Sign in with w3 SSO” → GET /api/auth/w3/login (redirects to w3) → w3 redirects to GET /api/auth/w3/callback → app finds/creates Employee by w3Id, issues JWT, redirects to frontend with token.
Setup:

Register your app in w3 SSO Provisioner (OIDC, Authorization Code).
In the provisioner, set Redirect URI to http://localhost:3001/api/auth/w3/callback (must match W3_REDIRECT_URI in .env exactly).
In server/.env, set:
W3_CLIENT_ID, W3_CLIENT_SECRET (from provisioner)
W3_AUTH_URL, W3_TOKEN_URL (e.g. preprod: https://preprod.login.w3.ibm.com/oidc/endpoint/default/authorize and .../token)
W3_REDIRECT_URI = same as in provisioner
CLIENT_URL = frontend URL (e.g. http://localhost:5173) for redirect after login
Cloud deployment
1. Database
Use MongoDB Atlas (or another hosted MongoDB). Set DATABASE_URL in your server env to the production connection string.
From the server/ folder run once: npx prisma db push and npx prisma generate (e.g. in the deploy step or a one-off job).
2. Backend (Node/Express)
Build: cd server && npm ci && npm run build → output in dist/.
Run: node dist/index.js (or npm start). Ensure Node 18+.
Env vars (set in your host’s env or dashboard):
DATABASE_URL – MongoDB connection string
JWT_SECRET – strong secret for production
PORT – port the app listens on (e.g. 3001 or host default)
NODE_ENV=production
For w3 SSO: W3_CLIENT_ID, W3_CLIENT_SECRET, W3_AUTH_URL, W3_TOKEN_URL, W3_REDIRECT_URI, CLIENT_URL (see below)
Where to host: Railway, Render, IBM Cloud Foundry, Fly.io, or any Node host. Point the service at the server/ directory and use the build/start commands above.

3. Frontend (React/Vite)
Option A – Same origin (recommended for simplicity)
Serve the built frontend from the Express server so /api and the app share one origin:

Build: cd client && npm ci && npm run build → output in client/dist/.
In the backend, serve client/dist as static files and add a fallback to index.html for client-side routing (see your Express docs or add express.static + catch-all).
No CORS or API URL config needed; the app uses relative /api requests.
Option B – Separate host (e.g. Vercel, Netlify)

Deploy the client/ (build: npm run build, publish dist/). The client uses relative /api; if frontend and backend are on different domains, you must either proxy /api to the backend on the frontend host or add an API base URL (e.g. VITE_API_URL) in the client and use it for requests.
Ensure the backend allows your frontend origin in CORS (the app uses cors({ origin: true }); for production you may set origin to your frontend URL).
4. w3 SSO in production
In the w3 SSO Provisioner, add the production redirect URI, e.g. https://your-api.example.com/api/auth/w3/callback.
In the server env set:
W3_REDIRECT_URI = that exact production callback URL
CLIENT_URL = production frontend URL (e.g. https://your-app.example.com) so the callback redirects users back to the right place after login.
5. Checklist
Item	Action
DB	DATABASE_URL → Atlas (or other), run npx prisma db push once
Secrets	JWT_SECRET (and w3 secrets) set in production env only
w3	Production redirect URI registered; W3_REDIRECT_URI and CLIENT_URL set
CORS	If frontend and backend are on different domains, restrict origin to your frontend URL
License
Internal / company use.
