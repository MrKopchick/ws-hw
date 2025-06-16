import { findRoomByName, findRoomBySocket } from "../utils/room-utilities.js";
import { createUser } from "../utils/user-utilities.js";
import { endGame } from "./game-handlers.js";
const EMPTY = 0;
const INVALID_INDEX = -1;
const COMMON_INDEX = 1;
const joinRoom = async ({ io, roomName, rooms, socket, username }) => {
    const room = findRoomByName(rooms, roomName);
    if (!room) {
        return;
    }
    await socket.join(roomName);
    const user = createUser(socket.id, username);
    room.users.push(user);
    socket.emit("joined_room", {
        gameStarted: room.gameStarted,
        name: room.name,
        users: room.users.map((u) => ({
            progress: u.progress,
            ready: u.ready,
            username: u.username
        }))
    });
    socket.to(roomName).emit("user_joined", {
        ready: user.ready,
        username: user.username
    });
    io.to(roomName).emit("room_updated", {
        gameStarted: room.gameStarted,
        name: room.name,
        users: room.users.map((u) => ({
            progress: u.progress,
            ready: u.ready,
            username: u.username
        }))
    });
};
const leaveRoom = (io, socket, rooms) => {
    const room = findRoomBySocket(rooms, socket);
    if (!room) {
        return;
    }
    const user = room.users.find((u) => u.id === socket.id);
    if (!user) {
        return;
    }
    room.users = room.users.filter((u) => u.id !== socket.id);
    io.to(room.name).emit("user_left", {
        isDisconnected: true,
        username: user.username
    });
    handlePostDisconnectGameState(io, room, rooms);
};
const handlePostDisconnectGameState = (io, room, rooms) => {
    if (room.gameStarted) {
        if (room.users.length === EMPTY) {
            cleanupRoom(io, room, rooms);
        }
        else if (room.users.every((u) => u.finished)) {
            endGame(io, room);
        }
    }
    else if (room.users.length === EMPTY) {
        cleanupRoom(io, room, rooms);
    }
};
const cleanupRoom = (io, room, rooms) => {
    if (room.timer) {
        clearTimeout(room.timer);
    }
    if (room.gameEndTimer) {
        clearTimeout(room.gameEndTimer);
    }
    const index = rooms.findIndex((r) => r.name === room.name);
    if (index !== INVALID_INDEX) {
        rooms.splice(index, COMMON_INDEX);
    }
    io.emit("room_removed", room.name);
};
export { joinRoom, leaveRoom };
