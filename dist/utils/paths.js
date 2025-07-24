"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductImagePath = exports.PROJECT_ROOT = void 0;
const path_1 = __importDefault(require("path"));
exports.PROJECT_ROOT = path_1.default.resolve(__dirname, "../../");
const getProductImagePath = (imageFilename) => path_1.default.join(exports.PROJECT_ROOT, "uploads", "product_images", imageFilename);
exports.getProductImagePath = getProductImagePath;
