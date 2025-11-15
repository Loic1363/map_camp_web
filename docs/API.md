## MapCamp | API Reference

This document describes the HTTP interface exposed by the MapCamp Node.js/Express backend. The server issues JWTs for authentication and persists data in `db.sqlite`. Every endpoint returns JSON; errors follow a consistent `{ "error": "message" }` envelope.

---

### Environment

| Scenario            | Base URL example                 |
|---------------------|----------------------------------|
| Local development   | `http://localhost:3000`          |
| LAN deployment      | `http://<host-or-ip>:3000`       |
| Behind reverse proxy| `https://<public-hostname>/`     |

All URLs below are relative to the chosen base.

---

### Authentication & Headers

- Register/login endpoints are public.
- All marker endpoints require an `Authorization` header:  
  `Authorization: Bearer <jwt>`
- Tokens currently expire after 7 days (`jsonwebtoken` default in `server.js`).

---

## Auth API

### `POST /api/register`

Create a user account.

```json
Request:
{
  "email": "user@example.com",
  "password": "my-strong-password"
}
```

**Responses**

| Code | Body                                | Notes                                  |
|------|-------------------------------------|----------------------------------------|
| 200  | `{ "success": true }`               | Account created                        |
| 400  | `{ "error": "Email already used" }` | Email exists / missing fields          |
| 500  | `{ "error": "Server error" }`       | Unexpected failure                     |

---

### `POST /api/login`

Authenticate and obtain a JWT.

```json
Request:
{
  "email": "user@example.com",
  "password": "my-strong-password"
}

Response:
{
  "token": "<jwt>"
}
```

**Failure cases**

| Code | Body                               | Notes                        |
|------|------------------------------------|------------------------------|
| 400  | `{ "error": "Invalid credentials" }` | Wrong email/password        |
| 500  | `{ "error": "Server error" }`      | Database / hashing failure  |

---

## Marker API (JWT required)

The following routes require `Authorization: Bearer <jwt>`.

### `GET /api/markers`

List markers owned by the authenticated user.

```json
[
  {
    "id": 1,
    "user_id": 12,
    "lat": 48.8584,
    "lng": 2.2945,
    "name": "Eiffel Tower",
    "date": "2025-11-15"
  }
]
```

---

### `POST /api/markers`

Create a marker.

```json
Request:
{
  "lat": 48.8584,
  "lng": 2.2945,
  "name": "Eiffel Tower",
  "date": "2025-11-15"
}

Response:
{
  "id": 42,
  "user_id": 12,
  "lat": 48.8584,
  "lng": 2.2945,
  "name": "Eiffel Tower",
  "date": "2025-11-15"
}
```

Errors: `400` when `lat`/`lng` missing, `500` for database failures.

---

### `PUT /api/markers/:id`

Update an existing marker. All fields are required in the payload.

```json
Request:
{
  "lat": 48.8584,
  "lng": 2.2945,
  "name": "Updated name",
  "date": "2025-11-16"
}
```

**Responses**

| Code | Body                    | Notes                              |
|------|-------------------------|------------------------------------|
| 200  | `{ "success": true }`   | Update succeeded                   |
| 404  | `{ "error": "Marker not found" }` | ID missing or not owned     |
| 500  | `{ "error": "Server error" }`     | Database failure              |

---

### `DELETE /api/markers/:id`

Remove a marker.

| Code | Body                               | Notes                           |
|------|------------------------------------|---------------------------------|
| 200  | `{ "success": true }`              | Deletion succeeded              |
| 404  | `{ "error": "Marker not found" }`  | Marker does not exist / not owned |
| 500  | `{ "error": "Server error" }`      | Database failure                |

---

## Error Handling Summary

- `401` – missing token  
- `403` – invalid/expired token  
- `400` – validation errors (missing email, etc.)  
- `404` – marker not found for authenticated user  
- `500` – SQLite or application error

All responses include a JSON body with either a `token`, `success` flag, or `error` message (plus resource payloads for GET/POST).

---

## Operational Notes

- The `db.sqlite` file is created automatically at startup. Remove it to reset data.
- Update the `SECRET` constant in `server.js` before deploying.
- When hosting behind HTTPS, ensure the reverse proxy forwards the `Authorization` header intact.
- Add rate limiting and HTTPS termination before exposing publicly.
