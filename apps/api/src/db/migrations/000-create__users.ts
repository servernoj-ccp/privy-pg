import { MigrationFn } from 'umzug'
import { Sequelize, DataTypes } from 'sequelize'

type M = MigrationFn<Sequelize>

const Roles = [
  'seller',
  'buyer'
] as const

export const up: M = async ({ context: sequelize }) => {
  await sequelize
    .define(
      'User',
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
        },
        privy_id: {
          type: DataTypes.STRING,
          defaultValue: null
        },
        roles: {
          type: DataTypes.ARRAY(DataTypes.ENUM(...Roles)),
          defaultValue: []
        }
      },
      {
        tableName: 'users',
        timestamps: false
      }
    )
    .sync()
}

export const down: M = async ({ context: sequelize }) => {
  const qi = sequelize.getQueryInterface()
  await qi.dropTable({
    tableName: 'users'
  })
  await sequelize.query('drop type if exists "enum_users_roles"')
}
