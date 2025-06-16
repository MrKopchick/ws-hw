import { type Room, type User } from "../../types.js";

const createUser = (socketId: string, username: string): User => {
    return {
        id: socketId,
        isDisconnected: false,
        progress: 0,
        ready: false,
        username
    };
};

const isUsernameTaken = (rooms: Room[], username: string): boolean => {
    return rooms.some((room) => room.users.some((user) => user.username === username));
};

export { createUser, isUsernameTaken };
