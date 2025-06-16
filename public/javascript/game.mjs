/*
    hi, sorry for this brain fuck script.
    I tried to break it into smaller scripts so that everything would look nice. The reason
    I couldn't break it down was that the browser blocked all the helper scripts for some reason
    Bruhhh
*/

import { appendRoomElement, updateNumberOfUsersInRoom, removeRoomElement } from "./views/room.mjs";
import { appendUserElement, changeReadyStatus, removeUserElement } from "./views/user.mjs";
import { showInputModal, showMessageModal, showResultsModal } from "./views/modal.mjs";

const username = sessionStorage.getItem("username");

if (!username) {
    window.location.replace("/signin");
}

const socket = io("https://ws-hw-production.up.railway.app", {
    query: { username },
    reconnectionAttempts: 3,
    reconnectionDelay: 1000
});

const roomsPage = document.getElementById("rooms-page");
const gamePage = document.getElementById("game-page");
const roomsWrapper = document.getElementById("rooms-wrapper");
const addRoomBtn = document.getElementById("add-room-btn");
const quitRoomBtn = document.getElementById("quit-room-btn");
const readyBtn = document.getElementById("ready-btn");
const gameTimerSeconds = document.getElementById("game-timer-seconds");

let currentRoom = null;
const userColors = {};
let gameInterval;
let countdownInterval;
let currentText = "";
let currentPosition = 0;
let gameStartTime;
let gameEndTime;
let gameTextId = null;

document.addEventListener("keydown", handleKeyPress);

function getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function assignUserColor(username) {
    if (!userColors[username]) {
        let color;
        do {
            color = getRandomColor();
        } while (Object.values(userColors).includes(color));
        userColors[username] = color;
    }
    return userColors[username];
}

socket.on("connect_error", (err) => {
    if (err.message === "username_taken") {
        showMessageModal({
            message: "Username is already taken",
            onClose: () => {
                sessionStorage.removeItem("username");
                window.location.replace("/signin");
            }
        });
    }
});

socket.on("invalid_room_name", () => {
    showMessageModal({
        message: "Room name cannot be empty",
        onClose: () => showCreateRoomModal()
    });
});

socket.on("initial_rooms", (rooms) => {
    roomsWrapper.innerHTML = "";
    rooms.forEach((room) => {
        appendRoomElement({
            name: room.name,
            numberOfUsers: room.users.length,
            onJoin: () => joinRoom(room.name)
        });
    });
});

socket.on("username_taken", () => {
    sessionStorage.removeItem("username");
    window.location.replace("/signin");
});

socket.on("room_created", (room) => {
    appendRoomElement({
        name: room.name,
        numberOfUsers: room.users.length,
        onJoin: () => joinRoom(room.name)
    });
});

socket.on("room_removed", removeRoomElement);

socket.on("room_updated", (room) => {
    updateNumberOfUsersInRoom({
        name: room.name,
        numberOfUsers: room.users.length
    });
});

socket.on("joined_room", (room) => {
    currentRoom = room;
    showGamePage(room);
});

socket.on("user_joined", (user) => {
    const color = assignUserColor(user.username);
    appendUserElement({
        username: user.username,
        ready: user.ready,
        isCurrentUser: false,
        color
    });
});

socket.on("user_updated", (user) => {
    changeReadyStatus({
        username: user.username,
        ready: user.ready
    });
});

socket.on("room_exists", () => {
    showMessageModal({
        message: "Room with this name already exists",
        onClose: () => showCreateRoomModal()
    });
});

socket.on("room_not_found", showGenericError);
socket.on("room_full", showGenericError);
socket.on("game_already_started", showGenericError);

function showGenericError() {
    showMessageModal({
        message: arguments[0],
        onClose: () => {}
    });
}

socket.on("countdown_started", (seconds) => {
    const timerElement = document.getElementById("timer");

    timerElement.classList.remove("display-none");
    quitRoomBtn.classList.add("display-none");
    readyBtn.classList.add("display-none");

    let remainingSeconds = seconds;
    timerElement.textContent = remainingSeconds;

    countdownInterval = setInterval(() => {
        remainingSeconds--;
        timerElement.textContent = remainingSeconds;

        if (remainingSeconds <= 0) {
            clearInterval(countdownInterval);
            timerElement.classList.add("display-none");
        }
    }, 1000);
});

socket.on("countdown_canceled", () => {
    clearInterval(countdownInterval);
    document.getElementById("timer").classList.add("display-none");
    quitRoomBtn.classList.remove("display-none");
    readyBtn.classList.remove("display-none");
});

socket.on("game_started", async (textId) => {
    gameTextId = textId;
    try {
        const response = await fetch(`/game/texts/${textId}`);
        currentText = (await response.json()).text;
        startGame();
    } catch (error) {
        console.error("Error fetching game text:", error);
    }
});

socket.on("game_ended", ({ results }) => {
    clearInterval(gameInterval);

    const formattedResults = results
        .map((user) => ({
            username: user.username,
            time: user.finished ? `${user.time.toFixed(2)}s` : "DNF",
            isCurrentUser: user.username === username,
            finished: user.finished,
            rawTime: user.finished ? user.time : Infinity
        }))
        .sort((a, b) => {
            if (a.finished && !b.finished) return -1;
            if (!a.finished && b.finished) return 1;
            return a.rawTime - b.rawTime;
        });

    showResultsModal({
        usersSortedArray: formattedResults,
        onClose: resetGameState
    });
});

