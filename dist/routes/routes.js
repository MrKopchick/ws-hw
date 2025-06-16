import { router as gameRouter } from "./game.js";
import { router as signinRouter } from "./signin.js";
const rootRouter = (app) => {
    app.use("/signin", signinRouter);
    app.use("/game", gameRouter);
};
export { rootRouter };
