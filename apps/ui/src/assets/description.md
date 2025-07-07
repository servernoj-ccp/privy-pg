# The purpose

Demonstrate authentication flow with a single Privy AppId allowing to serve users from two separate domains: Buyers and Seller. Buyers are allowed to signIn or signUp without any restrictions but Sellers can only signIn/login with the email approved by the app Admin. One same email can be used either to identify a Seller, or a Buyer or both, but the final decision on the role of the user currently being authenticated is determined based on the URL of the login page:
- for Buyers it is `/buyer/login`
- for Sellers it is `/seller/login`

