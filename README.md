# Mini Google Calendar

A minimal calendar application with event CRUD operations.

## Architecture

```
Browser → Nginx (static + reverse proxy) → ASP.NET Core API → MongoDB
```

| Service  | Technology              | Port  |
|----------|-------------------------|-------|
| Frontend | SvelteKit + DaisyUI     | 5174  |
| Backend  | ASP.NET Core 8          | 5000  |
| Database | MongoDB 7               | 27017 |

## Getting Started

```bash
docker compose up --build
```

Open **http://localhost:5174** in your browser.

## API Endpoints

| Method | URL                | Description    |
|--------|--------------------|----------------|
| GET    | /api/events        | List events    |
| POST   | /api/events        | Create event   |
| GET    | /api/events/{id}   | Get by ID      |
| PUT    | /api/events/{id}   | Update event   |
| DELETE | /api/events/{id}   | Delete event   |
