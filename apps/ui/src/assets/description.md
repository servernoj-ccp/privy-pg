# The purpose

This POC illustrates the payment flow initiated by a Buyer for some arbitrary goods provided by a Seller. The selection of goods is out of scope of the POC. The payment is done by a credit (or debit) card and targets the bank account of the Seller by going through a number of transformations:

- Buyer's CC/DC is charged for a specific amount
- Funds temporally accumulated on the Stripe's "connected account" associated with the Seller
- After some delay (2 days in US) the funds are paid out to Bridge for on-ramping (conversion to USDC)
- The USDC amount matching the purchase is then deposited by Bridge to the Treasury Smart Contract (TSC)
- An NFT receipt in minted to the crypto wallet associated (created on behalf of) the Buyer
- Upon request from the Seller, the funds can be "withdrawn" from TSC and off-ramped to the Seller's bank account

The process can be augmented by introducing "installments". The buyer controls the number of installments created &mdash; their credit card will be charged in accordance to installment schedule by equally split amounts.

The refund flow allows to refund the full amount associated with the purchase. It can be requested by a Buyer, but must be confirmed by the Seller.


