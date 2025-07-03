import { Dropdown } from 'primereact/dropdown'
import { api } from '@/axios'
import { InputNumber } from 'primereact/inputnumber'
import { Button } from 'primereact/button'
import { useNavigate } from 'react-router'
import { useCheckout, type InstallmentInterval } from '@/components/buyer/checkoutProvider'
import { useQuery } from '@tanstack/react-query'

type IntervalMapping = {
  [key in InstallmentInterval]: {
    label: string
    value: number
  }
}

const ONE_MINUTE = 60 * 1000
const ONE_HOUR = 60 * ONE_MINUTE
const ONE_DAY = 24 * ONE_HOUR
const ONE_WEEK = 7 * ONE_DAY
const ONE_MONTH = 4 * ONE_WEEK

export const intervalMapping: IntervalMapping = {
  '1m': {
    label: '1 minute',
    value: ONE_MINUTE
  },
  '5m': {
    label: '5 minutes',
    value: 5 * ONE_MINUTE
  },
  '1h': {
    label: '1 hour',
    value: ONE_HOUR
  },
  '1d': {
    label: '1 day',
    value: ONE_DAY
  },
  '1w': {
    label: '1 week',
    value: ONE_WEEK
  },
  '2w': {
    label: '2 weeks',
    value: 2 * ONE_WEEK
  },
  '1mo': {
    label: '1 month',
    value: ONE_MONTH
  },
  '3mo': {
    label: '3 months',
    value: 3 * ONE_MONTH
  }
}

const supportedIntervals: Array<InstallmentInterval> = ['1m', '5m', '1d']

const intervals = supportedIntervals.map(
  k => ({ key: k, config: intervalMapping[k] })
)

export default function () {
  const navigate = useNavigate()
  const {
    setAmount,
    setEmail,
    setInstallments,
    setInstallmentsInterval,
    state: {
      email,
      amount,
      installments,
      installmentsInterval
    }
  } = useCheckout()

  const { data: sellers, isSuccess } = useQuery({
    queryKey: ['sellers'],
    queryFn: () => api.get<Array<{email: string}>>('/users/onboarded').then(
      data => data.map(
        ({ email }) => email
      )
    )
  })


  return isSuccess && <article className='flex flex-col gap-8 items-start'>
    <h2 className='m-0'>Shopping</h2>
    <p>
      Select the Seller (email) in the dropdown and specify the amount to pay, as well as installments configuration (if needed). Then proceed to checkout to finalize the payment. Once confirmed, navigate to Buyer's receipts to check details and optionally request a refund.
    </p>
    {/* Seller */}
    <div className='flex flex-col gap-2'>
      <label htmlFor='ddEmail' className='font-bold'>
        Seller
      </label>
      <Dropdown
        inputId='ddEmail'
        value={ email }
        onChange={
          ({ value }) => setEmail(value)
        }
        options={sellers}
        placeholder="Select the recipient of your funds"
        checkmark={true}
        highlightOnSelect={false} />
    </div>
    <section className='flex gap-8'>
      {/* Amount */}
      <div className="flex flex-col gap-2">
        <label htmlFor='amount' className='font-bold'>
        Amount
        </label>
        <InputNumber
          inputId="amount"
          disabled={!email}
          value={amount}
          placeholder="How much do you want to transfer"
          onValueChange={
            ({ value }) => setAmount(value!)
          }
          mode="currency"
          currency="USD"
          locale="en-US" />
      </div>
      {/* Number of installments */}
      <div className="flex flex-col gap-2">
        <label htmlFor='installments' className='font-bold'>
        Number of installments
        </label>
        <InputNumber
          disabled={!amount}
          inputId="installments"
          value={installments}
          placeholder="Number of installments"
          onValueChange={
            ({ value }) => setInstallments(value!)
          }
          showButtons
          decrementButtonClassName="p-button-secondary"
          incrementButtonClassName="p-button-secondary"
          step={1}
          min={1}
          max={5}
        />
      </div>
      {/* Installments interval*/}
      <div className='flex flex-col gap-2 min-w-48'>
        <label htmlFor='ddInterval' className='font-bold'>
        Installments interval
        </label>
        <Dropdown
          inputId='ddInterval'
          disabled={installments === 1}
          value={ installmentsInterval }
          onChange={
            ({ value }) => setInstallmentsInterval(value)
          }
          optionLabel="config.label"
          optionValue='key'
          options={intervals}
          placeholder="Select interval between installments"
          checkmark={true}
          highlightOnSelect={false} />
      </div>
    </section>
    {/* Go to checkout */}
    <div>
      <Button
        disabled={!email || !amount}
        severity="secondary"
        label="Checkout"
        onClick={
          () => {
            navigate('../checkout')
          }
        } />
    </div>
  </article>
}
