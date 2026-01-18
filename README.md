# 3P-Doodle

A playground for Pencils and People. This project consists of a React frontend and a Spring Boot backend, integrated with Supabase for authentication and database management.

## 🚀 Recent Implementations

### Frontend (React + Vite + TypeScript)
- **Google OAuth Integration**: Implemented using Supabase Auth.
- **Authentication Flow**:
  - `LandingPage`: The entrance point showing the project vision.
  - `AuthSuccess`: A dedicated route (`/Home`) that users are directed to after successful authentication.
- **Client-Side Routing**: Added `react-router-dom` to manage navigation between the landing page and the authenticated home area.
- **Shared Layout System**: Created a `Layout` component that maintains consistent branding (Header, Decorative Cats, etc.) across different pages.
- **Smart Navigation**: 
  - Logged-in users stay on the Landing Page until they click "Start".
  - Clicking "Start" while logged in skips the OAuth flow and takes the user directly to `/Home`.
  - Manual visits to `/Home` are protected and redirect to `/` if the user is not authenticated.
- **URL Cleanup**: Implemented automatic removal of the OAuth hash fragment (`#`) from the address bar after successful login.
- **Environment Management**: Set up `.env` structure for Supabase configuration.

### Backend (Spring Boot + Java)
- **Database Connection**: Configured connection to Supabase PostgreSQL using connection pooling (Port 6543) and SSL.
- **Security Configuration**: 
  - Enabled OAuth2 Resource Server support to validate Supabase JWT tokens.
  - Configured CORS to allow the frontend to communicate with the API.
- **User Modeling**: Created JPA entities and repositories for user persistence.
- **Private Endpoints**: Implemented a `/Home/` controller that returns personalized messages to authenticated users.

## 🛠 Tech Stack
- **Frontend**: React 19, Vite, Framer Motion, Tailwind CSS, Supabase JS, React Router.
- **Backend**: Java 21, Spring Boot 4.0.1, Spring Data JPA, Spring Security (OAuth2 Resource Server).
- **Database**: PostgreSQL (via Supabase).

## 📝 Setup
1. **Frontend**: Create a `.env` file in the `Frontend/` directory with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. **Backend**: Provide `DB_PASSWORD` (either via environment variable or in `application.yml`).

NEXT STEPS:
1. USER PROFILE CREATION WITH ADDITIONAL DETAILS
2. CREATING THE ACUTAL CANVAS AND DRAWING FUNCTIONALITY
3. NEXT THINGS LATER