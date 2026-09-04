# Current Features and Knowledge Base

## Project Overview
3P-Doodle is a room-based realtime collaborative drawing platform with a React frontend and Spring Boot backend. Authentication is handled by Supabase Auth, while application data is stored in Supabase PostgreSQL.

## Currently Implemented Features

### Authentication and User Provisioning
- Supabase OAuth-based authentication on the frontend.
- Spring Boot resource server validates Supabase-issued JWTs.
- Backend auto-provisions local `users` records from JWT claims on room actions.

### Room Management
- Create room via `POST /room/create`.
- Join room via `POST /room/join`.
- Check room status via `GET /room/status`.
- Leave room via `POST /room/leave`.
- Room lifecycle persisted in PostgreSQL via JPA.

### Realtime Collaboration
- WebSocket/STOMP endpoint at `/ws` with SockJS fallback.
- STOMP `CONNECT` bearer token is decoded server-side and bound to the websocket principal.
- Room-scoped drawing topic: `/topic/draw/{roomCode}`.
- Room-scoped room-status topic: `/topic/room/{roomCode}`.
- Backend-authoritative whiteboard state management.
- Whiteboard snapshot retrieval via `GET /whiteboard/state?roomCode=...`.

### Whiteboard Sync Model
- Clients send draw commands to `/app/draw`.
- Backend derives draw identity from the authenticated websocket principal instead of trusting the client payload.
- Backend validates room membership before applying changes.
- Backend maintains in-memory active and committed stroke state per room.
- Authoritative snapshots are persisted to PostgreSQL after `END`, `UNDO`, and `CLEAR` events.
- Frontend loads authoritative whiteboard state from backend instead of syncing from another client.

### Scalability Preparation
- Redis pub/sub integration is wired and controlled by `REDIS_ENABLED` / `app.redis.enabled`.
- Local in-process broadcaster remains available as fallback when Redis is disabled.
- Redis fanout channel defaults to `whiteboard-events`.

### Frontend Latency Improvements
- Removed client-to-client whiteboard sync requests.
- Replaced polling loop in `OptionScreen` with websocket room-status subscription after initial bootstrap.
- Drawing input now uses pointer events.
- Move events are buffered and flushed on a short interval instead of being emitted on every pointer movement.
- Whiteboard protocol now supports batched point payloads for `MOVE` and `END` events, reducing websocket message overhead.

## Known Limitations
- Draw events now support point batching, but snapshots are still stored as full stroke JSON rather than compressed deltas.
- Room status still performs one initial REST bootstrap before websocket subscriptions begin.
- Snapshot persistence happens synchronously on every `END`/`CLEAR`/`UNDO` rather than being debounced/batched.
- Focused unit tests now cover whiteboard stroke persistence, user-scoped undo behavior, and room membership rejection.
- The Redis-enabled path (`REDIS_ENABLED=true`) has not yet been runtime-verified against a real Redis instance; only the local (non-Redis) broadcaster path has been confirmed to start and run successfully.
- Live two-browser drawing sync and the subscribe-time room-authorization check have not yet been manually verified end-to-end (backend unit/context tests pass, but these require a running frontend + two authenticated sessions to confirm).
- `getRoomStatus` still does not report room expiry explicitly. A waiting user whose room has passed the 10-minute join window will keep seeing `WAITING` with a dead code until they click "Get My Code" again (which now correctly issues a fresh code, per the fix below), rather than being proactively told the code expired.

## Configuration Notes

### Backend Environment Variables
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_ISSUER_URI`
- `REDIS_ENABLED`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_CHANNEL`

### Important Architecture Notes
- Supabase remains the authentication provider and Postgres host.
- Whiteboard synchronization authority now lives on the Spring Boot server.
- Redis pub/sub is used for cross-instance event fanout, not durable recovery.
- Durable whiteboard recovery is provided by persisted PostgreSQL snapshots.

## Change Log

