export type DrawEventType = 'START' | 'MOVE' | 'END' | 'CLEAR' | 'UNDO' | 'SNAPSHOT';
export type Tool = 'pen' | 'eraser';

export interface Point {
    x: number;
    y: number;
}

export interface StrokeSnapshot {
    strokeId: string;
    userId: string;
    points: Point[];
    color: string;
    thickness: number;
    tool: Tool;
}

export interface DrawEvent {
    roomCode: string;
    userId: string;
    eventType: DrawEventType;
    strokeId?: string;
    x?: number;
    y?: number;
    points?: Point[];
    color?: string;
    thickness?: number;
    tool?: Tool;
    strokes?: StrokeSnapshot[];
    version?: number;
}

export interface WhiteboardStateResponse {
    roomCode: string;
    version: number;
    strokes: StrokeSnapshot[];
}
