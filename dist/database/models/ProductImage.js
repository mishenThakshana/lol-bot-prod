"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductImage = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../database");
const Product_1 = require("./Product");
class ProductImage extends sequelize_1.Model {
}
exports.ProductImage = ProductImage;
ProductImage.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    productId: {
        type: sequelize_1.DataTypes.UUID,
        field: "product_id",
        allowNull: false,
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
    },
    path: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: "ProductImage",
    tableName: "product_images",
    timestamps: true,
});
ProductImage.belongsTo(Product_1.Product, { foreignKey: "productId", as: "product" });
Product_1.Product.hasMany(ProductImage, { foreignKey: "productId", as: "images" });
