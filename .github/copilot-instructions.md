# Copilot Instructions for GR2 Codebase

## Big Picture Architecture
- **Monorepo Structure**: Two main folders: `be/` (Node.js backend) and `fe/` (React + Vite frontend).
- **Backend (`be/`)**: Express app with models for `category`, `order`, `product`, and `user`. Routes are split into `admin.js`, `auth.js`, and `shop.js`. Auth middleware is in `middlewares/auth.js`. Static assets (images, avatars) are served from `public/`.
- **Frontend (`fe/`)**: React app using Vite. Pages are organized by feature (`admin`, `auth`, `User`). Shared layouts and assets are in `src/pages/layout/` and `src/assets/`. Service files (`src/services/`) handle API communication.

## Developer Workflows
- **Frontend**:
  - Start dev server: `npm run dev` (in `fe/`)
  - Build: `npm run build` (in `fe/`)
  - Lint: `npm run lint` (in `fe/`)
- **Backend**:
  - Start server: `node app.js` or `npm start` (if defined in `be/package.json`)
  - Seed data: `node seed.js` (in `be/`)

## Project-Specific Conventions
- **API Communication**: Frontend uses `src/services/http.js`, `auth.js`, and `shop.js` for backend requests. These files centralize API logic and error handling.
- **Routing**: Frontend routes are defined in `src/app/routes.jsx`. Backend routes are split by domain in `be/routes/`.
- **Admin Features**: Admin pages are in `src/pages/admin/` and backend admin routes in `be/routes/admin.js`.
- **Static Assets**: Images for products and avatars are stored in `be/public/images/products/` and `be/public/avatars/`.

## Integration Points & Dependencies
- **Frontend**: Uses Vite, React, and ESLint. See `fe/package.json` for dependencies.
- **Backend**: Uses Express and Mongoose (implied by model structure). See `be/package.json` for dependencies.
- **Cross-Component Communication**: API endpoints are consumed via service files in the frontend. Backend exposes REST endpoints via Express routes.

## Key Files & Directories
- `be/app.js`: Main backend entry point
- `be/models/`: Mongoose models
- `be/routes/`: Express route handlers
- `be/middlewares/auth.js`: Auth middleware
- `be/seed.js`: Data seeding script
- `fe/src/pages/`: React pages by feature
- `fe/src/services/`: API service logic
- `fe/src/app/routes.jsx`: Frontend route definitions
- `fe/public/`: Frontend static assets

## Example Patterns
- **Service Pattern**: Frontend API calls are abstracted in `src/services/`. Example: `shop.js` for shop-related endpoints.
- **Admin Separation**: Admin features are separated in both frontend (`src/pages/admin/`) and backend (`routes/admin.js`).
- **Middleware Usage**: Auth logic is centralized in `be/middlewares/auth.js` and applied to protected routes.

---
_If any section is unclear or missing important details, please provide feedback to improve these instructions._
