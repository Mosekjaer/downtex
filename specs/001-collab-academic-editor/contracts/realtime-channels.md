# Realtime Channels Contract: Downtex

**Branch**: `001-collab-academic-editor`
**Date**: 2026-03-12

All real-time communication uses Supabase Realtime channels over WebSocket. No custom WebSocket server.

## Channel: `doc:{documentId}`

One channel per open document. Used for both Yjs CRDT sync and presence.

### Broadcast Events

#### `yjs-update`
Sent when a client applies a local Yjs update.

**Payload**:
```json
{
  "type": "yjs-update",
  "update": "<base64-encoded Yjs update binary>",
  "clientId": "<yjs-client-id>"
}
```
**Direction**: Client → Channel → All other clients
**Frequency**: On every keystroke/edit (batched by Yjs internally)

#### `yjs-sync-step-1`
Sent when a new client joins and needs to sync with existing clients.

**Payload**:
```json
{
  "type": "yjs-sync-step-1",
  "stateVector": "<base64-encoded Yjs state vector>"
}
```
**Direction**: New client → Channel

#### `yjs-sync-step-2`
Response to sync-step-1. An existing client sends the diff.

**Payload**:
```json
{
  "type": "yjs-sync-step-2",
  "update": "<base64-encoded Yjs update binary>",
  "targetClientId": "<requesting-client-id>"
}
```
**Direction**: Existing client → Channel (filtered by targetClientId on receive)

#### `force-reload`
Sent by the server (via Remix action) when a snapshot is restored.

**Payload**:
```json
{
  "type": "force-reload",
  "reason": "snapshot-restored",
  "snapshotId": "<uuid>"
}
```
**Direction**: Server → Channel → All clients
**Client behavior**: On receive, discard local Yjs doc, re-fetch state from database, reinitialize editor.

### Presence

Supabase Realtime presence on the same channel tracks online users.

#### Presence State (per user)

```json
{
  "userId": "<uuid>",
  "displayName": "Alice",
  "avatarUrl": "https://...",
  "cursorPosition": {
    "anchor": 142,
    "head": 142
  },
  "cursorColor": "#4F46E5",
  "online_at": "2026-03-12T10:30:00Z"
}
```

**`cursorPosition`**: ProseMirror selection anchor/head positions. Updated on every selection change (debounced 50ms).
**`cursorColor`**: Assigned deterministically from user ID (hash to fixed color palette of 8 distinct colors).

#### Presence Events

- **`join`**: User opens the document. Track presence state.
- **`leave`**: User closes tab or navigates away. Presence auto-removed by Supabase after heartbeat timeout (~30s).
- **`update`**: User moves cursor or changes selection. Updated via `channel.track()`.

### Authorization

Channel subscription requires a valid Supabase Auth JWT. The channel name includes the document ID. Supabase Realtime can be configured with RLS-like policies to ensure only authorized users subscribe. However, since Supabase Realtime broadcast does not enforce RLS by default, the client-side code MUST verify the user has at least viewer role before connecting to the channel. The Remix loader for the document page performs this check — if the user lacks access, the page returns 403 and the client never subscribes.

## Channel: `figures:{documentId}`

Used for real-time figure updates. When the poll edge function updates a figure row, Supabase Realtime's postgres_changes broadcasts the change.

### Database Change Event

**Table**: `figures`
**Event**: `UPDATE`
**Filter**: `document_id=eq.{documentId}`

**Payload** (automatic from Supabase):
```json
{
  "type": "UPDATE",
  "table": "figures",
  "record": {
    "id": "<uuid>",
    "document_id": "<uuid>",
    "block_id": "figure-1",
    "last_sha": "abc123...",
    "status": "active",
    "error_message": null,
    "updated_at": "2026-03-12T10:35:00Z"
  }
}
```

**Client behavior**: On receive, re-render the figure block by fetching the updated embed URL or displaying an error state.

## Connection Lifecycle

1. User navigates to document editor page
2. Remix loader validates access (role check via RLS)
3. Client initializes Yjs Doc and loads initial state from loader data
4. Client subscribes to `doc:{documentId}` channel
5. Client tracks presence with cursor state
6. Client subscribes to `figures:{documentId}` for figure updates
7. On edits: broadcast `yjs-update`, debounce auto-save (2s)
8. On cursor move: update presence (50ms debounce)
9. On tab close: unsubscribe from channels, presence auto-removed

## Persistence Leader Election

To avoid multiple clients writing the same Yjs state to the database simultaneously:

1. The first client to join the channel becomes the "persistence leader"
2. Leader is tracked via a custom presence field: `{ isPersistenceLeader: true }`
3. Only the leader writes Yjs state to the database (debounced 2s)
4. If the leader leaves, the next client (by `online_at` timestamp) assumes leadership
5. Leadership transfer is detected via presence `leave` events
