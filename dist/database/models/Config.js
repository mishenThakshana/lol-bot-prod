"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../database");
class Config extends sequelize_1.Model {
}
exports.Config = Config;
Config.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    morningMessage: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    afternoonMessage: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    eveningMessage: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: "Config",
    tableName: "config",
    timestamps: true,
});
