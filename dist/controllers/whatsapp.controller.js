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
        whatsAppClient.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            try {
                const incomingText = (_a = message.body) === null || _a === void 0 ? void 0 : _a.trim();
                if (!incomingText)
                    return;
                const sender = message.from;
                const today = luxon_1.DateTime.now().setZone("Asia/Colombo").toFormat("yyyy-MM-dd");
                for (const [user, date] of Object.entries(userLastGreeted)) {
                    if (date !== today)
                        delete userLastGreeted[user];
                }
                for (const [user, record] of Object.entries(userSentProductsToday)) {
                    if (record.date !== today)
                        delete userSentProductsToday[user];
                }
                const cleanedQuery = (0, helperFunctions_1.cleanText)(incomingText.toLowerCase());
                if (cleanedQuery.length < 2)
                    return;
                const products = yield models_1.Product.findAll({
                    where: { isActive: true },
                    include: [{ model: models_1.ProductImage, as: "images" }],
                });
                let matchedProducts = [];
                for (const product of products) {
                    const productUniqueKeywords = JSON.parse(product.uniqueKeywords || "[]").map((k) => (0, helperFunctions_1.cleanText)(k.toLowerCase()));
                    const hasUniqueMatch = productUniqueKeywords.some((productKw) => cleanedQuery === productKw);
                    if (hasUniqueMatch) {
                        matchedProducts = [product];
                        break;
                    }
                }
                if (matchedProducts.length === 0) {
                    for (const product of products) {
                        const productKeywords = JSON.parse(product.keywords || "[]").map((k) => (0, helperFunctions_1.cleanText)(k.toLowerCase()));
                        const isMatch = productKeywords.some((productKw) => cleanedQuery === productKw);
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
                    if (userLastGreeted[sender] !== today) {
                        const greeting = yield (0, helperFunctions_1.getTimeBasedGreeting)();
                        if (greeting) {
                            yield (whatsAppClient === null || whatsAppClient === void 0 ? void 0 : whatsAppClient.sendMessage(sender, greeting));
                            userLastGreeted[sender] = today;
                        }
                    }
                    yield new Promise((r) => setTimeout(r, 3000));
                    if (((_b = product.images) === null || _b === void 0 ? void 0 : _b.length) > 0) {
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
                    yield new Promise((r) => setTimeout(r, 10000));
                    if (product.deliveryText) {
                        yield (whatsAppClient === null || whatsAppClient === void 0 ? void 0 : whatsAppClient.sendMessage(sender, product.deliveryText));
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
        return res.status(200).json({ success: true, msg: "Client removed" });
    }
    return res.status(200).json({ success: false, msg: "Client not running" });
});
exports.resetClient = resetClient;
