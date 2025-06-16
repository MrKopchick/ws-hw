import express from "express";
import http from "node:http";
import cors from "cors";
import { Server } from "socket.io";

import { PORT, STATIC_PATH } from "./config.js";
import { rootRouter } from "./routes/routes.js";
import { socketHandler } from "./socket/socket.js";

const app = express();
const httpServer = new http.Server(app);

const socketIo = new Server(httpServer, {
  cors: {
    origin: "https://subtle-cascaron-c2f481.netlify.app/",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: "https://subtle-cascaron-c2f481.netlify.app/",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.static(STATIC_PATH));
rootRouter(app);

app.get("*any", (_request, response) => {
  response.redirect("/signin");
});

socketHandler(socketIo);

httpServer.listen(PORT, () => {
  console.log(`- Listen server on port ${PORT.toString()}`);
  console.log(`- App running on http://localhost:${PORT.toString()}`);
});
