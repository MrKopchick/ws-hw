import { type Server, type Socket } from "socket.io";

import { texts } from "../../data.js";
import { type Room } from "../../types.js";
import { SECONDS_FOR_GAME, SECONDS_TIMER_BEFORE_START_GAME } from "../config.js";
import { findRoomBySocket } from "../utils/room-utilities.js";

const SECOND = 1000;
const EMPTY = 0;
const PROGRESS_COMPLETE = 100;
const INVALID_INDEX = -1;
const COMMON_INDEX = 1;
const FIRST_ELEMENT = 0;

const checkAllReady = (io: Server, room: Room): void => {
    const allReady = room.users.every((user) => user.ready);

    if (allReady && room.users.length > EMPTY) {
        startCountdown(io, room);
    } else if (room.timer) {
        clearTimeout(room.timer);
        delete room.timer;
        io.to(room.name).emit("countdown_canceled");
    }
};

const startCountdown = (io: Server, room: Room): void => {
    // hate eslint for this... wtf? why i cant use math random?? i must use crypto shit, bruhhhh
    if (texts.length === EMPTY) {       
        throw new Error("No game texts available to start the game.");
    }

    let randomIndex: number;

    if (typeof globalThis.crypto.getRandomValues === "function") {
        const array = new Uint32Array(COMMON_INDEX);
        globalThis.crypto.getRandomValues(array);
        randomIndex = array[FIRST_ELEMENT] % texts.length;
    } else {
        throw new TypeError("A secure random number generator is required to select the game text.");
    }

    room.gameTextId = randomIndex;

    room.timer = setTimeout(() => {
        room.gameStarted = true;
        room.gameStartTime = Date.now();
        io.to(room.name).emit("game_started", room.gameTextId);

        room.gameEndTimer = setTimeout(() => {
            endGame(io, room);
        }, SECONDS_FOR_GAME * SECOND);
    }, SECONDS_TIMER_BEFORE_START_GAME * SECOND);

    io.to(room.name).emit("countdown_started", SECONDS_TIMER_BEFORE_START_GAME);
};

const endGame = (io: Server, room: Room): void => {
    if (!room.gameStarted) {
        return;
    }

    const finishedUsers = room.users
        .filter((user) => user.finished && user.finishedAt)
        .sort((a, b) => (a.finishedAt || EMPTY) - (b.finishedAt || EMPTY));

    const unfinishedUsers = room.users
        .filter((user) => !user.finished)
        .map((user) => ({
            finished: false,
            finishedAt: (room.gameStartTime ?? EMPTY) + SECONDS_FOR_GAME * SECOND,
            time: SECONDS_FOR_GAME,
            username: user.username
        }));

    const allResults = [...finishedUsers, ...unfinishedUsers].sort(
        (a, b) => (a.finishedAt || Infinity) - (b.finishedAt || Infinity)
    );

    io.to(room.name).emit("game_ended", {
        results: allResults.map((user) => ({
            finished: !!user.finishedAt,
            time: user.finishedAt ? (user.finishedAt - (room.gameStartTime ?? EMPTY)) / SECOND : SECONDS_FOR_GAME,
            username: user.username
        }))
    });

    resetGameState(io, room);
};

const resetGameState = (io: Server, room: Room): void => {
    room.gameStarted = false;
    delete room.gameStartTime;

    for (const user of room.users) {
        user.ready = false;
        user.finished = false;
        user.progress = 0;
        delete user.finishedAt;
    }

    if (room.timer) {
        clearTimeout(room.timer);
    }

    if (room.gameEndTimer) {
        clearTimeout(room.gameEndTimer);
    }

    delete room.timer;
    delete room.gameEndTimer;

    for (const user of room.users) {
        io.to(room.name).emit("user_updated", user);
    }

    io.to(room.name).emit("room_reset");
};

const handleReadyToggle = (io: Server, socket: Socket, rooms: Room[]) => (): void => {
    const room = findRoomBySocket(rooms, socket);

    if (!room || room.gameStarted) {
        return;
    }

    const user = room.users.find((u) => u.id === socket.id);

    if (!user) {
        return;
    }

    user.ready = !user.ready;
    io.to(room.name).emit("user_updated", user);
    checkAllReady(io, room);
};

const handleProgressUpdate =
    (io: Server, socket: Socket, rooms: Room[]) =>
    (progress: number): void => {
        const room = findRoomBySocket(rooms, socket);

        if (!room || !room.gameStarted) {
            return;
        }

        const user = room.users.find((u) => u.id === socket.id);

        if (!user) {
            return;
        }

        user.progress = progress;

        if (progress >= PROGRESS_COMPLETE && !user.finished) {
            user.finished = true;
            user.finishedAt = Date.now();

            const allFinished = room.users.every((user) => user.finished);

            if (allFinished) {
                endGame(io, room);
            } else {
                socket.emit("player_finished_early", {
                    time: (user.finishedAt - (room.gameStartTime ?? EMPTY)) / SECOND
                });
            }
        }

        io.to(room.name).emit("user_progress", {
            progress,
            username: user.username
        });
    };

const handlePlayerFinished = (io: Server, socket: Socket, rooms: Room[]) => (): void => {
    const room = findRoomBySocket(rooms, socket);

    if (!room || !room.gameStarted) {
        return;
    }

    const user = room.users.find((u) => u.id === socket.id);

    if (!user) {
        return;
    }

    user.finished = true;
    user.finishedAt = Date.now();
    user.progress = 100;

    if (room.users.every((user) => user.finished)) {
        endGame(io, room);
    }

    io.to(room.name).emit("user_progress", { progress: PROGRESS_COMPLETE, username: user.username });
};

const removeRoomIfEmpty = (io: Server, rooms: Room[], room: Room): void => {
    if (room.users.length === EMPTY) {
        const index = rooms.findIndex((r) => r.name === room.name);

        if (index !== INVALID_INDEX) {
            rooms.splice(index, COMMON_INDEX);
        }

        io.emit("room_removed", room.name);
    }
};

const handlePlayerDisconnect = (io: Server, socket: Socket, rooms: Room[]) => (): void => {
    const room = findRoomBySocket(rooms, socket);

    if (!room) {
        return;
    }

    const user = room.users.find((u) => u.id === socket.id);

    if (!user) {
        return;
    }

    room.users = room.users.filter((user) => user.id !== socket.id);
    io.to(room.name).emit("user_left", { username: user.username });

    if (room.gameStarted) {
        if (room.users.length === EMPTY) {
            endGame(io, room);
            removeRoomIfEmpty(io, rooms, room);
        } else if (room.users.every((user) => user.finished)) {
            endGame(io, room);
        }
    } else {
        if (room.users.length === EMPTY) {
            removeRoomIfEmpty(io, rooms, room);
        } else {
            checkAllReady(io, room);
        }
    }
};

const handleRequestRoomReset = (io: Server, socket: Socket, rooms: Room[]) => (): void => {
    const room = findRoomBySocket(rooms, socket);

    if (!room) {
        return;
    }

    resetGameState(io, room);
};

export {
    checkAllReady,
    endGame,
    handlePlayerDisconnect,
    handlePlayerFinished,
    handleProgressUpdate,
    handleReadyToggle,
    handleRequestRoomReset
};