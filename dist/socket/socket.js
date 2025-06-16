import { handlePlayerDisconnect, handlePlayerFinished, handleProgressUpdate, handleReadyToggle, handleRequestRoomReset } from "./handlers/game-handlers.js";
import { handleRoomCreation, handleRoomJoin, handleRoomLeave } from "./handlers/room-handlers.js";
import { isUsernameTaken } from "./utils/user-utilities.js";
const rooms = [];
const initializeSocketHandlers = (io, socket, rooms) => {
    const { username } = socket.handshake.query;
    if (typeof username !== "string" || !username) {
        socket.disconnect();
        return;
    }
    if (isUsernameTaken(rooms, username)) {
        socket.emit("username_taken");
        socket.disconnect();
        return;
    }
    socket.emit("initial_rooms", rooms);
    socket.on("create_room", handleRoomCreation(io, socket, rooms));
    socket.on("join_room", handleRoomJoin(io, socket, rooms));
    socket.on("leave_room", handleRoomLeave(io, socket, rooms));
    socket.on("toggle_ready", handleReadyToggle(io, socket, rooms));
    socket.on("progress_update", handleProgressUpdate(io, socket, rooms));
    socket.on("player_finished", handlePlayerFinished(io, socket, rooms));
    socket.on("request_room_reset", handleRequestRoomReset(io, socket, rooms));
    socket.on("disconnect", () => {
        handlePlayerDisconnect(io, socket, rooms)();
    });
};
const socketHandler = (io) => {
    io.on("connection", (socket) => {
        initializeSocketHandlers(io, socket, rooms);
    });
};
export { socketHandler };
