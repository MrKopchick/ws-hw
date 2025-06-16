import { type Server, type Socket } from "socket.io";

import { type Room } from "../../types.js";
import { MAXIMUM_USERS_FOR_ONE_ROOM } from "../config.js";
import { createNewRoom, findRoomByName } from "../utils/room-utilities.js";
import { joinRoom, leaveRoom } from "./room-actions.js";

const handleRoomCreation =
    (io: Server, socket: Socket, rooms: Room[]) =>
    async (roomName: string): Promise<void> => {
        if (!roomName.trim()) {
            socket.emit("invalid_room_name");

            return;
        }

        if (findRoomByName(rooms, roomName)) {
            socket.emit("room_exists");

            return;
        }

        const newRoom = createNewRoom(roomName);
        rooms.push(newRoom);

        io.emit("room_created", {
            name: newRoom.name,
            users: newRoom.users
        });

        await joinRoom({
            io,
            roomName,
            rooms,
            socket,
            username: socket.handshake.query.username as string
        });
    };

const handleRoomJoin =
    (io: Server, socket: Socket, rooms: Room[]) =>
    async (roomName: string): Promise<void> => {
        const room = findRoomByName(rooms, roomName);

        if (!room) {
            socket.emit("room_not_found");

            return;
        }

        if (room.users.length >= MAXIMUM_USERS_FOR_ONE_ROOM) {
            socket.emit("room_full");

            return;
        }

        if (room.gameStarted) {
            socket.emit("game_already_started");

            return;
        }

        await joinRoom({
            io,
            roomName,
            rooms,
            socket,
            username: socket.handshake.query.username as string
        });
    };

const handleRoomLeave = (io: Server, socket: Socket, rooms: Room[]) => (): void => {
    leaveRoom(io, socket, rooms);
};

export { handleRoomCreation, handleRoomJoin, handleRoomLeave };
