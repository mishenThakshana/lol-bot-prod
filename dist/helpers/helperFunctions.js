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
exports.getTimeBasedGreeting = void 0;
exports.cleanText = cleanText;
exports.getChromePath = getChromePath;
const models_1 = require("../database/models");
const luxon_1 = require("luxon");
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
function cleanText(text) {
    return text
        .replace(/[^\p{L}\p{N} ]+/gu, "")
        .replace(/\s+/g, " ")
        .toLowerCase()
        .trim();
}
function getChromePath() {
    const platform = os_1.default.platform();
    if (platform === "darwin") {
        return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    }
    else if (platform === "win32") {
        const chromePaths = [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        ];
        for (const chromePath of chromePaths) {
            if (fs_1.default.existsSync(chromePath)) {
                return chromePath;
            }
        }
        throw new Error("Google Chrome not found in common Windows locations.");
    }
    else if (platform === "linux") {
        const chromePaths = [
            "/usr/bin/google-chrome-stable",
            "/usr/bin/google-chrome",
            "/snap/bin/chromium",
        ];
        for (const chromePath of chromePaths) {
            if (fs_1.default.existsSync(chromePath)) {
                return chromePath;
            }
        }
        throw new Error("Google Chrome not found in common Linux locations.");
    }
    throw new Error(`Unsupported platform: ${platform}`);
}
const getTimeBasedGreeting = () => __awaiter(void 0, void 0, void 0, function* () {
    const colomboTime = luxon_1.DateTime.now().setZone("Asia/Colombo");
    const hour = colomboTime.hour;
    const config = yield models_1.Config.findOne();
    if (!config) {
        console.warn("⚠️ No config found for greetings");
        return null;
    }
    if (hour < 12)
        return config.morningMessage;
    if (hour < 17)
        return config.afternoonMessage;
    return config.eveningMessage;
});
exports.getTimeBasedGreeting = getTimeBasedGreeting;
