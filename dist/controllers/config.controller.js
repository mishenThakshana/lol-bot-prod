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
exports.getConfig = exports.setConfig = void 0;
const database_1 = require("../database/database");
const models_1 = require("../database/models");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const setConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const transaction = yield database_1.sequelize.transaction();
    try {
        const { morningMessage, afternoonMessage, eveningMessage } = req.body;
        const existingConfig = yield models_1.Config.findOne({ transaction });
        let config;
        if (existingConfig) {
            yield existingConfig.update({ morningMessage, afternoonMessage, eveningMessage }, { transaction });
            config = existingConfig;
        }
        else {
            config = yield models_1.Config.create({ morningMessage, afternoonMessage, eveningMessage }, { transaction });
        }
        yield transaction.commit();
        res.status(200).json({
            message: existingConfig
                ? "Configuration updated successfully."
                : "Configuration created successfully.",
            data: config,
        });
    }
    catch (error) {
        yield transaction.rollback();
        (0, errorHandler_1.default)(error, res);
    }
});
exports.setConfig = setConfig;
const getConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const config = yield models_1.Config.findOne();
        if (!config) {
            res.status(404).json({ message: "Configuration not found." });
            return;
        }
        res.status(200).json({ data: config });
    }
    catch (error) {
        (0, errorHandler_1.default)(error, res);
    }
});
exports.getConfig = getConfig;
