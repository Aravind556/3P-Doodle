# Playground Page - Real-Time Collaborative Drawing

## Overview
The Playground Page enables two paired users to draw together in real-time using WebSocket (STOMP) for instant synchronization.

## Key Features

### 1. **Real-Time Drawing Synchronization**
- When Person A draws, Person B sees the line appearing **continuously** as the pointer moves
- Uses `START`, `MOVE`, and `END` event types
- `MOVE` events are sent every 15-20ms (throttled) for smooth motion
- Local drawing happens instantly for zero-lag feedback

### 2. **Drawing Tools**
- **Pen**: Draw with customizable colors
- **Eraser**: Remove strokes
- **Thickness Slider**: 1-20px brush size
- **Color Picker**: Full color spectrum
- **Clear Canvas**: Reset the entire canvas

### 3. **WebSocket Architecture**
```
Client A                    Server                     Client B
   |                          |                           |
   |-- START event ---------->|                           |
   |                          |-- broadcast ------------->|
   |-- MOVE events (15ms) --->|                           |
   |                          |-- broadcast ------------->| (renders line)
   |-- END event ------------>|                           |
   |                          |-- broadcast ------------->|
```

### 4. **Event Flow**
1. **START**: User presses mouse/touch → sends initial point
2. **MOVE**: User drags → continuously sends coordinates (throttled 15ms)
3. **END**: User releases → sends final event

### 5. **Preventing Duplication**
- Each event includes `userId`
- Client ignores incoming events with their own `userId`
- Local drawing renders immediately
- Partner's drawing renders from WebSocket events

## Technical Implementation

### Frontend (`PlaygroundPage.tsx`)
- **Canvas**: HTML5 Canvas API for drawing
- **WebSocket**: `@stomp/stompjs` + `sockjs-client`
- **State Management**: React hooks for tool settings
- **Event Handling**: Mouse and touch events for cross-device support

### Backend (`DrawController.java`)
- **Endpoint**: `/app/draw` receives events
- **Broadcasting**: `/topic/draw/{roomCode}` sends to room subscribers
- **No Storage**: Events are broadcast in real-time without persistence

## Setup Instructions

### 1. Install Dependencies
```bash
cd Frontend
npm install @stomp/stompjs sockjs-client
npm install --save-dev @types/sockjs-client
```

### 2. Backend Configuration
- WebSocket endpoint: `/ws` (with SockJS fallback)
- Security: Permit `/ws/**` in SecurityConfig
- Message broker: Simple in-memory broker

### 3. Run the Application
```bash
# Backend
cd Backend
./mvnw spring-boot:run

# Frontend
cd Frontend
npm run dev
```

## Code Structure

```
Frontend/
├── src/pages/
│   ├── PlaygroundPage.tsx    # Main drawing component
│   └── PlaygroundPage.css     # Styling
└── src/App.tsx                # Route configuration

Backend/
└── src/main/java/com/_P_Doodle/Backend/
    ├── Config/
    │   └── WebSocketConfig.java       # WebSocket setup
    ├── Controller/
    │   └── DrawController.java        # Draw event handler
    ├── Model/
    │   └── DrawEvent.java             # Event data model
    └── Security/
        └── SecurityConfig.java        # WebSocket permissions
```

## How It Works

### Smooth Real-Time Motion
The key to smooth drawing is **continuous MOVE events**:

```typescript
// Throttle MOVE events to ~15-20ms for smooth motion
const now = Date.now();
if (now - lastSentTime.current >= 15) {
    sendDrawEvent({ eventType: 'MOVE', ... });
    lastSentTime.current = now;
}
```

Without throttling, hundreds of events per second would overwhelm the network. With throttling, we balance smoothness and performance.

### Local-First Drawing
```typescript
// 1. Draw locally FIRST (instant feedback)
ctx.lineTo(x, y);
ctx.stroke();

// 2. THEN send to partner
sendDrawEvent({ ... });
```

This ensures zero lag for the active drawer while keeping partners synchronized.

### Partner Drawing
```typescript
// Receive partner's MOVE event
if (eventType === 'MOVE') {
    const lastPoint = stroke.points[stroke.points.length - 1];
    // Draw line segment immediately
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();
}
```

Each MOVE event renders a line segment, creating smooth continuous motion.

## Connection Status
- Green indicator: Partner connected
- Red indicator: Partner disconnected
- Auto-reconnect on connection drop (5s delay)

## Mobile Support
- Touch events supported
- Responsive toolbar
- `touch-action: none` prevents scrolling while drawing

## Future Enhancements
- Undo/Redo functionality
- Save/Load drawings
- Drawing history
- More tools (shapes, text, etc.)
- Canvas zoom/pan
