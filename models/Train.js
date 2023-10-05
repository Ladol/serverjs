'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Train extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Train.init({
    tableName: DataTypes.STRING,
    name: DataTypes.STRING,
    departureTime: DataTypes.TIME,
    arrivalTime: DataTypes.TIME,
    stationsData: DataTypes.JSONB
  }, {
    sequelize,
    modelName: 'Train',
  });
  return Train;
};