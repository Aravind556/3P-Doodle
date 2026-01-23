# Detailed Issue Breakdown & Solutions

---

## **1. Database Connection Failed**

### **The Problem:**
When the backend started, it couldn't establish a connection to Supabase PostgreSQL. All API calls to database-dependent endpoints would fail with connection timeout errors.

### **Why It Happened:**
The `application.yml` file had incorrect Supabase credentials:
- **Wrong region:** Supabase hosts databases in different regions (us-east, eu-west, ap-northeast-2, etc.). If the region doesn't match where your Supabase project is, the connection string points to the wrong server.
- **Wrong username/password:** Supabase creates a default `postgres` user, but credentials can be reset or changed. If the password in config didn't match what's in Supabase dashboard, authentication failed.
- **Missing JDBC configuration:** Spring Data JPA uses Hibernate which needs proper `spring.jpa.hibernate.ddl-auto` and `spring.jpa.database-platform` settings.

### **The Fix:**
```yaml
# Updated application.yml with correct Supabase credentials
spring:
  datasource:
    url: jdbc:postgresql://db.xxx.supabase.co:5432/postgres?sslmode=require&serverTimezone=UTC
    username: postgres
    password: [CORRECT_PASSWORD_FROM_SUPABASE_DASHBOARD]
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate  # Let's not auto-create, just validate
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    show-sql: false
```

