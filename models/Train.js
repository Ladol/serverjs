const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('yxaysfby', 'yxaysfby', '2t27aEF1m7eYM95PD8CpVOb937ZenlAf', {
    host: 'cornelius.db.elephantsql.com', // Replace with your ElephantSQL database's hostname
    port: 5432, // Default PostgreSQL port
    dialect: 'postgres',
    dialectModule: require('pg'),
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
