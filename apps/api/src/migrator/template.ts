/* eslint-disable @typescript-eslint/no-unused-vars */
import { MigrationFn } from 'umzug'
import { Sequelize } from 'sequelize'

type M = MigrationFn<Sequelize>

export const up: M = async ({ context: sequelize }) => {
  const qi = sequelize.getQueryInterface()
}

export const down: M = async ({ context: sequelize }) => {
  const qi = sequelize.getQueryInterface()
}
