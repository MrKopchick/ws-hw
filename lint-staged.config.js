/** @type {import('lint-staged').Config} */
const config = {
    "*": [() => "npm run lint:editor", () => "npm run lint:fs", () => "npm run lint:js", () => "npm run lint:format"]
};

export default config;