socket.on("user_left", (user) => {
    removeUserElement(user.username);
    if (currentRoom) {
        currentRoom.users = currentRoom.users.filter((u) => u.username !== user.username);
        updateNumberOfUsersInRoom({
            name: currentRoom.name,
            numberOfUsers: currentRoom.users.length
        });
    }
});

socket.on("user_progress", ({ username, progress }) => {
    const progressElement = document.querySelector(`.user-progress[data-username='${username}']`);
    if (progressElement) {
        progressElement.style.width = `${progress}%`;
        if (progress === 100) {
            progressElement.classList.add("finished");
        }
    }
});

addRoomBtn.addEventListener("click", showCreateRoomModal);
quitRoomBtn.addEventListener("click", leaveRoom);
readyBtn.addEventListener("click", toggleReady);

function leaveRoom() {
    socket.emit("leave_room");
    showRoomsPage();
}

function toggleReady() {
    socket.emit("toggle_ready");
    readyBtn.textContent = readyBtn.textContent === "READY" ? "NOT READY" : "READY";
}

function showCreateRoomModal() {
    showInputModal({
        title: "Enter room name",
        onSubmit: (roomName) => {
            if (roomName?.trim()) {
                socket.emit("create_room", roomName.trim());
            } else {
                socket.emit("invalid_room_name");
            }
        }
    });
}

function joinRoom(roomName) {
    socket.emit("join_room", roomName);
}

function showRoomsPage() {
    clearIntervals();
    document.removeEventListener("keydown", handleKeyPress);

    roomsPage.classList.remove("display-none");
    gamePage.classList.add("display-none");
    currentRoom = null;
    readyBtn.textContent = "READY";

    const elementsToHide = ["timer", "text-container", "game-timer"];
    elementsToHide.forEach((id) => document.getElementById(id).classList.add("display-none"));
}

function clearIntervals() {
    if (countdownInterval) clearInterval(countdownInterval);
    if (gameInterval) clearInterval(gameInterval);
    countdownInterval = null;
    gameInterval = null;
}

function showGamePage(room) {
    roomsPage.classList.add("display-none");
    gamePage.classList.remove("display-none");
    document.getElementById("room-name").textContent = room.name;
    document.getElementById("users-wrapper").innerHTML = "";

    room.users.forEach((user) => {
        const color = assignUserColor(user.username);
        appendUserElement({
            username: user.username,
            ready: user.ready,
            isCurrentUser: user.username === username,
            color
        });
    });
}

function startGame() {
    const textContainer = document.getElementById("text-container");
    const gameTimer = document.getElementById("game-timer");

    if (!textContainer || !gameTimer) {
        console.error("Game elements not found");
        return;
    }

    currentPosition = 0;
    gameStartTime = Date.now();
    gameEndTime = gameStartTime + 60 * 1000;

    textContainer.classList.remove("display-none");
    gameTimer.classList.remove("display-none");
    gameTimerSeconds.textContent = "60";

    updateTextDisplay();

    document.addEventListener("keydown", handleKeyPress);

    updateGameTimer();
    gameInterval = setInterval(updateGameTimer, 1000);
}

function updateGameTimer() {
    const remainingSeconds = Math.max(0, Math.floor((gameEndTime - Date.now()) / 1000));
    gameTimerSeconds.textContent = remainingSeconds;

    if (remainingSeconds <= 0) {
        endGame();
    }
}

function endGame() {
    socket.emit("player_finished");
    document.removeEventListener("keydown", handleKeyPress);
}

function updateTextDisplay() {
    const textContainer = document.getElementById("text-container");
    const gameTimer = document.getElementById("game-timer");
    let html = "";

    if (gameTimer.classList.contains("display-none")) {
        gameTimer.classList.remove("display-none");
    }
    for (let i = 0; i < currentText.length; i++) {
        if (i < currentPosition) {
            html += `<span class="correct">${currentText[i]}</span>`;
        } else if (i === currentPosition) {
            html += `<span class="current">${currentText[i]}</span>`;
        } else {
            html += currentText[i];
        }
    }

    textContainer.innerHTML = html;
}

function handleKeyPress(event) {
    if (!currentText || currentPosition >= currentText.length) return;

    if (event.key === currentText[currentPosition]) {
        currentPosition++;
        updateTextDisplay();

        const progress = Math.floor((currentPosition / currentText.length) * 100);
        socket.emit("progress_update", progress);

        if (currentPosition >= currentText.length) {
            endGame();
        }
    }
}

function resetGameState() {
    currentText = "";
    currentPosition = 0;
    gameTextId = null;
    clearIntervals();

    const elementsToReset = ["text-container", "game-timer", "timer"];

    elementsToReset.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add("display-none");
        }
    });

    quitRoomBtn.classList.remove("display-none");
    readyBtn.classList.remove("display-none");
    readyBtn.textContent = "READY";

    document.querySelectorAll(".user-progress").forEach((progressBar) => {
        progressBar.style.width = "0%";
        progressBar.classList.remove("finished");
    });

    if (currentRoom) {
        currentRoom.users.forEach((user) => {
            const color = assignUserColor(user.username);
            changeReadyStatus({
                username: user.username,
                ready: false,
                color
            });
        });
    }

    document.addEventListener("keydown", handleKeyPress);
}

socket.on("room_reset", resetGameState);
