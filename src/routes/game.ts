import { type Request, type Response, Router } from "express";
import path from "node:path";

import { HTML_FILES_PATH } from "../config.js";
import { texts } from "../data.js";

const router = Router();

router.get("/", (_request: Request, response: Response) => {
    const page = path.join(HTML_FILES_PATH, "game.html");
    response.sendFile(page);
});

router.get("/texts/:id", (request: Request, response: Response) => {
    const id = Number.parseInt(request.params.id, 10);
    response.json({ text: texts[id] });
});

export { router };
