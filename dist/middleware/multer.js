"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMulterUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const createMulterUpload = (folderName, acceptedFormats) => {
    const uploadDir = path_1.default.resolve(__dirname, `../../uploads/${folderName}`);
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    const storage = multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const ext = path_1.default.extname(file.originalname);
            const uniqueName = crypto_1.default.randomBytes(16).toString("hex");
            cb(null, `${uniqueName}${ext}`);
        },
    });
    const fileFilter = (req, file, callback) => {
        if (!acceptedFormats || acceptedFormats.length === 0) {
            return callback(null, true);
        }
        const match = acceptedFormats.find((format) => format.mime === file.mimetype);
        if (!match) {
            return callback(new Error(`Unsupported file type: ${file.mimetype}`));
        }
        callback(null, true);
    };
    return (0, multer_1.default)({
        storage,
        fileFilter,
    });
};
exports.createMulterUpload = createMulterUpload;
