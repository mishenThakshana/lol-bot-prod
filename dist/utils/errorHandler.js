"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerErrorHandler = exports.errorHandler = void 0;
const multer_1 = __importDefault(require("multer"));
const errorHandler = (error, res, statusCode = 500) => {
    const message = error.message || "An unknown error occurred";
    const details = error.errors || undefined;
    res.status(statusCode).json(Object.assign({ status: statusCode, message }, (details && { details })));
};
exports.errorHandler = errorHandler;
const multerErrorHandler = (err, req, res, next) => {
    var _a;
    if (err instanceof multer_1.default.MulterError || ((_a = err.message) === null || _a === void 0 ? void 0 : _a.startsWith("Unsupported file type"))) {
        return (0, exports.errorHandler)(err, res, 400);
    }
    next(err);
};
exports.multerErrorHandler = multerErrorHandler;
exports.default = exports.errorHandler;
