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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.ProductImage = exports.Product = exports.User = exports.initializeDb = void 0;
const database_1 = require("../database");
const User_1 = require("./User");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return User_1.User; } });
const Product_1 = require("./Product");
Object.defineProperty(exports, "Product", { enumerable: true, get: function () { return Product_1.Product; } });
const ProductImage_1 = require("./ProductImage");
Object.defineProperty(exports, "ProductImage", { enumerable: true, get: function () { return ProductImage_1.ProductImage; } });
const Config_1 = require("./Config");
Object.defineProperty(exports, "Config", { enumerable: true, get: function () { return Config_1.Config; } });
const initializeDb = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield database_1.sequelize.sync({ alter: true });
        console.log("✅ Database synchronized successfully.");
    }
    catch (error) {
        console.error("❌ Database synchronization failed:", error);
    }
});
exports.initializeDb = initializeDb;
