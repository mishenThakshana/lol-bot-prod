"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../database");
class Product extends sequelize_1.Model {
}
exports.Product = Product;
Product.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    deliveryText: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    keywords: {
        type: sequelize_1.DataTypes.TEXT,
        get() {
            const rawValue = this.getDataValue("keywords");
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue("keywords", JSON.stringify(value));
        },
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: "Product",
    tableName: "products",
    timestamps: true,
});
