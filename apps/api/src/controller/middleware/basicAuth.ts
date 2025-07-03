import basicAuth from 'express-basic-auth'

const {
  ADMIN_USERNAME: adminUser,
  ADMIN_PASSWORD: adminPass
} = process.env as Record<string, string>


export default basicAuth({
  challenge: true,
  users: {
    [adminUser]: adminPass
  }
})
