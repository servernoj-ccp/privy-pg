import { Model } from 'sequelize'
import User from './user'

type AttributesExtractor<T> = Pick<T, Exclude<keyof T, keyof Model>>

type UserAttr = AttributesExtractor<User>

export {
  User
}

export type {
  UserAttr
}
