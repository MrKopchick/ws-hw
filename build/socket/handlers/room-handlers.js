import { MAXIMUM_USERS_FOR_ONE_ROOM } from "../config.js";
import { createNewRoom, findRoomByName } from "../utils/room-utilities.js";
import { joinRoom, leaveRoom } from "./room-actions.js";
const handleRoomCreation = (io, socket, rooms) => async (roomName) => {
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
        username: socket.handshake.query.username
    });
};
const handleRoomJoin = (io, socket, rooms) => async (roomName) => {
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
        username: socket.handshake.query.username
    });
};
const handleRoomLeave = (io, socket, rooms) => () => {
    leaveRoom(io, socket, rooms);
};
export { handleRoomCreation, handleRoomJoin, handleRoomLeave };
