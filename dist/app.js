"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const variables_1 = require("./utils/variables");
const routers_1 = __importDefault(require("./routers"));
const models_1 = require("./database/models");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "*",
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const uploadsPath = path_1.default.join(__dirname, "../uploads");
console.log("Serving /uploads from:", uploadsPath);
app.use("/uploads", express_1.default.static(uploadsPath));
const staticPath = path_1.default.join(__dirname, "../public");
app.use(express_1.default.static(staticPath));
app.use("/api", routers_1.default);
app.get("*", (req, res) => {
    res.sendFile(path_1.default.join(staticPath, "index.html"));
});
const startServer = () => {
    (0, models_1.initializeDb)().then(() => {
        app.listen(variables_1.APP_PORT, () => {
            console.log(`Server running on http://localhost:${variables_1.APP_PORT}`);
        });
    });
};
startServer();
