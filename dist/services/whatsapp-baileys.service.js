"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.formatJid = formatJid;
exports.getStatus = getStatus;
exports.getQR = getQR;
exports.getSocket = getSocket;
exports.createSession = createSession;
exports.getMessageText = getMessageText;
exports.getMessageDedupeKey = getMessageDedupeKey;
exports.isStatusOrBroadcastJid = isStatusOrBroadcastJid;
exports.sendText = sendText;
exports.sendImageFromPath = sendImageFromPath;
exports.destroySession = destroySession;
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const pino_1 = __importDefault(require("pino"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
const SESSION_ID = "default";
const logger = (0, pino_1.default)({ level: "silent" });
let sessions = new Map();
let qrCodes = new Map();
let connectionState = new Map();
let retryCount = new Map();
let reconnectTimer = null;
const maxRetries = 10;
const sessionsDir = path_1.default.join(process.cwd(), "sessions");
const sessionPath = path_1.default.join(sessionsDir, SESSION_ID);
function ensureSessionsDir() {
    if (!fs_1.default.existsSync(sessionsDir)) {
        fs_1.default.mkdirSync(sessionsDir, { recursive: true });
    }
}
function clearReconnectTimer() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
}
function formatJid(phone) {
    const cleaned = phone.replace(/\D/g, "");
    if (phone.includes("@g.us"))
        return phone;
    if (cleaned.includes("@"))
        return cleaned;
    return `${cleaned}@s.whatsapp.net`;
}
function getStatus() {
    var _a;
    const session = sessions.get(SESSION_ID);
    if (!session) {
        const exists = fs_1.default.existsSync(sessionPath) && fs_1.default.existsSync(path_1.default.join(sessionPath, "creds.json"));
        return {
            success: false,
            status: exists ? "disconnected" : "not_initialized",
            msg: exists ? "Session exists but not running" : "Client not initialized",
        };
    }
    const isConnected = connectionState.get(SESSION_ID) === "open";
    if ((_a = session.socket) === null || _a === void 0 ? void 0 : _a.user) {
        const wid = session.socket.user.id;
        const number = wid ? wid.split(":")[0] : undefined;
        return {
            success: true,
            status: isConnected ? "ready" : "reconnecting",
            msg: isConnected ? "Client is ready" : "Client reconnecting",
            whatsappNumber: number ? `${number}@s.whatsapp.net` : undefined,
        };
    }
    return {
        success: false,
        status: "initialized_not_ready",
        msg: "Client initialized but not ready (scan QR)",
    };
}
function getQR() {
    var _a;
    return (_a = qrCodes.get(SESSION_ID)) !== null && _a !== void 0 ? _a : null;
}
function getSocket() {
    var _a, _b;
    return (_b = (_a = sessions.get(SESSION_ID)) === null || _a === void 0 ? void 0 : _a.socket) !== null && _b !== void 0 ? _b : null;
}
function createSession(onMessagesUpsert) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        ensureSessionsDir();
        const hasExistingCreds = fs_1.default.existsSync(sessionPath) && fs_1.default.existsSync(path_1.default.join(sessionPath, "creds.json"));
        const existing = sessions.get(SESSION_ID);
        if (((_a = existing === null || existing === void 0 ? void 0 : existing.socket) === null || _a === void 0 ? void 0 : _a.user) && ((_c = (_b = existing.socket) === null || _b === void 0 ? void 0 : _b.ws) === null || _c === void 0 ? void 0 : _c.readyState) === 1) {
            return;
        }
        if (existing === null || existing === void 0 ? void 0 : existing.socket) {
            try {
                (_e = (_d = existing.socket).end) === null || _e === void 0 ? void 0 : _e.call(_d, undefined);
            }
            catch (_f) {
            }
            sessions.delete(SESSION_ID);
        }
        const { state, saveCreds } = yield (0, baileys_1.useMultiFileAuthState)(sessionPath);
        const { version } = yield (0, baileys_1.fetchLatestBaileysVersion)();
        const socket = (0, baileys_1.default)({
            version,
            auth: {
                creds: state.creds,
                keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, logger),
            },
            logger,
            browser: baileys_1.Browsers.ubuntu("Chrome"),
            syncFullHistory: false,
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: false,
            shouldSyncHistoryMessage: () => false,
            getMessage: () => __awaiter(this, void 0, void 0, function* () { return undefined; }),
            keepAliveIntervalMs: 30000,
        });
        sessions.set(SESSION_ID, { socket, saveCreds });
        socket.ev.on("connection.update", (update) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                qrCodes.set(SESSION_ID, qr);
                retryCount.set(SESSION_ID, 0);
            }
            if (connection === "close") {
                const statusCode = (_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode;
                qrCodes.delete(SESSION_ID);
                connectionState.set(SESSION_ID, "close");
                if (statusCode === baileys_1.DisconnectReason.loggedOut) {
                    sessions.delete(SESSION_ID);
                    retryCount.delete(SESSION_ID);
                    clearReconnectTimer();
                    if (fs_1.default.existsSync(sessionPath)) {
                        fs_1.default.rmSync(sessionPath, { recursive: true, force: true });
                    }
                    return;
                }
                if (statusCode === baileys_1.DisconnectReason.connectionReplaced) {
                    sessions.delete(SESSION_ID);
                    clearReconnectTimer();
                    return;
                }
                const currentRetry = ((_c = retryCount.get(SESSION_ID)) !== null && _c !== void 0 ? _c : 0) + 1;
                retryCount.set(SESSION_ID, currentRetry);
                const max = hasExistingCreds ? 999 : maxRetries;
                if (currentRetry <= max) {
                    const delay = Math.min(2 ** (currentRetry - 1) * 3000, 60000);
                    clearReconnectTimer();
                    reconnectTimer = setTimeout(() => {
                        createSession(onMessagesUpsert).catch((err) => {
                            console.error("[WhatsApp] Reconnection failed:", err);
                        });
                    }, delay);
                }
                else {
                    sessions.delete(SESSION_ID);
                    retryCount.delete(SESSION_ID);
                    clearReconnectTimer();
                }
            }
            if (connection === "open") {
                console.log("✅ WhatsApp client ready");
                qrCodes.delete(SESSION_ID);
                retryCount.set(SESSION_ID, 0);
                clearReconnectTimer();
                connectionState.set(SESSION_ID, "open");
            }
        }));
        socket.ev.on("creds.update", saveCreds);
        if (onMessagesUpsert) {
            socket.ev.on("messages.upsert", (payload) => {
                onMessagesUpsert(payload);
            });
        }
    });
}
function getMessageText(msg) {
    var _a, _b;
    const m = msg.message;
    if (!m)
        return undefined;
    const text = (_a = m.conversation) !== null && _a !== void 0 ? _a : (_b = m.extendedTextMessage) === null || _b === void 0 ? void 0 : _b.text;
    return typeof text === "string" ? text.trim() : undefined;
}
function getMessageDedupeKey(msg) {
    var _a, _b;
    const jid = (_a = msg.key) === null || _a === void 0 ? void 0 : _a.remoteJid;
    const id = (_b = msg.key) === null || _b === void 0 ? void 0 : _b.id;
    if (!jid || !id)
        return null;
    return `${jid}|${id}`;
}
function isStatusOrBroadcastJid(jid) {
    if (!jid)
        return true;
    return jid === "status@broadcast" || jid.endsWith("@broadcast");
}
function sendText(jid, text) {
    return __awaiter(this, void 0, void 0, function* () {
        const socket = getSocket();
        if (!(socket === null || socket === void 0 ? void 0 : socket.user))
            throw new Error("WhatsApp not connected");
        const to = jid.includes("@") ? jid : formatJid(jid);
        yield socket.sendMessage(to, { text });
    });
}
function sendImageFromPath(jid, filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const socket = getSocket();
        if (!(socket === null || socket === void 0 ? void 0 : socket.user))
            throw new Error("WhatsApp not connected");
        const to = jid.includes("@") ? jid : formatJid(jid);
        const buffer = yield (0, promises_1.readFile)(filePath);
        yield socket.sendMessage(to, { image: buffer });
    });
}
function destroySession() {
    return __awaiter(this, arguments, void 0, function* (deleteAuth = true) {
        var _a, _b, _c, _d;
        const session = sessions.get(SESSION_ID);
        if (session === null || session === void 0 ? void 0 : session.socket) {
            try {
                yield ((_b = (_a = session.socket).logout) === null || _b === void 0 ? void 0 : _b.call(_a));
            }
            catch (_e) {
            }
            try {
                (_d = (_c = session.socket).end) === null || _d === void 0 ? void 0 : _d.call(_c);
            }
            catch (_f) {
            }
        }
        sessions.delete(SESSION_ID);
        qrCodes.delete(SESSION_ID);
        retryCount.delete(SESSION_ID);
        connectionState.delete(SESSION_ID);
        clearReconnectTimer();
        if (deleteAuth && fs_1.default.existsSync(sessionPath)) {
            fs_1.default.rmSync(sessionPath, { recursive: true, force: true });
        }
    });
}
