import { Sequelize, Options } from 'sequelize'

const options: Options = {
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  dialect: 'postgres',
  logging: false,
  pool: {
    max: Number(process.env.DB_MAX_POOL),
    min: Number(process.env.DB_MIN_POOL),
    acquire: Number(process.env.DB_ACQUIRE_POOL),
    idle: Number(process.env.DB_IDLE_POOL)
  }
}

const sequelize = new Sequelize(options)

const init = async () => {
  await sequelize.authenticate()
  return sequelize
}

export { sequelize, init }
