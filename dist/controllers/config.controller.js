"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreFullBackup = exports.exportFullBackup = exports.getConfig = exports.setConfig = void 0;
const database_1 = require("../database/database");
const models_1 = require("../database/models");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const archiver_1 = __importDefault(require("archiver"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const multer_1 = __importDefault(require("multer"));
const unzipper_1 = __importDefault(require("unzipper"));
const child_process_1 = require("child_process");
const upload = (0, multer_1.default)({ dest: "temp_uploads/" }).single("backup");
const setConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const transaction = yield database_1.sequelize.transaction();
    try {
        const { morningMessage, afternoonMessage, eveningMessage } = req.body;
        const existingConfig = yield models_1.Config.findOne({ transaction });
        let config;
        if (existingConfig) {
            yield existingConfig.update({ morningMessage, afternoonMessage, eveningMessage }, { transaction });
            config = existingConfig;
        }
        else {
            config = yield models_1.Config.create({ morningMessage, afternoonMessage, eveningMessage }, { transaction });
        }
        yield transaction.commit();
        res.status(200).json({
            message: existingConfig
                ? "Configuration updated successfully."
                : "Configuration created successfully.",
            data: config,
        });
    }
    catch (error) {
        yield transaction.rollback();
        (0, errorHandler_1.default)(error, res);
    }
});
exports.setConfig = setConfig;
const getConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const config = yield models_1.Config.findOne();
        if (!config) {
            res.status(404).json({ message: "Configuration not found." });
            return;
        }
        res.status(200).json({ data: config });
    }
    catch (error) {
        (0, errorHandler_1.default)(error, res);
    }
});
exports.getConfig = getConfig;
const exportFullBackup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const zipFileName = `full-backup-${Date.now()}.zip`;
        const outputPath = path_1.default.join(__dirname, "..", "..", "backups", zipFileName);
        const dbPath = path_1.default.join(__dirname, "..", "..", "data");
        const uploadsPath = path_1.default.join(__dirname, "..", "..", "uploads");
        fs_extra_1.default.mkdirSync(path_1.default.dirname(outputPath), { recursive: true });
        const output = fs_extra_1.default.createWriteStream(outputPath);
        const archive = (0, archiver_1.default)("zip", { zlib: { level: 9 } });
        output.on("close", () => {
            res.download(outputPath, zipFileName, (err) => {
                if (err) {
                    console.error("Download error:", err);
                    res.status(500).json({ message: "Failed to download the backup." });
                }
                else {
                    fs_extra_1.default.unlink(outputPath, () => { });
                }
            });
        });
        archive.on("error", (err) => {
            throw err;
        });
        archive.pipe(output);
        archive.directory(dbPath, "data");
        archive.directory(uploadsPath, "uploads");
        yield archive.finalize();
    }
    catch (error) {
        (0, errorHandler_1.default)(error, res);
    }
});
exports.exportFullBackup = exportFullBackup;
const restoreFullBackup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    upload(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            return res.status(400).json({ message: "File upload failed." });
        }
        if (!req.file) {
            return res.status(400).json({ message: "No backup file provided." });
        }
        const uploadedZipPath = req.file.path;
        const extractPath = path_1.default.join(__dirname, "..", "..", "temp_extract");
        try {
            yield fs_extra_1.default.remove(extractPath);
            yield fs_extra_1.default.ensureDir(extractPath);
            yield fs_extra_1.default
                .createReadStream(uploadedZipPath)
                .pipe(unzipper_1.default.Extract({ path: extractPath }))
                .promise();
            const extractedDataPath = path_1.default.join(extractPath, "data");
            const targetDataPath = path_1.default.join(__dirname, "..", "..", "data");
            if (yield fs_extra_1.default.pathExists(extractedDataPath)) {
                yield fs_extra_1.default.remove(targetDataPath);
                yield fs_extra_1.default.copy(extractedDataPath, targetDataPath);
            }
            const extractedUploadsPath = path_1.default.join(extractPath, "uploads");
            const targetUploadsPath = path_1.default.join(__dirname, "..", "..", "uploads");
            if (yield fs_extra_1.default.pathExists(extractedUploadsPath)) {
                yield fs_extra_1.default.remove(targetUploadsPath);
                yield fs_extra_1.default.copy(extractedUploadsPath, targetUploadsPath);
            }
            yield fs_extra_1.default.remove(uploadedZipPath);
            yield fs_extra_1.default.remove(extractPath);
            res.status(200).json({ message: "Backup restored. Restarting app..." });
            if (process.env.NODE_ENV === "production") {
                setTimeout(() => {
                    (0, child_process_1.exec)("pm2 restart lol-bot", (error, stdout, stderr) => {
                        if (error) {
                            console.error("PM2 Restart Error:", error);
                        }
                        else {
                            console.log("PM2 Restart Success:", stdout);
                        }
                    });
                }, 1500);
            }
        }
        catch (error) {
            console.error("Restore error:", error);
            res.status(500).json({ message: "Failed to restore backup." });
        }
    }));
});
exports.restoreFullBackup = restoreFullBackup;
