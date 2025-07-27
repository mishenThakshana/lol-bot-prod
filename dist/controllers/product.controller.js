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
exports.changeProductStatus = exports.deleteProduct = exports.updateProduct = exports.getProductById = exports.getProducts = exports.createProduct = void 0;
const database_1 = require("../database/database");
const models_1 = require("../database/models");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const fs_1 = __importDefault(require("fs"));
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const transaction = yield database_1.sequelize.transaction();
    try {
        const { description, deliveryText, keywords, uniqueKeywords } = req.body;
        const mediaFiles = req.files;
        const product = yield models_1.Product.create({ description, deliveryText, keywords, uniqueKeywords }, { transaction });
        if ((mediaFiles === null || mediaFiles === void 0 ? void 0 : mediaFiles.length) > 0) {
            const mediaData = mediaFiles.map((file) => ({
                productId: product.id,
                path: `/uploads/product_images/${file.filename}`,
                size: file.size,
            }));
            yield models_1.ProductImage.bulkCreate(mediaData, { transaction });
        }
        yield transaction.commit();
        res.status(201).json({
            message: "Product created successfully.",
            productId: product.id,
            media: mediaFiles === null || mediaFiles === void 0 ? void 0 : mediaFiles.map((file) => ({
                path: `/uploads/product_images/${file.filename}`,
                size: file.size,
                originalName: file.originalname,
            })),
        });
    }
    catch (error) {
        yield transaction.rollback();
        (0, errorHandler_1.default)(error, res);
    }
});
exports.createProduct = createProduct;
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { count, rows } = yield models_1.Product.findAndCountAll({
            include: [
                {
                    model: models_1.ProductImage,
                    as: "images",
                    attributes: ["id", "path"],
                },
            ],
            distinct: true,
            subQuery: false,
            order: [["createdAt", "DESC"]],
            offset,
            limit,
        });
        const formattedProducts = rows.map((product) => {
            var _a, _b;
            const imagesWithFormattedSize = (_b = (_a = product.images) === null || _a === void 0 ? void 0 : _a.map((img) => (Object.assign({}, img.toJSON())))) !== null && _b !== void 0 ? _b : [];
            return Object.assign(Object.assign({}, product.toJSON()), { images: imagesWithFormattedSize });
        });
        res.status(200).json({
            data: formattedProducts,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            },
        });
    }
    catch (error) {
        (0, errorHandler_1.default)(error, res);
    }
});
exports.getProducts = getProducts;
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const product = yield models_1.Product.findByPk(req.params.id, {
            include: [
                {
                    model: models_1.ProductImage,
                    as: "images",
                    attributes: ["id", "path"],
                },
            ],
        });
        if (!product) {
            res.status(404).json({ message: "Product not found." });
            return;
        }
        const imagesWithFormattedSize = (_b = (_a = product.images) === null || _a === void 0 ? void 0 : _a.map((img) => (Object.assign({}, img.toJSON())))) !== null && _b !== void 0 ? _b : [];
        res.status(200).json(Object.assign(Object.assign({}, product.toJSON()), { images: imagesWithFormattedSize }));
    }
    catch (error) {
        (0, errorHandler_1.default)(error, res);
    }
});
exports.getProductById = getProductById;
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const transaction = yield database_1.sequelize.transaction();
    try {
        const mediaFiles = req.files;
        const product = yield models_1.Product.findByPk(req.params.id, { transaction });
        if (!product) {
            yield transaction.rollback();
            return (0, errorHandler_1.default)(new Error("Product not found."), res, 404);
        }
        yield product.update(Object.assign({}, req.body), { transaction });
        if ((mediaFiles === null || mediaFiles === void 0 ? void 0 : mediaFiles.length) > 0) {
            const existingImages = yield models_1.ProductImage.findAll({
                where: { productId: product.id },
                transaction,
            });
            for (const image of existingImages) {
                const filePath = `./uploads/product_images/${image.path.split("/").pop()}`;
                try {
                    yield fs_1.default.promises.unlink(filePath);
                }
                catch (err) {
                    console.error(`Failed to delete file ${filePath}:`, err);
                }
            }
            yield models_1.ProductImage.destroy({
                where: { productId: product.id },
                transaction,
            });
            const mediaData = mediaFiles.map((file) => ({
                productId: product.id,
                path: `/uploads/product_images/${file.filename}`,
                size: file.size,
            }));
            yield models_1.ProductImage.bulkCreate(mediaData, { transaction });
        }
        yield transaction.commit();
        res.status(200).json({
            message: "Product updated successfully.",
            productId: product.id,
        });
    }
    catch (error) {
        yield transaction.rollback();
        (0, errorHandler_1.default)(error, res);
    }
});
exports.updateProduct = updateProduct;
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const transaction = yield database_1.sequelize.transaction();
    try {
        const existingImages = yield models_1.ProductImage.findAll({
            where: { productId: req.params.id },
            transaction,
        });
        for (const image of existingImages) {
            const filePath = `./uploads/product_images/${image.path.split("/").pop()}`;
            try {
                yield fs_1.default.promises.unlink(filePath);
            }
            catch (err) {
                console.error(`Failed to delete file ${filePath}:`, err);
            }
        }
        yield models_1.ProductImage.destroy({
            where: { productId: req.params.id },
            transaction,
        });
        yield models_1.Product.destroy({
            where: { id: req.params.id },
            transaction,
        });
        yield transaction.commit();
        res.status(200).json({ message: "Product deleted successfully." });
    }
    catch (error) {
        yield transaction.rollback();
        (0, errorHandler_1.default)(error, res);
    }
});
exports.deleteProduct = deleteProduct;
const changeProductStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const transaction = yield database_1.sequelize.transaction();
    try {
        const product = yield models_1.Product.findByPk(req.params.id, { transaction });
        if (!product) {
            yield transaction.rollback();
            return (0, errorHandler_1.default)(new Error("Product not found."), res, 404);
        }
        yield product.update({ isActive: req.body.isActive }, { transaction });
        yield transaction.commit();
        res.status(200).json({
            message: "Product status updated successfully.",
            productId: product.id,
            status: req.body.isActive,
        });
    }
    catch (error) {
        yield transaction.rollback();
        (0, errorHandler_1.default)(error, res);
    }
});
exports.changeProductStatus = changeProductStatus;
