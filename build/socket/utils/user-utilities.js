const createUser = (socketId, username) => {
    return {
        id: socketId,
        isDisconnected: false,
        progress: 0,
        ready: false,
        username
    };
};
const isUsernameTaken = (rooms, username) => {
    return rooms.some((room) => room.users.some((user) => user.username === username));
};
export { createUser, isUsernameTaken };
