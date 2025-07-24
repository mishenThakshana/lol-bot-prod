"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sequelize_1 = require("sequelize");
const dataDir = path_1.default.resolve(process.cwd(), "data");
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir);
}
const dbPath = path_1.default.join(dataDir, "database.sqlite");
if (!fs_1.default.existsSync(dbPath)) {
    fs_1.default.writeFileSync(dbPath, "");
}
console.log("🗂 Using SQLite DB at:", dbPath);
exports.sequelize = new sequelize_1.Sequelize({
    dialect: "sqlite",
    storage: dbPath,
    logging: false,
});
