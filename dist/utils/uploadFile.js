"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUploadMiddleware = createUploadMiddleware;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function createUploadMiddleware({ fieldName, allowedTypes = ["csv", "xlsx"], dest = "uploads", }) {
    if (!fs_1.default.existsSync(dest)) {
        fs_1.default.mkdirSync(dest, { recursive: true });
    }
    const storage = multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, dest),
        filename: (_req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = path_1.default.extname(file.originalname);
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
    });
    const fileFilter = (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase().replace(".", "");
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Unsupported file type: .${ext}`));
        }
    };
    const upload = (0, multer_1.default)({ storage, fileFilter });
    return upload.single(fieldName);
}
