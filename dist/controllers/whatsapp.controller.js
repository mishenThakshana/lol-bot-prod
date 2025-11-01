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
exports.resetClient = exports.getQr = exports.initializeClient = exports.getClientStatus = exports.getClientStatusData = void 0;
const whatsapp_web_js_1 = __importStar(require("whatsapp-web.js"));
const path_1 = __importDefault(require("path"));
const models_1 = require("../database/models");
const helperFunctions_1 = require("../helpers/helperFunctions");
const paths_1 = require("../utils/paths");
const luxon_1 = require("luxon");
const userLastGreeted = {};
const userSentProductsToday = {};
const pendingReminders = {};
const deliveryDetailsReminders = {};
const { Client: WhatsAppClient, LocalAuth } = whatsapp_web_js_1.default;
let whatsAppClient = null;
let currentQrCode = null;
const getClientStatusData = () => {
    if (!whatsAppClient) {
        return {
            success: false,
            status: "not_initialized",
            msg: "Client not initialized",
        };
    }
    if (!whatsAppClient.info) {
        return {
            success: false,
            status: "initialized_not_ready",
            msg: "Client initialized but not ready",
        };
    }
    return {
        success: true,
        status: "ready",
        msg: "Client is ready",
        whatsappNumber: whatsAppClient.info.wid._serialized,
    };
};
exports.getClientStatusData = getClientStatusData;
const getClientStatus = (_req, res) => {
    const statusData = (0, exports.getClientStatusData)();
    return res.status(200).json(statusData);
};
exports.getClientStatus = getClientStatus;
const initializeClient = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (whatsAppClient) {
        return res.status(200).json({ success: true, msg: "Client already initialized" });
    }
    try {
        whatsAppClient = new WhatsAppClient({
            authStrategy: new LocalAuth({ clientId: "default" }),
            puppeteer: {
                executablePath: (0, helperFunctions_1.getChromePath)(),
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            },
        });
        whatsAppClient.on("qr", (qr) => {
            currentQrCode = qr;
        });
        whatsAppClient.on("ready", () => {
            console.log("✅ WhatsApp client ready");
        });
        whatsAppClient.on("message_create", (message) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                const messageText = (_a = message.body) === null || _a === void 0 ? void 0 : _a.trim();
                if (!messageText)
                    return;
                const isFromMe = message.fromMe;
                const recipient = message.to;
                if (isFromMe && recipient) {
                    const config = yield models_1.Config.findOne();
                    if ((config === null || config === void 0 ? void 0 : config.deliveryDetailsMessage) &&
                        messageText === config.deliveryDetailsMessage &&
                        config.deliveryReminderMessage &&
                        config.deliveryReminderHours &&
                        config.deliveryReminderHours > 0) {
                        console.log(`🔍 Delivery details message detected! To: ${recipient}`);
                        const reminderDelayMs = config.deliveryReminderHours * 60 * 60 * 1000;
                        const sendAt = new Date(Date.now() + reminderDelayMs);
                        const delayInMinutes = Math.round(reminderDelayMs / 60000);
                        const startTime = Date.now();
                        console.log(`⏱️  Setting up delivery reminder timer for ${delayInMinutes} minutes (${reminderDelayMs}ms)`);
                        console.log(`📅 Delivery reminder will fire at: ${sendAt.toLocaleString()}`);
                        if (deliveryDetailsReminders[recipient]) {
                            console.log(`⚠️  Cancelling existing delivery reminder for ${recipient}`);
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
                                const minutesElapsed = Math.floor((Date.now() - startTime) / 60000);
                                console.log(`✅ [Delivery Details] Tracking stopped - User responded after ${minutesElapsed} minute(s)`);
                            }
                        }, 60 * 1000);
                        const timeoutId = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                            clearInterval(trackingInterval);
                            console.log(`⏰ DELIVERY REMINDER TIMER FIRED for ${recipient}`);
                            console.log(`🔍 Checking if user responded...`);
                            try {
                                if (deliveryDetailsReminders[recipient]) {
                                    console.log(`💬 User has NOT responded in ${delayInMinutes} minutes. Sending delivery reminder...`);
                                    yield (whatsAppClient === null || whatsAppClient === void 0 ? void 0 : whatsAppClient.sendMessage(recipient, config.deliveryReminderMessage));
                                    console.log(`✅📨 Successfully sent delivery details reminder to ${recipient}`);
                                    delete deliveryDetailsReminders[recipient];
                                    console.log(`🗑️  Removed delivery reminder from pending list`);
                                }
                                else {
                                    console.log(`❌ Delivery reminder not found in pending list (user may have responded)`);
                                }
                            }
                            catch (err) {
                                console.error("❌ Error sending delivery details reminder:", err);
                            }
                        }), reminderDelayMs);
                        deliveryDetailsReminders[recipient] = {
                            sendAt,
                            timeoutId,
                        };
                        console.log(`✅⏰ Scheduled delivery reminder for ${recipient} in ${config.deliveryReminderHours} hours`);
                    }
                }
            }
            catch (err) {
                console.error("❌ Error in message_create handler:", err);
            }
        }));
        whatsAppClient.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const incomingText = (_a = message.body) === null || _a === void 0 ? void 0 : _a.trim();
                if (!incomingText)
                    return;
                const sender = message.from;
                const today = luxon_1.DateTime.now().setZone("Asia/Colombo").toFormat("yyyy-MM-dd");
                console.log(`📩 Incoming message from ${sender}: "${incomingText.substring(0, 50)}..."`);
                if (((_b = pendingReminders[sender]) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                    console.log(`🔍 Found ${pendingReminders[sender].length} pending product reminder(s) for ${sender}`);
                    const now = Date.now();
                    for (const reminder of pendingReminders[sender]) {
                        clearTimeout(reminder.timeoutId);
                        const elapsedMinutes = Math.round((now - (reminder.sendAt.getTime() - 5 * 60 * 1000)) / 60000);
                        console.log(`🛑 Cancelled reminder for product ${reminder.productId} - User responded after ${elapsedMinutes} minute(s)`);
                    }
                    delete pendingReminders[sender];
                    console.log(`✅ All product reminders cancelled for ${sender}`);
                }
                else {
                    console.log(`ℹ️  No pending product reminders for ${sender}`);
                }
                if (deliveryDetailsReminders[sender]) {
                    console.log(`🔍 Found pending delivery details reminder for ${sender}`);
                    clearTimeout(deliveryDetailsReminders[sender].timeoutId);
                    const now = Date.now();
                    const elapsedMinutes = Math.round((now - (deliveryDetailsReminders[sender].sendAt.getTime() - 5 * 60 * 1000)) / 60000);
                    console.log(`🛑 Cancelled delivery details reminder - User responded after ${elapsedMinutes} minute(s)`);
                    delete deliveryDetailsReminders[sender];
                    console.log(`✅ Delivery details reminder cancelled for ${sender}`);
                }
                else {
                    console.log(`ℹ️  No pending delivery details reminder for ${sender}`);
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
                        if (isSinhala) {
                            return cleanedQuery === kw;
                        }
                        else {
                            return (0, helperFunctions_1.containsQuotedPhrase)(incomingText, kw) || cleanedQuery.includes(kw);
                        }
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
                            if (isSinhala) {
                                return cleanedQuery === kw;
                            }
                            else {
                                return (0, helperFunctions_1.containsQuotedPhrase)(incomingText, kw) || cleanedQuery.includes(kw);
                            }
                        });
                        if (isMatch) {
                            matchedProducts.push(product);
                        }
                    }
                }
                for (const product of matchedProducts) {
                    const sentRecord = userSentProductsToday[sender];
                    const sentProductIds = (sentRecord === null || sentRecord === void 0 ? void 0 : sentRecord.productIds) || new Set();
                    if (sentProductIds.has(product.id))
                        continue;
                    yield new Promise((r) => setTimeout(r, 5000));
                    if (userLastGreeted[sender] !== today) {
                        const greeting = yield (0, helperFunctions_1.getTimeBasedGreeting)();
                        if (greeting) {
                            yield (whatsAppClient === null || whatsAppClient === void 0 ? void 0 : whatsAppClient.sendMessage(sender, greeting));
                            userLastGreeted[sender] = today;
                        }
                    }
                    yield new Promise((r) => setTimeout(r, 5000));
                    if (((_c = product.images) === null || _c === void 0 ? void 0 : _c.length) > 0) {
                        for (const img of product.images) {
                            try {
                                const finalPath = (0, paths_1.getProductImagePath)(path_1.default.basename(img.path));
                                const media = whatsapp_web_js_1.MessageMedia.fromFilePath(finalPath);
                                yield (whatsAppClient === null || whatsAppClient === void 0 ? void 0 : whatsAppClient.sendMessage(sender, media));
                            }
                            catch (err) {
                                console.warn(`⚠️ Could not send media: ${img.path}`, err);
                            }
                        }
                    }
                    yield new Promise((r) => setTimeout(r, 5000));
                    yield (whatsAppClient === null || whatsAppClient === void 0 ? void 0 : whatsAppClient.sendMessage(sender, product.description));
                    yield new Promise((r) => setTimeout(r, 5000));
                    if (product.deliveryText) {
                        yield (whatsAppClient === null || whatsAppClient === void 0 ? void 0 : whatsAppClient.sendMessage(sender, product.deliveryText));
                        console.log(`✅ Sent delivery text for product ${product.id} to ${sender}`);
                    }
                    if (product.reminderMessage && product.remindInHours && product.remindInHours > 0) {
                        console.log(`🔍 Product reminder check - Product ID: ${product.id}, Reminder Message: "${(_d = product.reminderMessage) === null || _d === void 0 ? void 0 : _d.substring(0, 30)}...", Hours: ${product.remindInHours}`);
                        const reminderDelayMs = product.remindInHours * 60 * 60 * 1000;
                        const sendAt = new Date(Date.now() + reminderDelayMs);
                        const delayInMinutes = Math.round(reminderDelayMs / 60000);
                        const startTime = Date.now();
                        console.log(`⏱️  Setting up reminder timer for ${delayInMinutes} minutes (${reminderDelayMs}ms)`);
                        console.log(`📅 Reminder will fire at: ${sendAt.toLocaleString()}`);
                        const trackingInterval = setInterval(() => {
                            var _a;
                            if ((_a = pendingReminders[sender]) === null || _a === void 0 ? void 0 : _a.some((r) => r.productId === product.id)) {
                                const minutesElapsed = Math.floor((Date.now() - startTime) / 60000);
                                const minutesRemaining = delayInMinutes - minutesElapsed;
                                console.log(`⏳ [Product ${product.id}] User hasn't responded for ${minutesElapsed} minute(s). ${minutesRemaining} minute(s) until reminder.`);
                            }
                            else {
                                clearInterval(trackingInterval);
                                const minutesElapsed = Math.floor((Date.now() - startTime) / 60000);
                                console.log(`✅ [Product ${product.id}] Tracking stopped - User responded after ${minutesElapsed} minute(s)`);
                            }
                        }, 60 * 1000);
                        const timeoutId = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                            clearInterval(trackingInterval);
                            console.log(`⏰ REMINDER TIMER FIRED for product ${product.id} to ${sender}`);
                            console.log(`🔍 Checking if user responded...`);
                            try {
                                const userReminders = pendingReminders[sender];
                                console.log(`📋 Current pending reminders for ${sender}:`, userReminders ? userReminders.length : 0);
                                const reminderIndex = userReminders === null || userReminders === void 0 ? void 0 : userReminders.findIndex((r) => r.productId === product.id);
                                console.log(`🔎 Reminder index found: ${reminderIndex}`);
                                if (reminderIndex !== undefined && reminderIndex >= 0) {
                                    console.log(`💬 User has NOT responded in ${delayInMinutes} minutes. Sending reminder...`);
                                    yield (whatsAppClient === null || whatsAppClient === void 0 ? void 0 : whatsAppClient.sendMessage(sender, product.reminderMessage));
                                    console.log(`✅📨 Successfully sent reminder for product ${product.id} to ${sender}`);
                                    userReminders.splice(reminderIndex, 1);
                                    if (userReminders.length === 0) {
                                        delete pendingReminders[sender];
                                    }
                                    console.log(`🗑️  Removed reminder from pending list`);
                                }
                                else {
                                    console.log(`❌ Reminder not found in pending list (user may have responded)`);
                                }
                            }
                            catch (err) {
                                console.error("❌ Error sending reminder:", err);
                            }
                        }), reminderDelayMs);
                        if (!pendingReminders[sender]) {
                            pendingReminders[sender] = [];
                            console.log(`📝 Created new reminder list for ${sender}`);
                        }
                        pendingReminders[sender].push({
                            productId: product.id,
                            reminderMessage: product.reminderMessage,
                            sendAt,
                            timeoutId,
                        });
                        console.log(`✅⏰ Scheduled reminder for product ${product.id} to ${sender} in ${product.remindInHours} hours`);
                        console.log(`📊 Total pending reminders for ${sender}: ${pendingReminders[sender].length}`);
                    }
                    else {
                        console.log(`⚠️  No reminder configured for product ${product.id} - reminderMessage: ${product.reminderMessage ? "exists" : "missing"}, remindInHours: ${product.remindInHours}`);
                    }
                    if (!userSentProductsToday[sender]) {
                        userSentProductsToday[sender] = {
                            date: today,
                            productIds: new Set(),
                        };
                    }
                    userSentProductsToday[sender].productIds.add(product.id);
                }
            }
            catch (err) {
                console.error("❌ Error in WhatsApp message handler:", err);
            }
        }));
        whatsAppClient.on("auth_failure", () => {
            console.error("❌ Authentication failed");
            whatsAppClient = null;
            currentQrCode = null;
        });
        whatsAppClient.on("disconnected", () => {
            console.log("⚠️ Client disconnected");
            whatsAppClient = null;
            currentQrCode = null;
        });
        yield whatsAppClient.initialize();
        return res.status(201).json({ success: true, msg: "Client initialized" });
    }
    catch (error) {
        whatsAppClient = null;
        currentQrCode = null;
        const message = error instanceof Error ? error.message : "Failed to initialize client";
        return res.status(500).json({ success: false, msg: message });
    }
});
exports.initializeClient = initializeClient;
const getQr = (_req, res) => {
    if (!whatsAppClient) {
        return res.status(200).json({ success: false, msg: "Client not initialized" });
    }
    if (currentQrCode) {
        return res.status(200).json({ success: true, qr: currentQrCode });
    }
    return res.status(200).json({ success: false, msg: "QR code not yet available" });
};
exports.getQr = getQr;
const resetClient = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (whatsAppClient) {
        yield whatsAppClient.destroy();
        whatsAppClient = null;
        currentQrCode = null;
        for (const userReminders of Object.values(pendingReminders)) {
            for (const reminder of userReminders) {
                clearTimeout(reminder.timeoutId);
            }
        }
        Object.keys(pendingReminders).forEach((key) => delete pendingReminders[key]);
        for (const reminder of Object.values(deliveryDetailsReminders)) {
            clearTimeout(reminder.timeoutId);
        }
        Object.keys(deliveryDetailsReminders).forEach((key) => delete deliveryDetailsReminders[key]);
        console.log("🧹 Cleared all pending reminders");
        return res.status(200).json({ success: true, msg: "Client removed" });
    }
    return res.status(200).json({ success: false, msg: "Client not running" });
});
exports.resetClient = resetClient;
