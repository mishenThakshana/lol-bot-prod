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
exports.login = exports.register = void 0;
const database_1 = require("../database/database");
const models_1 = require("../database/models");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const transaction = yield database_1.sequelize.transaction();
    try {
        const user = yield models_1.User.create(Object.assign({}, req.body), { transaction });
        yield transaction.commit();
        res.status(201).json({
            message: "Account created successfully.",
            userId: user.id,
        });
    }
    catch (error) {
        yield transaction.rollback();
        (0, errorHandler_1.default)(error, res);
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const transaction = yield database_1.sequelize.transaction();
    const { email, password } = req.body;
    try {
        const user = yield models_1.User.findOne({ where: { email } });
        if (!user) {
            yield transaction.rollback();
            return (0, errorHandler_1.default)(new Error("User not found"), res, 404);
        }
        const isValidPassword = yield user.checkPassword(password);
        if (!isValidPassword) {
            yield transaction.rollback();
            return (0, errorHandler_1.default)(new Error("Invalid credentials"), res, 401);
        }
        res.status(200).json({
            message: "Successfully logged in.",
            userId: user.id,
        });
    }
    catch (error) {
        yield transaction.rollback();
        (0, errorHandler_1.default)(error, res);
    }
});
exports.login = login;
