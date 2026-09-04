import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export function createStompClient(apiUrl: string, accessToken: string, debugLabel?: string) {
    return new Client({
        webSocketFactory: () => new SockJS(`${apiUrl}/ws`),
        connectHeaders: {
            Authorization: `Bearer ${accessToken}`,
        },
        debug: (message) => {
            if (import.meta.env.DEV) {
                console.log(debugLabel ? `[${debugLabel}] ${message}` : message);
            }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
    });
}
