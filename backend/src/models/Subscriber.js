'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Subscriber = sequelize.define(
  'Subscriber',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: 'subscribers', timestamps: false }
);

module.exports = Subscriber;