### 2026-09-04
- Added backend-authoritative whiteboard state service.
- Added `whiteboard_snapshots` persistence model and repository.
- Added `GET /whiteboard/state` endpoint.
- Added Redis-backed whiteboard broadcaster/subscriber with local fallback.
- Refactored whiteboard frontend to load server snapshots instead of peer sync.
- Replaced repeated option-room polling with websocket room status updates after bootstrap.
- Hardened websocket authentication by binding the STOMP bearer token to the socket principal.
- Added STOMP SUBSCRIBE-time authorization: users can no longer subscribe to `/topic/draw/{roomCode}` or `/topic/room/{roomCode}` for rooms they do not belong to.
- Added focused backend tests for whiteboard state transitions.
- Optimized the whiteboard protocol to send batched point payloads instead of single-point move updates.
- Fixed a bug where a user's own echoed `MOVE` events (broadcast back to the sender) could be re-applied and corrupt local point ordering; own `MOVE`/`END` echoes are now skipped after updating version tracking.
- Extended Redis pub/sub fanout to room lifecycle events (`PAIRED`/`NO_ROOM`) via a new `RoomRealtimeBroadcaster` abstraction (local + Redis implementations), so room-status updates now scale across instances the same way draw events do.
- Narrowed transactional scope in `WhiteboardStateService`: `START`/`MOVE` events no longer open a Spring-managed database transaction; only actual snapshot persistence does, relying on Spring Data JPA's per-call transaction management.
- Fixed a startup failure where `WhiteboardStateService` required an injected `ObjectMapper` bean that isn't guaranteed to exist in this project's Spring context; it now owns its own `ObjectMapper` instance internally.
- Removed dead code: unused `SendToUser`/`AbstractAuthenticationToken` imports and the unimplemented `DrawEventType.SNAPSHOT` enum value.
- Consolidated Redis configuration to a single `app.redis.*` property namespace (removed redundant `spring.data.redis.*` duplication).
- Verified: application now starts successfully end-to-end (JPA schema migration, Hikari pool, STOMP broker, security filter chain) with `REDIS_ENABLED` unset/false.
- Verified: `mvn test` passes in full — `BackendApplicationTests` (full Spring context load) and all `WhiteboardStateServiceTest` cases (stroke persistence on END, user-scoped undo, room-membership rejection) are green.
- Fixed a Mockito `UnnecessaryStubbingException` in `WhiteboardStateServiceTest`: the shared `snapshotRepository.findByRoomCode` stub in `setUp()` is now `lenient()` since not every test case reaches the snapshot lookup (e.g. requests rejected at room-membership validation).
- Fixed a pre-existing room-lifecycle bug: `createRoom()` returned a user's existing room code indefinitely without checking whether it had passed the 10-minute join-expiry window, so a user could be shown a dead room code forever until someone tried to join it and got rejected. `createRoom()` now deletes an expired, still-unpaired room and issues a fresh code automatically. Extracted the expiry check into a shared `isExpired(Room)` helper reused by `joinRoom()`.
- Fixed the same class of bug on the join side: `joinRoom()` previously threw `"You are already in a room"` for **any** existing room association, even a stale/expired one that was never actually joined by a second user. It now auto-cleans an expired, still-unpaired existing room instead of hard-blocking the join attempt.
- Hardened `leaveRoom()` and `joinRoom()` so a realtime notification failure (`RoomRealtimeNotifier.publishRoomStatus`) can never silently roll back the underlying `@Transactional` state change, since both methods call the notifier as their last step before returning.
- Added diagnostic logging (`RoomService` via SLF4J) around room deletion in `leaveRoom()` and the "already in a room" path in `joinRoom()`, printing the exact room code and participant IDs involved, to make this class of pairing/leave issue debuggable from server logs going forward.
- Fixed a real frontend bug: the room-creator's waiting screen (`AuthSuccess.tsx`) only fetched `/room/status` once on mount and never listened for the partner joining, so the creator could be stuck on "Waiting for friend to join..." indefinitely even after the partner successfully paired. `AuthSuccess.tsx` now subscribes to `/topic/room/{roomCode}` (same pattern already used by `OptionScreen.tsx`/`PlaygroundPage.tsx`) while in the `WAITING` state and reacts to the server-pushed `PAIRED` event.
- Fixed a critical whiteboard sync bug: `WhiteboardSnapshot.snapshotJson` was mapped with `@Lob`, which made Hibernate use PostgreSQL's Large Object API to read/write it. Supabase's connection goes through PgBouncer, which is incompatible with that API (`"Large Objects may not be used in auto-commit mode"`), so every snapshot save on `END`/`CLEAR`/`UNDO` threw an exception - meaning stroke-completion, undo, and clear events never got broadcast to other clients at all, breaking realtime drawing sync. Removed `@Lob`; the field is now bound as a plain `String` against its existing `TEXT` column (no DB migration needed).
- Hardened `WhiteboardStateService.applyEvent()` so a snapshot persistence failure can never again silently prevent the authoritative draw event from being broadcast - live sync and durable persistence are now independent failure domains.
- Hardened `WhiteboardStateService.loadRoomState()` so a corrupted or unreadable legacy snapshot row (e.g. one written before the `@Lob` fix) degrades to an empty board with a logged error instead of permanently failing every future load/draw for that room (previously, `computeIfAbsent` would never cache a result and would retry the same failure on every single event).

### 2.0.0-latest (2026-09-04 Update)
- **Redis Serialization Fix**: Fixed Redis pub/sub silent failures by replacing `@class`-dependent `GenericJackson2JsonRedisSerializer` on `MessageListenerAdapter` with explicit `StringRedisSerializer` wire format + Jackson `ObjectMapper` (de)serialization in subscriber services.
- **Dependency & Architecture Refactoring**:
  - Removed single-method pass-through `RoomRealtimeNotifier` wrapper class; `RoomService` now directly uses `RoomRealtimeBroadcaster`.
  - Registered a central, explicit `ObjectMapper` `@Bean` in `SecurityConfig` to fix dependency injection errors across `WhiteboardStateService` and `WebSocketConfig` without triggering circular dependency loops.
  - Corrected `pom.xml` dependencies for Jackson (`jackson-databind`) to compile-scope, removing invalid hardcoded version tags.
- **Drawing Quality Improvements**:
  - Replaced straight polygonal `lineTo` segment rendering on HTML5 Canvas in `PlaygroundPage.tsx` with quadratic midpoint curve smoothing (`quadraticCurveTo`), round line caps, and round line joins.
  - Fixed choppy line rendering for both local drawing inputs and remote WebSocket/Redis synced stroke events.
- **State Snapshot Persistence & Reconnection**:
  - Enhanced `WhiteboardStateService` snapshot saving: committed strokes and active in-progress strokes are included when persisting to PostgreSQL, preventing state loss on concurrent browser refreshes.
  - Cleaned up frontend STOMP handler: removed obsolete/unhandled `SYNC_REQUEST` messages, making `GET /whiteboard/state` the sole authority for board snapshot restoration on client refresh.

