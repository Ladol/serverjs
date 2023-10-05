const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('master', 'postgres', '2GPU1haRPLWBT', {
    host: 'localhost',
    dialect: 'postgres',
});

const Train = sequelize.define('Train', {
    // Dynamic table name based on number and date
    tableName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    departureTime: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    arrivalTime: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    // JSON data for stations, pass status, scheduled time, and observations
    stationsData: {
        type: DataTypes.JSONB,
    },
}, {
    // Other options and configurations for your model
});

module.exports = Train;
