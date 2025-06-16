import { type Server, type Socket } from "socket.io";

interface JoinRoomParameters {
    io: Server;
    roomName: string;
    rooms: Room[];
    socket: Socket;
    username: string;
}

interface Room {
    gameEndTimer?: ReturnType<typeof setTimeout>;
    gameStarted?: boolean;
    gameStartTime?: number;
    gameTextId?: number;
    name: string;
    timer?: ReturnType<typeof setTimeout>;
    users: User[];
}

interface User {
    currentText?: string;
    finished?: boolean;
    finishedAt?: number;
    id: string;
    isDisconnected: boolean;
    progress: number;
    ready: boolean;
    username: string;
}

export { type JoinRoomParameters, type Room, type User };
