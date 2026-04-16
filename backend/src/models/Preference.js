'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const Subscriber = require('./Subscriber');

const Preference = sequelize.define(
  'Preference',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subscriber_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Subscriber, key: 'id' },
      onDelete: 'CASCADE',
    },
    candidate_dni: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'NULL = default to tracking TOP 5 candidates by totalVotosValidos',
    },
  },
  {
    tableName: 'preferences',
    timestamps: false,
    indexes: [{ fields: ['subscriber_id'] }, { fields: ['candidate_dni'] }],
  }
);

Subscriber.hasMany(Preference, { foreignKey: 'subscriber_id', as: 'preferences' });
Preference.belongsTo(Subscriber, { foreignKey: 'subscriber_id', as: 'subscriber' });

module.exports = Preference;
