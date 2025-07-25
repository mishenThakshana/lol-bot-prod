"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_controller_1 = require("../controllers/config.controller");
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post("/", config_controller_1.setConfig);
router.get("/", config_controller_1.getConfig);
exports.default = router;
