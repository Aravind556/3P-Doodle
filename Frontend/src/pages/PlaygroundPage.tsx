import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Client, StompSubscription } from '@stomp/stompjs';
import { useAuth } from '../context/AuthContext';
import { createStompClient } from '../lib/realtime';
import type { DrawEvent, Point, StrokeSnapshot, Tool, WhiteboardStateResponse } from '../lib/whiteboard';
import './PlaygroundPage.css';

export function PlaygroundPage() {
    const navigate = useNavigate();
    const { user, session } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const subscriptionRef = useRef<StompSubscription | null>(null);
    const roomSubscriptionRef = useRef<StompSubscription | null>(null);
    const stompClientRef = useRef<Client | null>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [thickness, setThickness] = useState(3);
    const [tool, setTool] = useState<Tool>('pen');
    const [roomCode, setRoomCode] = useState<string>('');
    const [partnerConnected, setPartnerConnected] = useState(false);

    const currentStrokeId = useRef<string>('');
    const activeStrokesRef = useRef<Map<string, StrokeSnapshot>>(new Map());
    const strokesRef = useRef<StrokeSnapshot[]>([]);
    const lastVersionRef = useRef<number>(0);
    const moveBufferRef = useRef<Point[]>([]);
    const flushTimerRef = useRef<number | null>(null);
    const lastSentPointRef = useRef<Point | null>(null);

    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';
    const userId = user?.id || 'unknown';

    const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: StrokeSnapshot) => {
        if (stroke.points.length === 0) return;

        ctx.save();
        ctx.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
        ctx.fillStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
        ctx.lineWidth = stroke.thickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

        if (stroke.points.length === 1) {
            const point = stroke.points[0];
            ctx.beginPath();
            ctx.arc(point.x, point.y, stroke.thickness / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        if (stroke.points.length === 2) {
            ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
        } else {
            for (let i = 1; i < stroke.points.length - 1; i++) {
                const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
                const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
                ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
            }
            // Draw last point
            const last = stroke.points[stroke.points.length - 1];
            ctx.lineTo(last.x, last.y);
        }

        ctx.stroke();
        ctx.restore();
    }, []);

    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokesRef.current.forEach((stroke) => drawStroke(ctx, stroke));
        activeStrokesRef.current.forEach((stroke) => drawStroke(ctx, stroke));
    }, [drawStroke]);

    const applyClear = useCallback(() => {
        strokesRef.current = [];
        activeStrokesRef.current.clear();
        redrawCanvas();
    }, [redrawCanvas]);

    const applyUndo = useCallback((strokeId?: string, authorUserId?: string) => {
        if (strokeId) {
            strokesRef.current = strokesRef.current.filter((s) => s.strokeId !== strokeId || (authorUserId && s.userId !== authorUserId));
            activeStrokesRef.current.delete(strokeId);
            redrawCanvas();
            return;
        }

        for (let i = strokesRef.current.length - 1; i >= 0; i--) {
            if (!authorUserId || strokesRef.current[i].userId === authorUserId) {
                strokesRef.current.splice(i, 1);
                redrawCanvas();
                return;
            }
        }
    }, [redrawCanvas]);

    const loadWhiteboardState = useCallback(async (roomCodeValue: string) => {
        if (!session) return;
        const res = await fetch(`${apiUrl}/whiteboard/state?roomCode=${encodeURIComponent(roomCodeValue)}`, {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        });
        if (!res.ok) return;
        const data: WhiteboardStateResponse = await res.json();
        strokesRef.current = data.strokes || [];
        activeStrokesRef.current.clear();
        lastVersionRef.current = data.version || 0;
        redrawCanvas();
    }, [apiUrl, redrawCanvas, session]);

    const handleIncomingDrawEvent = useCallback((event: DrawEvent) => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        const { strokeId, eventType, x, y, points, color, thickness, tool } = event;

        // Version guard only for destructive / state-reset events.
        // For live stroke events (START/MOVE/END) we NEVER skip — concurrent
        // partner strokes can legitimately arrive with the same or lower version
        // numbers and must still be rendered.
        if (eventType === 'CLEAR' || eventType === 'UNDO') {
            if (event.version && event.version <= lastVersionRef.current) {
                return;
            }
        }
        if (event.version) {
            lastVersionRef.current = event.version;
        }

        if (eventType === 'CLEAR') {
            applyClear();
            return;
        }

        if (eventType === 'UNDO') {
            applyUndo(strokeId, event.userId);
            return;
        }

        if (!strokeId || !color || !thickness || !tool) {
            return;
        }

        if (eventType === 'START') {
            if (typeof x !== 'number' || typeof y !== 'number') {
                return;
            }
            activeStrokesRef.current.set(strokeId, {
                strokeId,
                userId: event.userId,
                points: [{ x, y }],
                color,
                thickness,
                tool,
            });
            // Skip rendering our own echoed START (already drawn locally).
            if (event.userId === userId) return;

            redrawCanvas();

        } else if (eventType === 'MOVE' || eventType === 'END') {
            // Our own MOVE/END events are already applied optimistically on the
            // local stroke as the pointer moves. Re-applying the server echo here
            // would append stale points after newer local ones and corrupt point
            // ordering on the next redraw, so we only update version tracking
            // (already done above) and skip re-processing for our own events.
            if (event.userId === userId) {
                if (eventType === 'END') {
                    // Defensive cleanup only; stopDrawing() already removes this
                    // entry synchronously before the echo can arrive.
                    activeStrokesRef.current.delete(strokeId);
                }
                return;
            }

            let stroke = activeStrokesRef.current.get(strokeId);

            // Graceful recovery: if we missed the START frame, reconstruct the
            // stroke entry from the metadata carried in this MOVE/END event.
            if (!stroke) {
                const seedPoint = points && points.length > 0
                    ? points[0]
                    : (typeof x === 'number' && typeof y === 'number' ? { x, y } : null);
                if (!seedPoint) return;
                console.warn('[Draw] Missed START for strokeId=%s — recovering from %s', strokeId, eventType);
                const recovered: StrokeSnapshot = {
                    strokeId,
                    userId: event.userId,
                    points: [seedPoint],
                    color,
                    thickness,
                    tool,
                };
                activeStrokesRef.current.set(strokeId, recovered);
                stroke = recovered;
            }

            const incomingPoints = points && points.length > 0
                ? points
                : (typeof x === 'number' && typeof y === 'number' ? [{ x, y }] : []);

            let hasNewPoint = false;
            for (const nextPoint of incomingPoints) {
                const lastPoint = stroke.points[stroke.points.length - 1];
                if (!lastPoint || lastPoint.x !== nextPoint.x || lastPoint.y !== nextPoint.y) {
                    stroke.points.push(nextPoint);
                    hasNewPoint = true;
                }
            }

            if (hasNewPoint) {
                redrawCanvas();
            }

            if (eventType === 'END') {
                strokesRef.current.push(stroke);
                activeStrokesRef.current.delete(strokeId);
                redrawCanvas();
            }
        }
    }, [applyClear, applyUndo, drawStroke, redrawCanvas, userId]);

    const sendDrawEvent = useCallback((event: Omit<DrawEvent, 'roomCode' | 'userId'>) => {
        if (!stompClientRef.current?.connected || !roomCode) {
            console.warn('[Draw] Cannot send — not connected (connected=%s, roomCode=%s)',
                stompClientRef.current?.connected, roomCode);
            return;
        }
        const fullEvent: DrawEvent = {
            ...event,
            roomCode,
            userId,
        };
        stompClientRef.current.publish({
            destination: '/app/draw',
            body: JSON.stringify(fullEvent),
        });
    }, [roomCode, userId]);

    const getCanvasCoordinates = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);

    const flushMoveBuffer = useCallback(() => {
        const buffer = moveBufferRef.current;
        if (buffer.length === 0) return;

        const dedupedPoints: Point[] = [];
        let previous = lastSentPointRef.current;

        for (const point of buffer) {
            if (!previous || previous.x !== point.x || previous.y !== point.y) {
                dedupedPoints.push(point);
                previous = point;
            }
        }

        if (dedupedPoints.length === 0) {
            moveBufferRef.current = [];
            return;
        }

        sendDrawEvent({
            points: dedupedPoints,
            x: dedupedPoints[dedupedPoints.length - 1].x,
            y: dedupedPoints[dedupedPoints.length - 1].y,
            color,
            thickness,
            tool,
            strokeId: currentStrokeId.current,
            eventType: 'MOVE',
        });
        lastSentPointRef.current = dedupedPoints[dedupedPoints.length - 1];
        moveBufferRef.current = [];
    }, [color, sendDrawEvent, thickness, tool]);

    const scheduleMoveFlush = useCallback(() => {
        if (flushTimerRef.current) return;
        flushTimerRef.current = window.setTimeout(() => {
            flushMoveBuffer();
            flushTimerRef.current = null;
        }, 16); // ~60 fps cadence; was 32ms
    }, [flushMoveBuffer]);

    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const coords = getCanvasCoordinates(e);
        if (!coords || !ctxRef.current) return;

        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDrawing(true);
        currentStrokeId.current = `${userId}-${Date.now()}`;
        moveBufferRef.current = [];
        lastSentPointRef.current = coords;

        activeStrokesRef.current.set(currentStrokeId.current, {
            strokeId: currentStrokeId.current,
            userId,
            points: [coords],
            color,
            thickness,
            tool,
        });

        redrawCanvas();

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

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const coords = getCanvasCoordinates(e);
        if (!coords || !ctxRef.current) return;

        const stroke = activeStrokesRef.current.get(currentStrokeId.current);
        if (!stroke) return;

        stroke.points.push(coords);

        redrawCanvas();
        moveBufferRef.current.push(coords);
        scheduleMoveFlush();
    };

    const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const coords = getCanvasCoordinates(e);
        if (flushTimerRef.current) {
            window.clearTimeout(flushTimerRef.current);
            flushTimerRef.current = null;
        }
        flushMoveBuffer();

        const finalPoint = coords ?? lastSentPointRef.current;
        if (finalPoint) {
            sendDrawEvent({
                points: [finalPoint],
                x: finalPoint.x,
                y: finalPoint.y,
                color,
                thickness,
                tool,
                strokeId: currentStrokeId.current,
                eventType: 'END',
            });
        }

        const finishedStroke = activeStrokesRef.current.get(currentStrokeId.current);
        if (finishedStroke) {
            strokesRef.current.push(finishedStroke);
            activeStrokesRef.current.delete(currentStrokeId.current);
        }
        lastSentPointRef.current = null;
    };

    const clearCanvas = () => {
        applyClear();
        sendDrawEvent({ eventType: 'CLEAR' });
    };

    const undoLastStroke = () => {
        const lastIndex = [...strokesRef.current]
            .map((stroke, index) => ({ stroke, index }))
            .filter((entry) => entry.stroke.userId === userId)
            .map((entry) => entry.index)
            .pop();

        if (lastIndex === undefined) return;
        const strokeId = strokesRef.current[lastIndex]?.strokeId;
        strokesRef.current.splice(lastIndex, 1);
        redrawCanvas();
        sendDrawEvent({ eventType: 'UNDO', strokeId });
    };

    useEffect(() => {
        const fetchRoomCode = async () => {
            if (!session) return;
            try {
                const res = await fetch(`${apiUrl}/room/status`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                if (data.roomCode) {
                    setRoomCode(data.roomCode);
                    setPartnerConnected(data.status === 'PAIRED');
                } else {
                    navigate('/Home');
                }
            } catch {
                // ignore
            }
        };
        fetchRoomCode();
    }, [session, apiUrl, navigate]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

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
    }, [redrawCanvas]);

    useEffect(() => {
        if (!roomCode || !session) return;

        const client = createStompClient(apiUrl, session.access_token, 'Playground');

        client.onConnect = async () => {
            setPartnerConnected(true);

            subscriptionRef.current = client.subscribe(`/topic/draw/${roomCode}`, (message) => {
                const event: DrawEvent = JSON.parse(message.body);
                handleIncomingDrawEvent(event);
            });

            roomSubscriptionRef.current = client.subscribe(`/topic/room/${roomCode}`, (message) => {
                const event = JSON.parse(message.body) as { status?: string };
                if (event.status === 'NO_ROOM') {
                    navigate('/Home');
                    return;
                }
                if (event.status === 'PAIRED') {
                    setPartnerConnected(true);
                }
            });

            await loadWhiteboardState(roomCode);
        };

        client.onStompError = () => setPartnerConnected(false);
        client.onWebSocketClose = () => setPartnerConnected(false);

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
            if (roomSubscriptionRef.current) roomSubscriptionRef.current.unsubscribe();
            if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
            client.deactivate();
        };
    }, [apiUrl, handleIncomingDrawEvent, loadWhiteboardState, navigate, roomCode, session]);

    return (
        <div className="playground-container">
            <div className="playground-header">
                <button className="back-btn" onClick={() => navigate('/options')}>
                    ← Back
                </button>
                <h1 className="playground-title">Playground Space</h1>
                <div className="connection-status">
                    <span className={`status-indicator ${partnerConnected ? 'connected' : 'disconnected'}`} />
                    {partnerConnected ? 'Room Connected' : 'Reconnecting...'}
                </div>
            </div>

            <div className="toolbar">
                <div className="toolbar-section">
                    <label>Tool:</label>
                    <button className={`tool-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')}>
                        ✏️ Pen
                    </button>
                    <button className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>
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

            <div className="canvas-container">
                <canvas
                    ref={canvasRef}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                    className="drawing-canvas"
                />
            </div>
        </div>
    );
}
