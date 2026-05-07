# File: docs/API.md

# API Reference — MeetingMind

Base URL (dev): `http://localhost:8000`
Base URL (prod): `https://your-api.railway.app`

All protected endpoints require:
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

---

## Health Check

### `GET /`

Returns service health. No auth required.

**Response 200:**
```json
{ "status": "ok" }
```

---

## Auth

### `POST /api/auth/me`

Returns the currently authenticated user's profile.

**Headers:** Authorization required

**Response 200:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Response 401:**
```json
{ "detail": "Invalid or expired token", "code": "AUTH_INVALID_TOKEN" }
```

---

## Meetings

### `GET /api/meetings`

List all meetings for the authenticated user, ordered by `created_at` descending.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "title": "Q1 Planning Session",
    "status": "done",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### `POST /api/meetings`

Create a new meeting with a transcript.

**Request body:**
```json
{
  "title": "Q1 Planning Session",
  "transcript": "Alice: Let's kick off Q1 planning..."
}
```

Constraints:
- `title`: 1–200 characters
- `transcript`: 10–50,000 characters

**Response 201:**
```json
{
  "id": "uuid",
  "title": "Q1 Planning Session",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Response 422:** Validation error (title/transcript constraints violated)

---

### `GET /api/meetings/{meeting_id}`

Get a single meeting with its notes (if processing is complete).

**Response 200:**
```json
{
  "id": "uuid",
  "title": "Q1 Planning Session",
  "status": "done",
  "created_at": "2024-01-15T10:30:00Z",
  "notes": {
    "id": "uuid",
    "summary": "The team aligned on Q1 OKRs focusing on user growth and retention.",
    "action_items": [
      { "task": "Draft OKR document", "owner": "Alice" },
      { "task": "Schedule kickoff meeting", "owner": "Bob" }
    ],
    "decisions": [
      "Prioritize mobile over desktop for Q1",
      "Freeze new feature development in March"
    ],
    "created_at": "2024-01-15T10:30:45Z"
  }
}
```

`notes` is `null` when `status` is `pending` or `processing`.

**Response 404:**
```json
{ "detail": "Meeting not found", "code": "MEETING_NOT_FOUND" }
```

---

### `POST /api/meetings/{meeting_id}/process`

Trigger AI processing for a meeting. Synchronous — blocks until Claude responds (2-10 seconds).

Sets status to `processing`, calls Claude, saves notes, sets status to `done`.

**Response 200:**
```json
{
  "id": "uuid",
  "title": "Q1 Planning Session",
  "status": "done",
  "created_at": "2024-01-15T10:30:00Z",
  "notes": { ... }
}
```

**Response 409:**
```json
{ "detail": "Meeting already processed", "code": "ALREADY_PROCESSED" }
```

**Response 500:**
```json
{ "detail": "Failed to process transcript", "code": "PROCESSING_FAILED" }
```

---

### `DELETE /api/meetings/{meeting_id}`

Delete a meeting and all associated notes (cascade delete).

**Response 204:** No content

**Response 404:**
```json
{ "detail": "Meeting not found", "code": "MEETING_NOT_FOUND" }
```

---

## Error Response Shape

All errors use this consistent shape:
```json
{
  "detail": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `AUTH_MISSING_TOKEN` | 401 | No Authorization header |
| `AUTH_INVALID_TOKEN` | 401 | Token invalid or expired |
| `MEETING_NOT_FOUND` | 404 | Meeting doesn't exist or belongs to another user |
| `ALREADY_PROCESSED` | 409 | Meeting status is already `done` or `processing` |
| `PROCESSING_FAILED` | 500 | Claude API error or JSON parse failure |
| `INTERNAL_ERROR` | 500 | Unexpected server error |