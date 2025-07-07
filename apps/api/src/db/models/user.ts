import { Model, DataTypes } from 'sequelize'
import { sequelize } from '@/db'

const Roles = [
  'seller',
  'buyer'
] as const

class User extends Model {
  declare id: string
  declare email: string
  declare privy_id: string | null
  declare roles: Array<typeof Roles[number]>
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    timestamps: false,
    sequelize
  }
)

export default User
