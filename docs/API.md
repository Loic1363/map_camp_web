# MapCamp API Reference

This document describes the HTTP API exposed by the MapCamp backend.

The backend is a Node.js + Express server with a SQLite database.

---

## Base URLs

During development you will typically use one of:

- **Local development (Windows)**  
  http://localhost:3000

- **Home network (Debian server)**  
  http://<DEBIAN_IP>:3000  
  Example: http://192.168.1.30:3000

- **Behind Nginx (optional HTTPS)**  
  https://<DEBIAN_HOST_OR_IP>/  
  Example: https://192.168.1.30/

---

# Authentication

Authentication uses **JSON Web Tokens (JWT)**.

## Login response example

```json
{
"token": "<jwt-token-here>"
}
```

### Authorization header (required for protected routes)

Authorization: **Bearer <jwt-token-here>**

If the token is missing or invalid, the server returns:

- **401 Unauthorized**
- **403 Forbidden**

### Error Format

All API errors follow this structure:

```json
{
"error": "Human readable error message"
}
```
---

# Auth Endpoints

---

## POST /api/register

Create a new user account.

### Request Body

```json
{
"email": "user@example.com"
}
```

### Responses

```bash 
200 OK
```
---

```json
{
"success": true
}
```

```bash 
400 Bad Request
```
---

```json
{
"error": "Email already used"
}
```

#### 500 Internal Server Error

```json
{
"error": "Server error"
}
```

---

## POST /api/login

Authenticate a user and return a JWT token.

### Request Body

```json
{
"email": "user@example.com",
"password": "my-strong-password"
}
```

### Responses

#### 200 OK

```json
{
"token": "<jwt-token-here>"
}
```

**400 Bad Request**

```json
{
"error": "Invalid credentials"
}
```

**500 Internal Server Error**

```json
{
"error": "Server error"
}
```

---

# Marker Endpoints

All marker endpoints require a valid JWT token:

Authorization: **Bearer <jwt-token-here>**

---

## GET /api/markers

Return all markers belonging to the authenticated user.

### Response

```json
[
{
"id": 1,
"user_id": 1,
"lat": 48.8584,
"lng": 2.2945,
"name": "Eiffel Tower",
"date": "2025-11-15"
}
]
```

---

## POST /api/markers

Create a new marker.

### Request Body

```json
{
"lat": 48.8584,
"lng": 2.2945,
"name": "Eiffel Tower",
"date": "2025-11-15"
}
```

### Response

```json
{
"id": 1,
"user_id": 1,
"lat": 48.8584,
"lng": 2.2945,
"name": "Eiffel Tower",
"date": "2025-11-15"
}
```

---

## PUT /api/markers/:id

Update an existing marker.

### Request Body

```json
{
"lat": 48.8584,
"lng": 2.2945,
"name": "Updated name",
"date": "2025-11-16"
}
```

### Responses

**200 OK**

```json
{
"success": true
}
```

**404 Not Found**

```json
{
"error": "Marker not found"
}
```

---

## DELETE /api/markers/:id

Delete a marker belonging to the authenticated user.

### Responses

**200 OK**

```json
{
"success": true
}
```

**404 Not Found**

```json
{
"error": "Marker not found"
}
```

---

# Notes

- Users only have access to their own markers.  
- The SQLite database file **db.sqlite** is created automatically.  
- JWT tokens expire after **7 days**.  
- Config values can be overridden via **.env** (see `.env.example`).  
