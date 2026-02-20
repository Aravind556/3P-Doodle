import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Client } from '@stomp/stompjs';
import type { StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import './PlaygroundPage.css';

// Drawing event types for WebSocket communication
type DrawEventType = 'START' | 'MOVE' | 'END' | 'CLEAR' | 'UNDO' | 'SYNC_REQUEST' | 'SYNC_STATE';
type Tool = 'pen' | 'eraser';

interface Point {
    x: number;
    y: number;
}

// Stroke snapshot stored for undo/redo and sync
interface StrokeSnapshot {
    strokeId: string;
    userId: string;
    points: Point[];
    color: string;
    thickness: number;
    tool: Tool;
}

interface DrawEvent {
    roomCode: string;
    userId: string;
    eventType: DrawEventType;
    strokeId?: string;
    x?: number;
    y?: number;
    color?: string;
    thickness?: number;
    tool?: Tool;
    strokes?: StrokeSnapshot[];
}

export function PlaygroundPage() {
    const navigate = useNavigate();
    const { user, session } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const stompClientRef = useRef<Client | null>(null);
    const subscriptionRef = useRef<StompSubscription | null>(null);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [thickness, setThickness] = useState(3);
    const [tool, setTool] = useState<Tool>('pen');
    const [roomCode, setRoomCode] = useState<string>('');
    const [partnerConnected, setPartnerConnected] = useState(true);

    // Track current stroke
    const currentStrokeId = useRef<string>('');
    const lastSentTime = useRef<number>(0);
    const activeStrokesRef = useRef<Map<string, StrokeSnapshot>>(new Map());
    const strokesRef = useRef<StrokeSnapshot[]>([]);

    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080';
    const userId = user?.id || 'unknown';

    // Fetch room code on mount
    useEffect(() => {
        const fetchRoomCode = async () => {
            if (!session) {
                console.log('[Playground] No session available');
                return;
            }
            try {
                const res = await fetch(`${apiUrl}/room/status`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    console.log('[Playground] Room status:', data);
                    if (data.roomCode) {
                        setRoomCode(data.roomCode);
                        console.log('[Playground] Room code set:', data.roomCode);
                    } else {
                        console.warn('[Playground] No room code in response');
                    }
                } else {
                    console.error('[Playground] Failed to fetch room status:', res.status);
                }
            } catch (e) {
                console.error('[Playground] Failed to fetch room code:', e);
            }
        };
        fetchRoomCode();
    }, [session, apiUrl]);

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas size to fill container
        const resizeCanvas = () => {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
                redrawCanvas();
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctxRef.current = ctx;
        }

        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    // Setup WebSocket connection
    useEffect(() => {
        if (!roomCode || !session) {
            console.log('[WebSocket] Waiting for roomCode and session...', { roomCode, hasSession: !!session });
            return;
        }

        // SockJS needs HTTP URL, not WS - it handles the WebSocket upgrade internally
        const wsUrl = apiUrl + '/ws';
        console.log('[WebSocket] Connecting to:', wsUrl, 'Room:', roomCode);
        
        const client = new Client({
            webSocketFactory: () => new SockJS(wsUrl),
            connectHeaders: {
                Authorization: `Bearer ${session.access_token}`,
            },
            debug: (str) => console.log('[STOMP]', str),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = () => {
            console.log('[WebSocket] Connected successfully!');
            setPartnerConnected(true);

            // Subscribe to room drawing events
            const topicPath = `/topic/draw/${roomCode}`;
            console.log('[WebSocket] Subscribing to:', topicPath);
            const subscription = client.subscribe(
                topicPath,
                (message) => {
                    console.log('[WebSocket] Received message:', message.body);
                    const event: DrawEvent = JSON.parse(message.body);
                    console.log('[WebSocket] Parsed event:', event, 'My userId:', userId);
                    // Ignore own events to prevent duplication
                    if (event.userId === userId) {
                        console.log('[WebSocket] Ignoring own event');
                        return;
                    }
                    console.log('[WebSocket] Processing partner event');
                    handleIncomingDrawEvent(event);
                }
            );
            subscriptionRef.current = subscription;
            console.log('[WebSocket] Subscription active');

            // Ask other client for current canvas state (if any)
            sendDrawEvent({
                eventType: 'SYNC_REQUEST',
            });
        };

        client.onStompError = (frame) => {
            console.error('STOMP error:', frame);
            setPartnerConnected(false);
        };

        client.onWebSocketClose = () => {
            console.log('WebSocket closed');
            setPartnerConnected(false);
        };

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
            }
            client.deactivate();
        };
    }, [roomCode, session, apiUrl, userId]);

    function drawSegment(ctx: CanvasRenderingContext2D, from: Point, to: Point, stroke: StrokeSnapshot) {
        ctx.save();
        ctx.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
        ctx.lineWidth = stroke.thickness;
        ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.restore();
    }

    function drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokeSnapshot) {
        if (stroke.points.length < 2) return;
        for (let i = 1; i < stroke.points.length; i++) {
            drawSegment(ctx, stroke.points[i - 1], stroke.points[i], stroke);
        }
    }

    function redrawCanvas() {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokesRef.current.forEach((stroke) => drawStroke(ctx, stroke));
    }

    function applyClear() {
        strokesRef.current = [];
        activeStrokesRef.current.clear();
        redrawCanvas();
    }

    function applyUndo(strokeId?: string) {
        if (!strokeId) return;
        const before = strokesRef.current.length;
        strokesRef.current = strokesRef.current.filter((s) => s.strokeId !== strokeId);
        if (strokesRef.current.length !== before) {
            redrawCanvas();
        }
    }

    // Handle incoming draw events from partner
    const handleIncomingDrawEvent = (event: DrawEvent) => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        const { strokeId, eventType, x, y, color, thickness, tool, strokes } = event;

        if (eventType === 'CLEAR') {
            applyClear();
            return;
        }

        if (eventType === 'UNDO') {
            applyUndo(strokeId);
            return;
        }

        if (eventType === 'SYNC_REQUEST') {
            if (strokesRef.current.length > 0) {
                sendDrawEvent({
                    eventType: 'SYNC_STATE',
                    strokes: strokesRef.current,
                });
            }
            return;
        }

        if (eventType === 'SYNC_STATE') {
            strokesRef.current = strokes || [];
            activeStrokesRef.current.clear();
            redrawCanvas();
            return;
        }

        if (!strokeId || typeof x !== 'number' || typeof y !== 'number' || !color || !thickness || !tool) {
            return;
        }

        if (eventType === 'START') {
            activeStrokesRef.current.set(strokeId, {
                strokeId,
                userId: event.userId,
                points: [{ x, y }],
                color,
                thickness,
                tool,
            });
        } else if (eventType === 'MOVE') {
            const stroke = activeStrokesRef.current.get(strokeId);
            if (stroke) {
                const lastPoint = stroke.points[stroke.points.length - 1];
                stroke.points.push({ x, y });
                drawSegment(ctx, lastPoint, { x, y }, stroke);
            }
        } else if (eventType === 'END') {
            const stroke = activeStrokesRef.current.get(strokeId);
            if (stroke) {
                strokesRef.current.push(stroke);
                activeStrokesRef.current.delete(strokeId);
            }
        }
    };

    // Send draw event to server
    const sendDrawEvent = (event: Omit<DrawEvent, 'roomCode' | 'userId'>) => {
        if (!stompClientRef.current?.connected || !roomCode) {
            console.warn('[Draw] Cannot send event - not connected or no room code');
            return;
        }

        const fullEvent: DrawEvent = {
            ...event,
            roomCode,
            userId,
        };

        console.log('[Draw] Sending event:', fullEvent.eventType, fullEvent);
        stompClientRef.current.publish({
            destination: '/app/draw',
            body: JSON.stringify(fullEvent),
        });
    };

    // Get canvas coordinates from mouse/touch event
    const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        let clientX: number, clientY: number;

        if ('touches' in e) {
            if (e.touches.length === 0) return null;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    // Start drawing
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const coords = getCanvasCoordinates(e);
        if (!coords || !ctxRef.current) return;

        setIsDrawing(true);
        currentStrokeId.current = `${userId}-${Date.now()}`;

        // Start local stroke
        activeStrokesRef.current.set(currentStrokeId.current, {
            strokeId: currentStrokeId.current,
            userId,
            points: [coords],
            color,
            thickness,
            tool,
        });

        // Draw starting point locally for instant feedback
        const ctx = ctxRef.current;
        ctx.save();
        ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
        ctx.lineWidth = thickness;
        ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, thickness / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Send START event
        sendDrawEvent({
            x: coords.x,
            y: coords.y,
            color,
            thickness,
            tool,
            strokeId: currentStrokeId.current,
            eventType: 'START',
        });
    };

    // Continue drawing - sends MOVE events continuously for smooth real-time rendering
    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;

        const coords = getCanvasCoordinates(e);
        if (!coords || !ctxRef.current) return;

        const stroke = activeStrokesRef.current.get(currentStrokeId.current);
        if (!stroke) return;

        const lastPoint = stroke.points[stroke.points.length - 1];
        stroke.points.push(coords);

        // Draw locally immediately for instant feedback (no lag)
        const ctx = ctxRef.current;
        ctx.save();
        ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
        ctx.lineWidth = thickness;
        ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        ctx.restore();

        // Throttle MOVE events to ~15-20ms for smooth motion without overwhelming the network
        const now = Date.now();
        if (now - lastSentTime.current >= 15) {
            sendDrawEvent({
                x: coords.x,
                y: coords.y,
                color,
                thickness,
                tool,
                strokeId: currentStrokeId.current,
                eventType: 'MOVE',
            });
            lastSentTime.current = now;
        }
    };

        // Stop drawing
    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;

        setIsDrawing(false);

        // Send final MOVE event with current position
        const coords = getCanvasCoordinates(e);
        if (coords) {
            sendDrawEvent({
                x: coords.x,
                y: coords.y,
                color,
                thickness,
                tool,
                strokeId: currentStrokeId.current,
                eventType: 'MOVE',
            });
        }

        // Send END event to signal stroke completion
        sendDrawEvent({
            x: coords?.x || 0,
            y: coords?.y || 0,
            color,
            thickness,
            tool,
            strokeId: currentStrokeId.current,
            eventType: 'END',
        });

        const finishedStroke = activeStrokesRef.current.get(currentStrokeId.current);
        if (finishedStroke) {
            strokesRef.current.push(finishedStroke);
        }
        activeStrokesRef.current.delete(currentStrokeId.current);
    };

    // Clear canvas (synced)
    const clearCanvas = () => {
        applyClear();
        sendDrawEvent({
            eventType: 'CLEAR',
        });
    };

    // Undo last stroke by current user (synced)
    const undoLastStroke = () => {
        const lastIndex = [...strokesRef.current]
            .map((s, index) => ({ stroke: s, index }))
            .filter((entry) => entry.stroke.userId === userId)
            .map((entry) => entry.index)
            .pop();

        if (lastIndex === undefined) return;

        const strokeId = strokesRef.current[lastIndex]?.strokeId;
        if (!strokeId) return;

        strokesRef.current.splice(lastIndex, 1);
        redrawCanvas();
        sendDrawEvent({
            eventType: 'UNDO',
            strokeId,
        });
    };

    return (
        <div className="playground-container">
            {/* Header */}
            <div className="playground-header">
                <button className="back-btn" onClick={() => navigate('/options')}>
                    ← Back
                </button>
                <h1 className="playground-title">Playground Space</h1>
                <div className="connection-status">
                    <span className={`status-indicator ${partnerConnected ? 'connected' : 'disconnected'}`} />
                    {partnerConnected ? 'Partner Connected' : 'Partner Disconnected'}
                </div>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
                <div className="toolbar-section">
                    <label>Tool:</label>
                    <button
                        className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
                        onClick={() => setTool('pen')}
                    >
                        ✏️ Pen
                    </button>
                    <button
                        className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                        onClick={() => setTool('eraser')}
                    >
                        🧹 Eraser
                    </button>
                </div>

                <div className="toolbar-section">
                    <label>Color:</label>
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        disabled={tool === 'eraser'}
                        className="color-picker"
                    />
                </div>

                <div className="toolbar-section">
                    <label>Thickness:</label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={thickness}
                        onChange={(e) => setThickness(Number(e.target.value))}
                        className="thickness-slider"
                    />
                    <span className="thickness-value">{thickness}px</span>
                </div>

                <button className="undo-btn" onClick={undoLastStroke}>
                    ↩️ Undo
                </button>
                <button className="clear-btn" onClick={clearCanvas}>
                    🗑️ Clear Canvas
                </button>
            </div>

            {/* Canvas */}
            <div className="canvas-container">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="drawing-canvas"
                />
            </div>
        </div>
    );
}
