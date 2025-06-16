const findRoomByName = (rooms, name) => {
    return rooms.find((room) => room.name === name);
};
const findRoomBySocket = (rooms, socket) => {
    return rooms.find((room) => room.users.some((user) => user.id === socket.id));
};
const removeRoom = (rooms, roomName) => {
    return rooms.filter((room) => room.name !== roomName);
};
const createNewRoom = (name) => {
    return {
        gameStarted: false,
        name,
        users: []
    };
};
export { createNewRoom, findRoomByName, findRoomBySocket, removeRoom };
/*

*/ 
