import { type Socket } from "socket.io";

import { type Room } from "../../types.js";

const findRoomByName = (rooms: Room[], name: string): Room | undefined => {
    return rooms.find((room) => room.name === name);
};

const findRoomBySocket = (rooms: Room[], socket: Socket): Room | undefined => {
    return rooms.find((room) => room.users.some((user) => user.id === socket.id));
};

const removeRoom = (rooms: Room[], roomName: string): Room[] => {
    return rooms.filter((room) => room.name !== roomName);
};

const createNewRoom = (name: string): Room => {
    return {
        gameStarted: false,
        name,
        users: []
    };
};

export { createNewRoom, findRoomByName, findRoomBySocket, removeRoom };

/*

*/