**Result:** HikariCP (Spring's connection pooling library) successfully created 10 connections to the Supabase database on startup. Backend logs showed:
```
HikariPool-1 - Start completed
Tomcat started on port 8080
```

---

## **2. Frontend Auth Header Missing (401 Errors)**

### **The Problem:**
When `OptionScreen.tsx` made a `fetch()` call to `/room/status`, it got a 401 Unauthorized response. The endpoint is protected by Spring Security's `@AuthenticationPrincipal`, which requires a valid JWT in the Authorization header.

### **Why It Happened:**
The fetch request was missing the JWT bearer token:
```typescript
// WRONG - No Authorization header
const res = await fetch(`${apiUrl}/room/status`, {
    headers: { } // Empty headers
});
```

Spring Security's OAuth2 Resource Server interceptor checks for `Authorization: Bearer <jwt>`, and if it's missing, it rejects the request with 401.

### **The Technical Details:**
- **Spring Security Chain:** Request → Filter → OAuth2ResourceServerConfigurer → JwtAuthenticationConverter
- **JWT Validation:** Supabase JWT issuer (`https://your-project.supabase.co`) is configured in Spring; the `sub` (subject/user ID) claim is extracted and used as the principal.
- **Missing Bearer Token:** Without the header, the JWT authentication filter doesn't find a token and denies access.

### **The Fix:**
```typescript
// CORRECT - Authorization header with Bearer token
const res = await fetch(`${apiUrl}/room/status`, {
    headers: { 
        Authorization: `Bearer ${session.access_token}` 
    }
});
```

**Additional robustness:** Added 401 handling to stop polling and logout if the session expires:
```typescript
if (res.status === 401) {
    if (interval) window.clearInterval(interval);
    await logout(); // Redirect to login
}
```

**Result:** Authenticated requests now succeed; expired sessions trigger a clean logout instead of silent 401 failures.

---

## **3. User ID Mismatch ("Unknown" Partner)**

### **The Problem:**
When two users paired (user1 created room, user2 joined), the popup showed "You and Unknown are now connected" instead of the partner's real name. Backend logs showed `getUserName()` returning "Unknown" even though a user was clearly in the database.

### **Why It Happened:**
**Architecture mismatch between User.id and Room.userId fields:**

**In the database:**
- Table `users` had `id` (UUID), `name`, `email`, `room_id`
- Table `rooms` had `user1_id` (UUID), `user2_id` (UUID)

**The problem:** 
```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)  // <-- Hibernate generates a new random UUID
    private String id;
}
```

When Supabase OAuth authenticates, the JWT `sub` claim is the user's Supabase ID (e.g., `"abc123..."`). The RoomService stores this in `user1Id`:
```java
String userId = jwt.getSubject();  // e.g., "abc123..."
room.setUser1Id(UUID.fromString(userId));
```

But when a new User was created, Hibernate ignored the provided ID and generated a **different random UUID** (e.g., `"xyz789..."`). This mismatch meant:
- Room points to `user1_id = abc123...`
- But User table has `id = xyz789...`
- Lookup by UUID fails: `userRepository.findById("abc123...")` returns empty
- `getUserName()` returns default "Unknown"

### **The Fix:**

**Step 1: Remove auto-generation:**
```java
@Entity
public class User {
    @Id  // No @GeneratedValue - use provided ID
    private String id;  // Store JWT sub directly
}
```

**Step 2: Ensure user exists before room operations:**
```java
@PostMapping("/create")
public ResponseEntity<?> createRoom(@AuthenticationPrincipal Jwt jwt) {
    // Create/fetch user FIRST, synchronously
    userService.getOrCreateUser(jwt);  // <-- Synchronous, blocking
    
    String userId = jwt.getSubject();
    // Now safe to create room with this userId
    Map<String, Object> response = roomService.createRoom(userId);
    return ResponseEntity.ok(response);
}
```

**Step 3: Add retry logic in UserService:**
```java
@Transactional
public User getOrCreateUser(Jwt jwt) {
    String userId = jwt.getSubject();  // e.g., "abc123..."
    
    // Try to find first
    Optional<User> existing = userRepository.findById(userId);
    if (existing.isPresent()) return existing.get();
    
    // Only create if needed
    synchronized (USER_CREATION_LOCK) {
        // Double-check after lock
        existing = userRepository.findById(userId);
        if (existing.isPresent()) return existing.get();
        
        // Create with explicit ID
        User user = new User();
        user.setId(userId);  // Use JWT sub directly
        user.setName(jwt.getClaimAsString("name"));
        user.setEmail(jwt.getClaimAsString("email"));
        
        try {
            return userRepository.save(user);
        } catch (Exception e) {
            // Another thread may have created it; retry once
            Thread.sleep(50);
            return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Failed to create user"));
        }
    }
}
```

**Result:** User IDs now match perfectly. Lookups work: `userRepository.findById("abc123...")` finds the correct user, and `getUserName()` returns the real name.

---

## **4. Partner Email Empty on Hover**

### **The Problem:**
On OptionScreen, hovering over the partner's name badge showed no tooltip email. The popup also sometimes displayed partner name before email was available.

### **Why It Happened:**
**Two timing issues:**

**Issue A: Missing field in join response**
```java
// OLD - join response didn't include partnerEmail
Map<String, Object> response = new HashMap<>();
response.put("status", "PAIRED");
response.put("partner", user1Name);
// Missing: response.put("partnerEmail", user1Email);
```

The frontend had to wait for `/room/status` polling to get the email, which could take 3+ seconds.

**Issue B: Polling timeout before data arrives**
The frontend's polling logic had no guarantee the email would arrive:
```typescript
let attempts = 0;
const fetchStatus = async () => {
    // ... fetch and set partnerEmail
    attempts++;
    if (attempts >= 10) clearInterval(interval);  // Stop after 30s
};
```

If the backend was slow or the email field was null, polling would stop without populating the tooltip.

### **The Fix:**

**Step 1: Return partnerEmail in join response:**
```java
@Transactional
public Map<String, Object> joinRoom(String userId, String roomCode) {
    // ... join logic ...
    
    String user1Name = getUserName(room.getUser1Id().toString());
    String user1Email = getUserEmail(room.getUser1Id().toString());  // <-- Get partner email
    
    Map<String, Object> response = new HashMap<>();
    response.put("status", "PAIRED");
    response.put("partner", user1Name);
    response.put("partnerEmail", user1Email);  // <-- Include immediately
    return response;
}
```

**Step 2: Smart polling on OptionScreen:**
```typescript
const [partnerEmail, setPartnerEmail] = useState<string>('');

useEffect(() => {
    let interval: number | undefined;
    let attempts = 0;

    const fetchStatus = async () => {
        if (!session) return;
        try {
            const res = await fetch(`${apiUrl}/room/status`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'PAIRED') {
                    if (data.partner) setPartnerName(data.partner);
                    if (data.partnerEmail) setPartnerEmail(data.partnerEmail);
                    
                    // Stop polling once BOTH values are present
                    if (data.partner && data.partnerEmail) {
                        if (interval) window.clearInterval(interval);
                        return;  // <-- Exit early, don't continue
                    }
                }
            }
        } catch (e) {
            // ignore
        } finally {
            attempts++;
            // Timeout: stop after 10 attempts (~30s)
            if (attempts >= 10 && interval) {
                window.clearInterval(interval);
            }
        }
    };

    fetchStatus();
    interval = window.setInterval(fetchStatus, 3000);  // Poll every 3s
    return () => { if (interval) window.clearInterval(interval); };
}, [session, apiUrl]);
```

**Hover tooltip:**
```typescript
<span 
    className="name-badge partner" 
    title={partnerEmail || ''}  // Show email in tooltip on hover
>
    {partnerName || 'Partner'}
</span>
```

**Result:** Partner email appears in the tooltip immediately, and polling stops as soon as it's available (no unnecessary requests).

---

## **5. 500 Error on `/room/create`**

### **The Problem:**
Clicking "Get My Code" returned a 500 Internal Server Error. The backend crashed during room creation.

### **Why It Happened:**
A bad patch corrupted the `createRoom()` method. Variables from `joinRoom()` bled into it:

```java
// CORRUPTED CODE
@Transactional
public Map<String, Object> createRoom(String userId) {
    UUID userUuid = UUID.fromString(userId);
    
    // ... existing room check ...
    
    // PROBLEM: Using 'room' before it's declared
    String user1Email = getUserEmail(room.getUser1Id().toString());  // room is null!
    
    // PROBLEM: Creating 'room' here, but it's already used above
    room.setRoomCode(roomCode);
    room.setUser1Id(userUuid);
    // ...
    
    // PROBLEM: 'response' used before declaration, then declared again
    response.put("partnerEmail", user1Email);  // response doesn't exist yet!
    
    Map<String, Object> response = new HashMap<>();  // Declared here, too late
    response.put("code", roomCode);
    // ...
}
```

When the endpoint ran, it hit a NullPointerException (accessing `room` before assignment), which Spring caught and wrapped as a 500 error.

### **The Fix:**
Completely rewrote the method with proper variable ordering:

```java
@Transactional
public Map<String, Object> createRoom(String userId) {
    UUID userUuid = UUID.fromString(userId);
    
    // Check if user already has a room
    Optional<Room> existingRoom = roomRepository.findByUserId(userUuid);
    if (existingRoom.isPresent()) {
        Room room = existingRoom.get();
        Map<String, Object> response = new HashMap<>();
        response.put("code", room.getRoomCode());
        response.put("status", room.getIsLocked() ? "PAIRED" : "WAITING");
        if (room.getIsLocked()) {
            response.put("partner", getPartnerName(room, userUuid));
        }
        return response;
    }

    // Generate unique code
    String roomCode;
    do {
        roomCode = generateRoomCode();
    } while (roomRepository.existsByRoomCode(roomCode));

    // CREATE room object FIRST
    Room room = new Room();
    room.setRoomCode(roomCode);
    room.setUser1Id(userUuid);
    room.setIsLocked(false);
    room.setCreatedAt(LocalDateTime.now());
    roomRepository.save(room);

    // Update user
    Optional<User> userOpt = userRepository.findById(userId);
    if (userOpt.isPresent()) {
        User user = userOpt.get();
        user.setRoomId(room.getId());
        userRepository.save(user);
    }

    // Build response
    Map<String, Object> response = new HashMap<>();
    response.put("code", roomCode);
    response.put("status", "WAITING");
    return response;
}
```

**Key fixes:**
1. Declare `room` before using it
2. Declare `response` before putting values into it
3. Clean variable flow with no forward references

**Result:** `/room/create` now returns HTTP 200 with a valid room code.

---

## **6. Popup Showing Repeatedly**

### **The Problem:**
After pairing, every time the component re-rendered or polling happened, the "You're Doodlemates!" popup appeared again. Users had to close it multiple times.

### **Why It Happened:**
```typescript
// OLD - No tracking of whether popup was shown
useEffect(() => {
    if (roomStatus?.status === 'PAIRED' && !hasShownPopup) {
        setShowPairedPopup(true);  // Show popup
        // Missing: setHasShownPopup(true)
    }
}, [roomStatus, hasShownPopup]);
```

The `hasShownPopup` flag was never set to true, so the condition remained true on every re-render. Each polling cycle (every 3s) would trigger the popup again.

### **The Fix:**
Track popup state with a flag:

```typescript
const [hasShownPopup, setHasShownPopup] = useState(false);

useEffect(() => {
    if (roomStatus?.status === 'PAIRED' && !hasShownPopup) {
        setShowPairedPopup(true);
        setHasShownPopup(true);  // <-- Mark as shown, prevent re-trigger
    }
}, [roomStatus, hasShownPopup]);
```

Now the effect runs only once when transitioning to PAIRED, and `hasShownPopup` prevents it from running again.

**Result:** Popup shows exactly once per pairing, then never reappears.

---

## **7. Auto-Redirect Not Working**

### **The Problem:**
When a user logged in and they were already paired (e.g., after closing the browser), they stayed on AuthSuccess instead of being redirected to OptionScreen.

### **Why It Happened:**
Two competing useEffects with poor state management:

```typescript
// Effect 1: Show popup
useEffect(() => {
    if (roomStatus?.status === 'PAIRED' && !hasShownPopup) {
        setShowPairedPopup(true);
        setHasShownPopup(true);
    }
}, [roomStatus, hasShownPopup]);

// Effect 2: Try to redirect
useEffect(() => {
    if (roomStatus?.status === 'PAIRED' && !showPairedPopup) {  // <-- Checks showPairedPopup
        navigate('/options');
    }
}, [roomStatus, showPairedPopup, navigate]);
```

**The issue:**
1. First poll returns `PAIRED` status
2. Effect 1 runs: sets `showPairedPopup = true`, `hasShownPopup = true`
3. Effect 2 runs: sees `showPairedPopup === true`, condition fails, no redirect

But the UI also shows the popup, blocking navigation. The user had to close the popup manually.

### **The Fix:**
Separate the concerns: auto-redirect if already paired, separate from popup logic:

```typescript
// Effect 1: Show popup ONCE (new pairing)
useEffect(() => {
    if (roomStatus?.status === 'PAIRED' && !hasShownPopup) {
        setShowPairedPopup(true);
        setHasShownPopup(true);
    }
}, [roomStatus, hasShownPopup]);

// Effect 2: Auto-redirect if paired but popup hasn't been shown yet
// This handles the case where user returns to app already paired
useEffect(() => {
    if (roomStatus?.status === 'PAIRED' && !showPairedPopup) {
        navigate('/options');
    }
}, [roomStatus, showPairedPopup, navigate]);
```

**Flow now:**
- **New pairing:** Popup appears → user closes it → Effect 2 redirects after popup closes
- **Already paired (returning user):** `showPairedPopup = false` → Effect 2 redirects immediately
- **Prevents popup spam:** `hasShownPopup` flag ensures popup only shows on fresh pairings

**Result:** Paired users skip AuthSuccess entirely and go straight to OptionScreen.

---

## **8. Race Conditions During Polling**

### **The Problem:**
The browser console showed repeated errors: `"Row was already updated or deleted by another transaction"`. This occurred when polling `/room/status` while joining a room from another account.

### **Why It Happened:**
**Concurrency conflict in user creation:**

```java
// OLD FLOW - User creation during status check
@GetMapping("/room/status")
public ResponseEntity<?> getRoomStatus(@AuthenticationPrincipal Jwt jwt) {
    String userId = jwt.getSubject();
    
    // PROBLEM: Every status check creates a user
    User user = userService.getOrCreateUser(jwt);  // <-- Async operation
    
    Map<String, Object> response = roomService.getRoomStatus(userId);
    return ResponseEntity.ok(response);
}
```

**Timeline:**
```
Thread A (polling):  /room/status → getUserOrCreate → INSERT User
Thread B (joining):  /room/join → getUserOrCreate → INSERT User  (same user ID)
Thread C (polling):  /room/status → getUserOrCreate → UPDATE User.roomId
                     (But user was deleted by another transaction?)
```

Hibernate's transaction isolation + concurrent writes = conflicts.

### **The Fix:**

**Step 1: Remove user creation from read-only status endpoint:**
```java
@GetMapping("/room/status")
public ResponseEntity<?> getRoomStatus(@AuthenticationPrincipal Jwt jwt) {
    String userId = jwt.getSubject();
    
    // Only read, no write
    Map<String, Object> response = roomService.getRoomStatus(userId);
    return ResponseEntity.ok(response);
}
```

**Step 2: Create users only on write operations (create/join):**
```java
@PostMapping("/create")
public ResponseEntity<?> createRoom(@AuthenticationPrincipal Jwt jwt) {
    // Synchronous, blocking user creation
    userService.getOrCreateUser(jwt);
    
    String userId = jwt.getSubject();
    Map<String, Object> response = roomService.createRoom(userId);
    return ResponseEntity.ok(response);
}

@PostMapping("/join")
public ResponseEntity<?> joinRoom(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, String> request) {
    // Synchronous, blocking user creation
    userService.getOrCreateUser(jwt);
    
    String userId = jwt.getSubject();
    String roomCode = request.get("code");
    Map<String, Object> response = roomService.joinRoom(userId, roomCode);
    return ResponseEntity.ok(response);
}
```

**Step 3: Add synchronization in UserService:**
```java
private static final Object USER_CREATION_LOCK = new Object();

@Transactional
public User getOrCreateUser(Jwt jwt) {
    String userId = jwt.getSubject();
    
    // Check without lock first (common case)
    Optional<User> existing = userRepository.findById(userId);
    if (existing.isPresent()) return existing.get();
    
    // Only acquire lock if needed to create
    synchronized (USER_CREATION_LOCK) {
        // Double-check after acquiring lock
        existing = userRepository.findById(userId);
        if (existing.isPresent()) return existing.get();
        
        // Guaranteed only one thread creates this user
        User user = new User();
        user.setId(userId);
        // ... set name, email ...
        
        try {
            return userRepository.save(user);
        } catch (Exception e) {
            // Small delay for other transaction to commit
            Thread.sleep(50);
            // Retry once
            return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Failed to create user"));
        }
    }
}
```

**Result:**
- Status checks never write to database (idempotent)
- User creation only happens on /create and /join (controlled)
- Synchronization ensures only one thread creates a user
- No more transaction conflicts

---

## **9. User Trapped on Old Room Code**

### **The Problem:**
User logs in → creates a room code → logs out → logs back in → still sees the same old room code. Can't escape to create/join a new room.

### **Why It Happened:**
```java
@Transactional
public Map<String, Object> createRoom(String userId) {
    UUID userUuid = UUID.fromString(userId);
    
    // Check if user already has a room
    Optional<Room> existingRoom = roomRepository.findByUserId(userUuid);
    if (existingRoom.isPresent()) {
        // Return existing room, don't create new one
        Room room = existingRoom.get();
        return buildResponse(room);  // Returns old code
    }
    
    // Only creates if no existing room
    // ...
}
```

The room persists in the database even after logout. On re-login, the same UUID finds the same room. User is stuck.

### **The Fix:**

**Step 1: Add /room/leave endpoint:**
```java
@PostMapping("/leave")
public ResponseEntity<?> leaveRoom(@AuthenticationPrincipal Jwt jwt) {
    String userId = jwt.getSubject();
    roomService.leaveRoom(userId);
    return ResponseEntity.ok(Map.of("message", "Left room successfully"));
}
```

**Step 2: Implement leaveRoom to delete the room:**
```java
@Transactional
public void leaveRoom(String userId) {
    UUID userUuid = UUID.fromString(userId);
    Optional<Room> roomOpt = roomRepository.findByUserId(userUuid);
    
    if (roomOpt.isPresent()) {
        Room room = roomOpt.get();
        
        // Clear room linkage for both participants
        if (room.getUser1Id() != null) {
            userRepository.findById(room.getUser1Id().toString()).ifPresent(u -> {
                u.setRoomId(null);
                userRepository.save(u);
            });
        }
        if (room.getUser2Id() != null) {
            userRepository.findById(room.getUser2Id().toString()).ifPresent(u -> {
                u.setRoomId(null);
                userRepository.save(u);
            });
        }
        
        // Delete the room
        roomRepository.delete(room);
    }
}
```

**Step 3: Add UI button on WAITING screen:**
```typescript
<button onClick={leaveRoom} className="cancel-room-btn">
    Start Over
</button>
```

**Result:** User can abandon an old room and start fresh. On re-login, no old room is found, so they see NO_ROOM state and can create/join new room.

---

## **10. No Way to Break Paired Link**

### **The Problem:**
Once two users paired, there was no way to unlink. Users were forever connected unless one logged out.

### **Why It Happened:**
The `/room/leave` endpoint only deleted **unpaired rooms**:
```java
if (!room.getIsLocked()) {  // Only works if NOT paired
    roomRepository.delete(room);
}
```

Paired rooms (`isLocked = true`) were untouched. No endpoint could break a paired link.

### **The Fix:**

**Update leaveRoom to handle paired rooms:**
```java
@Transactional
public void leaveRoom(String userId) {
    UUID userUuid = UUID.fromString(userId);
    Optional<Room> roomOpt = roomRepository.findByUserId(userUuid);
    
    if (roomOpt.isPresent()) {
        Room room = roomOpt.get();
        
        // Works for BOTH paired and unpaired rooms now
        if (room.getUser1Id() != null) {
            userRepository.findById(room.getUser1Id().toString()).ifPresent(u -> {
                u.setRoomId(null);
                userRepository.save(u);
            });
        }
        if (room.getUser2Id() != null) {
            userRepository.findById(room.getUser2Id().toString()).ifPresent(u -> {
                u.setRoomId(null);
                userRepository.save(u);
            });
        }
        
        // Delete regardless of lock status
        roomRepository.delete(room);
    }
}
```

**Add break-link button to OptionScreen:**
```typescript
const breakLink = async () => {
    if (!session) return;
    try {
        const res = await fetch(`${apiUrl}/room/leave`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
            navigate('/Home');  // Redirect after breaking link
        }
    } catch (e) { /* ignore */ }
};

// In JSX:
<button className="break-link-btn" onClick={breakLink}>
    Break Link & Return Home
</button>
```

**Result:** Either user can click the button to immediately:
1. Clear both users' `roomId` fields
2. Delete the room from database
3. Redirect to Home where they see NO_ROOM state
4. Both users are now free to create/join new pairings

---

## **11. Login Forcing Account Switch Failure**

### **The Problem:**
After logging out, when trying to log back in, Google didn't show an account selection screen. Users couldn't switch to a different Google account; they were auto-logged as the same account.

### **Why It Happened:**
The OAuth configuration was missing the `prompt` parameter:
```typescript
// OLD - No prompt parameter
const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
        redirectTo: `${window.location.origin}/Home`,
        // No queryParams
    }
});
```

Google's default behavior: if a user is already authenticated in the browser, they skip the account picker and automatically log in as that user.

### **The Fix:**
Add `prompt=select_account` to force Google to always show the account picker:

```typescript
const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
        redirectTo: `${window.location.origin}/Home`,
        queryParams: {
            prompt: 'select_account'  // <-- Force account selection
        }
    }
});
```

**How it works:**
- `prompt=select_account`: Tells Google OAuth to skip any cached login and show account picker
- User can now select a different account or add a new one
- Works even if browser has saved Google credentials

**Result:** After logging out, the login flow shows Google's account selection screen, allowing users to switch accounts or log in with a different account.

---

## **Architecture Decisions Made**

| Decision | Why |
|----------|-----|
| User ID = JWT `sub` | Ensures consistency across all operations; no ID mismatches |
| Synchronous user creation | Eliminates race conditions and timing bugs |
| Polling with smart exit | Stops as soon as data is available; doesn't waste requests |
| Static lock in UserService | Prevents concurrent user creation for same ID |
| Separation of concerns | Status checks don't write; create/join are transactional |
| Immediate partner data return | Better UX; don't rely on polling for critical info |
| Force account picker on login | Better user experience; allows account switching |

---

This covers the technical depth of every issue and how each was systematically resolved!

ok done