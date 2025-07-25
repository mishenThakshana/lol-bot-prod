"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_route_1 = __importDefault(require("./auth.route"));
const product_route_1 = __importDefault(require("./product.route"));
const whatsapp_route_1 = __importDefault(require("./whatsapp.route"));
const config_route_1 = __importDefault(require("./config.route"));
const router = (0, express_1.Router)();
router.use("/auth", auth_route_1.default);
router.use("/products", product_route_1.default);
router.use("/whatsapp", whatsapp_route_1.default);
router.use("/config", config_route_1.default);
exports.default = router;
