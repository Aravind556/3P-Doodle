export interface RoomStatusResponse {
    status: 'NO_ROOM' | 'WAITING' | 'PAIRED';
    code?: string;
    roomCode?: string;
    partner?: string;
    partnerEmail?: string;
}

export interface RoomStatusEvent {
    roomCode: string;
    status: 'NO_ROOM' | 'WAITING' | 'PAIRED';
    partner?: string;
    partnerEmail?: string;
    message?: string;
}
