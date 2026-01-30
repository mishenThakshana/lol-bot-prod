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
exports.resetClient = exports.getQr = exports.initializeClient = exports.getClientStatus = exports.getClientStatusData = void 0;
const path_1 = __importDefault(require("path"));
const models_1 = require("../database/models");
const helperFunctions_1 = require("../helpers/helperFunctions");
const paths_1 = require("../utils/paths");
const luxon_1 = require("luxon");
const whatsapp_baileys_service_1 = require("../services/whatsapp-baileys.service");
const userLastGreeted = {};
const userSentProductsToday = {};
const pendingReminders = {};
const deliveryDetailsReminders = {};
const PROCESSED_MESSAGE_IDS_MAX = 2000;
const processedMessageIds = new Set();
let incomingHandlerLock = Promise.resolve();
function clearAllReminders() {
    for (const userReminders of Object.values(pendingReminders)) {
        for (const reminder of userReminders) {
            clearTimeout(reminder.timeoutId);
        }
    }
    Object.keys(pendingReminders).forEach((k) => delete pendingReminders[k]);
    for (const reminder of Object.values(deliveryDetailsReminders)) {
        clearTimeout(reminder.timeoutId);
    }
    Object.keys(deliveryDetailsReminders).forEach((k) => delete deliveryDetailsReminders[k]);
    console.log("🧹 Cleared all pending reminders");
}
const getClientStatusData = () => {
    const s = (0, whatsapp_baileys_service_1.getStatus)();
    if (s.status === "ready") {
        return { success: true, status: "ready", msg: s.msg, whatsappNumber: s.whatsappNumber };
    }
    const status = s.status === "reconnecting"
        ? "initialized_not_ready"
        : s.status === "not_initialized" || s.status === "disconnected"
            ? "not_initialized"
            : "initialized_not_ready";
    return { success: false, status, msg: s.msg };
};
exports.getClientStatusData = getClientStatusData;
const getClientStatus = (_req, res) => {
    const statusData = (0, exports.getClientStatusData)();
    return res.status(200).json(statusData);
};
exports.getClientStatus = getClientStatus;
function handleOurOutgoingMessage(msg) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const text = (0, whatsapp_baileys_service_1.getMessageText)(msg);
        if (!(text === null || text === void 0 ? void 0 : text.trim()))
            return;
        const fromMe = (_a = msg.key) === null || _a === void 0 ? void 0 : _a.fromMe;
        const recipient = (_b = msg.key) === null || _b === void 0 ? void 0 : _b.remoteJid;
        if (!fromMe || !recipient || recipient.endsWith("@g.us") || (0, whatsapp_baileys_service_1.isStatusOrBroadcastJid)(recipient))
            return;
        const config = yield models_1.Config.findOne();
        const deliveryDetailsTrimmed = ((_c = config === null || config === void 0 ? void 0 : config.deliveryDetailsMessage) !== null && _c !== void 0 ? _c : "").trim();
        if (!deliveryDetailsTrimmed ||
            text.trim() !== deliveryDetailsTrimmed ||
            !(config === null || config === void 0 ? void 0 : config.deliveryReminderMessage) ||
            !config.deliveryReminderHours ||
            config.deliveryReminderHours <= 0) {
            return;
        }
        console.log(`🔍 Delivery details message detected! To: ${recipient}`);
        const reminderDelayMs = config.deliveryReminderHours * 60 * 60 * 1000;
        const sendAt = new Date(Date.now() + reminderDelayMs);
        const delayInMinutes = Math.round(reminderDelayMs / 60000);
        const startTime = Date.now();
        if (deliveryDetailsReminders[recipient]) {
            clearTimeout(deliveryDetailsReminders[recipient].timeoutId);
        }
        const trackingInterval = setInterval(() => {
            if (deliveryDetailsReminders[recipient]) {
                const minutesElapsed = Math.floor((Date.now() - startTime) / 60000);
                const minutesRemaining = delayInMinutes - minutesElapsed;
                console.log(`⏳ [Delivery Details] User hasn't responded for ${minutesElapsed} minute(s). ${minutesRemaining} minute(s) until reminder.`);
            }
            else {
                clearInterval(trackingInterval);
            }
        }, 60 * 1000);
        const timeoutId = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            clearInterval(trackingInterval);
            if (deliveryDetailsReminders[recipient]) {
                try {
                    yield (0, whatsapp_baileys_service_1.sendText)(recipient, config.deliveryReminderMessage);
                    console.log(`✅📨 Successfully sent delivery details reminder to ${recipient}`);
                }
                catch (err) {
                    console.error("❌ Error sending delivery details reminder:", err);
                }
                delete deliveryDetailsReminders[recipient];
            }
        }), reminderDelayMs);
        deliveryDetailsReminders[recipient] = { sendAt, timeoutId };
        console.log(`✅⏰ Scheduled delivery reminder for ${recipient} in ${config.deliveryReminderHours} hours`);
    });
}
function handleIncomingMessage(msg) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const incomingText = (0, whatsapp_baileys_service_1.getMessageText)(msg);
        if (!incomingText)
            return;
        const sender = (_a = msg.key) === null || _a === void 0 ? void 0 : _a.remoteJid;
        if (!sender ||
            ((_b = msg.key) === null || _b === void 0 ? void 0 : _b.fromMe) ||
            sender.endsWith("@g.us") ||
            (0, whatsapp_baileys_service_1.isStatusOrBroadcastJid)(sender))
            return;
        const today = luxon_1.DateTime.now().setZone("Asia/Colombo").toFormat("yyyy-MM-dd");
        console.log(`📩 Incoming message from ${sender}: "${incomingText.substring(0, 50)}..."`);
        if (((_c = pendingReminders[sender]) === null || _c === void 0 ? void 0 : _c.length) > 0) {
            for (const reminder of pendingReminders[sender]) {
                clearTimeout(reminder.timeoutId);
            }
            delete pendingReminders[sender];
            console.log(`✅ All product reminders cancelled for ${sender}`);
        }
        if (deliveryDetailsReminders[sender]) {
            clearTimeout(deliveryDetailsReminders[sender].timeoutId);
            delete deliveryDetailsReminders[sender];
            console.log(`✅ Delivery details reminder cancelled for ${sender}`);
        }
        for (const [user, date] of Object.entries(userLastGreeted)) {
            if (date !== today)
                delete userLastGreeted[user];
        }
        for (const [user, record] of Object.entries(userSentProductsToday)) {
            if (record.date !== today)
                delete userSentProductsToday[user];
        }
        const cleanedQuery = (0, helperFunctions_1.cleanText)(incomingText.toLowerCase());
        if (cleanedQuery.length < 2 || (0, helperFunctions_1.isPhoneNumber)(cleanedQuery))
            return;
        const products = yield models_1.Product.findAll({
            where: { isActive: true },
            include: [{ model: models_1.ProductImage, as: "images" }],
        });
        let matchedProducts = [];
        const isSinhala = (0, helperFunctions_1.isSinhalaText)(incomingText);
        for (const product of products) {
            const uniqueKeywords = JSON.parse(product.uniqueKeywords || "[]").map((k) => (0, helperFunctions_1.cleanText)(k.toLowerCase()));
            const hasMatch = uniqueKeywords.some((kw) => {
                if (isSinhala)
                    return cleanedQuery === kw;
                return (0, helperFunctions_1.containsQuotedPhrase)(incomingText, kw) || cleanedQuery.includes(kw);
            });
            if (hasMatch) {
                matchedProducts = [product];
                break;
            }
        }
        if (matchedProducts.length === 0) {
            for (const product of products) {
                const keywords = JSON.parse(product.keywords || "[]").map((k) => (0, helperFunctions_1.cleanText)(k.toLowerCase()));
                const isMatch = keywords.some((kw) => {
                    if (isSinhala)
                        return cleanedQuery === kw;
                    return (0, helperFunctions_1.containsQuotedPhrase)(incomingText, kw) || cleanedQuery.includes(kw);
                });
                if (isMatch)
                    matchedProducts.push(product);
            }
        }
        for (let productIndex = 0; productIndex < matchedProducts.length; productIndex++) {
            const product = matchedProducts[productIndex];
            const sentRecord = userSentProductsToday[sender];
            const sentProductIds = (_d = sentRecord === null || sentRecord === void 0 ? void 0 : sentRecord.productIds) !== null && _d !== void 0 ? _d : new Set();
            if (sentProductIds.has(product.id))
                continue;
            if (productIndex > 0) {
                yield new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20000) + 10000));
            }
            if (userLastGreeted[sender] !== today) {
                yield new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20000) + 1000));
                const greeting = yield (0, helperFunctions_1.getTimeBasedGreeting)();
                if (greeting) {
                    yield (0, whatsapp_baileys_service_1.sendText)(sender, greeting);
                    userLastGreeted[sender] = today;
                }
            }
            if ((_e = product.images) === null || _e === void 0 ? void 0 : _e.length) {
                yield new Promise((r) => setTimeout(r, Math.floor(Math.random() * 6000) + 2000));
                for (let i = 0; i < product.images.length; i++) {
                    if (i > 0) {
                        yield new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5000) + 1000));
                    }
                    try {
                        const mediaPath = product.images[i].path;
                        const finalPath = (0, paths_1.getProductImagePath)(path_1.default.basename(mediaPath));
                        const ext = path_1.default.extname(mediaPath).toLowerCase();
                        const isVideo = [".mp4", ".mov", ".webm", ".3gp"].includes(ext);
                        if (isVideo) {
                            yield (0, whatsapp_baileys_service_1.sendVideoFromPath)(sender, finalPath);
                        }
                        else {
                            yield (0, whatsapp_baileys_service_1.sendImageFromPath)(sender, finalPath);
                        }
                    }
                    catch (err) {
                        console.warn(`⚠️ Could not send media: ${product.images[i].path}`, err);
                    }
                }
            }
            yield new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20000) + 1000));
            yield (0, whatsapp_baileys_service_1.sendText)(sender, product.description);
            yield new Promise((r) => setTimeout(r, Math.floor(Math.random() * 30000) + 1000));
            if (product.deliveryText) {
                yield (0, whatsapp_baileys_service_1.sendText)(sender, product.deliveryText);
                console.log(`✅ Sent delivery text for product ${product.id} to ${sender}`);
            }
            if (product.reminderMessage && product.remindInHours && product.remindInHours > 0) {
                const reminderDelayMs = product.remindInHours * 60 * 60 * 1000;
                const sendAt = new Date(Date.now() + reminderDelayMs);
                const delayInMinutes = Math.round(reminderDelayMs / 60000);
                const startTime = Date.now();
                const trackingInterval = setInterval(() => {
                    var _a;
                    if (!((_a = pendingReminders[sender]) === null || _a === void 0 ? void 0 : _a.some((r) => r.productId === product.id))) {
                        clearInterval(trackingInterval);
                    }
                }, 60 * 1000);
                const timeoutId = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    clearInterval(trackingInterval);
                    const userReminders = pendingReminders[sender];
                    const reminderIndex = userReminders === null || userReminders === void 0 ? void 0 : userReminders.findIndex((r) => r.productId === product.id);
                    if (reminderIndex !== undefined && reminderIndex >= 0) {
                        yield (0, whatsapp_baileys_service_1.sendText)(sender, product.reminderMessage);
                        userReminders.splice(reminderIndex, 1);
                        if (userReminders.length === 0)
                            delete pendingReminders[sender];
                    }
                }), reminderDelayMs);
                if (!pendingReminders[sender])
                    pendingReminders[sender] = [];
                pendingReminders[sender].push({
                    productId: product.id,
                    reminderMessage: product.reminderMessage,
                    sendAt,
                    timeoutId,
                });
            }
            if (!userSentProductsToday[sender]) {
                userSentProductsToday[sender] = { date: today, productIds: new Set() };
            }
            userSentProductsToday[sender].productIds.add(product.id);
        }
    });
}
const initializeClient = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const status = (0, whatsapp_baileys_service_1.getStatus)();
    if (status.success && status.status === "ready") {
        return res.status(200).json({ success: true, msg: "Client already initialized" });
    }
    if ((0, whatsapp_baileys_service_1.getSocket)()) {
        return res.status(200).json({ success: true, msg: "Client already initialized" });
    }
    try {
        yield (0, whatsapp_baileys_service_1.createSession)((payload) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            if (payload.type !== "notify")
                return;
            for (const m of payload.messages) {
                const jid = (_a = m.key) === null || _a === void 0 ? void 0 : _a.remoteJid;
                if ((0, whatsapp_baileys_service_1.isStatusOrBroadcastJid)(jid))
                    continue;
                const dedupeKey = (0, whatsapp_baileys_service_1.getMessageDedupeKey)(m);
                if (dedupeKey && processedMessageIds.has(dedupeKey))
                    continue;
                if (dedupeKey) {
                    processedMessageIds.add(dedupeKey);
                    if (processedMessageIds.size > PROCESSED_MESSAGE_IDS_MAX)
                        processedMessageIds.clear();
                }
                try {
                    if ((_b = m.key) === null || _b === void 0 ? void 0 : _b.fromMe) {
                        yield handleOurOutgoingMessage(m);
                    }
                    else {
                        const prevLock = incomingHandlerLock;
                        let release;
                        incomingHandlerLock = new Promise((r) => {
                            release = r;
                        });
                        yield prevLock;
                        try {
                            yield handleIncomingMessage(m);
                        }
                        finally {
                            release();
                        }
                    }
                }
                catch (err) {
                    console.error("❌ Error in WhatsApp message handler:", err);
                }
            }
        }));
        return res.status(201).json({ success: true, msg: "Client initialized" });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Failed to initialize client";
        return res.status(500).json({ success: false, msg: message });
    }
});
exports.initializeClient = initializeClient;
const getQr = (_req, res) => {
    if (!(0, whatsapp_baileys_service_1.getSocket)()) {
        return res.status(200).json({ success: false, msg: "Client not initialized" });
    }
    const qr = (0, whatsapp_baileys_service_1.getQR)();
    if (qr) {
        return res.status(200).json({ success: true, qr });
    }
    return res.status(200).json({ success: false, msg: "QR code not yet available" });
};
exports.getQr = getQr;
const resetClient = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const socket = (0, whatsapp_baileys_service_1.getSocket)();
    if (socket) {
        yield (0, whatsapp_baileys_service_1.destroySession)(true);
        clearAllReminders();
        processedMessageIds.clear();
        return res.status(200).json({ success: true, msg: "Client removed" });
    }
    return res.status(200).json({ success: false, msg: "Client not running" });
});
exports.resetClient = resetClient;
