import { api } from '@/axios'
import { useEffect, useRef, useState } from 'react'
import {
  usePlaidLink,
  PlaidLinkOptions,
  PlaidLinkOnSuccessMetadata
} from 'react-plaid-link'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { useToast } from '@/toast'
import type {
  ExternalAccount as BridgeExternalAccount
} from 'api/src/@types/bridge'
import type { UserAttr } from 'api/src/db/models'

type PlaidLink = {
  link_token: string
}

type Props = {
  profile: UserAttr
}

export default function ({ profile }: Props) {
  const [externalAccounts, setExternalAccounts] = useState<Array<BridgeExternalAccount>>([])
  const [linkToken, setLinkToken] = useState<string>()
  const [offRampLoading, setOffRampLoading] = useState<boolean>(false)
  const [bankAccount, setBankAccount] = useState<BridgeExternalAccount>()
  const isMounted = useRef(false)
  const { errorHandler, successHandler } = useToast()
  const isLocal = import.meta.env.VITE_MODE === 'development'
  const onMounted = async () => {
    try {
      await Promise.all([
        api.get<PlaidLink>('/seller/bridge/plaid/link').then(
          plaidLinkData => setLinkToken(plaidLinkData.link_token)
        ),
        api.get<Array<BridgeExternalAccount>>('/seller/bridge/external_accounts').then(
          externalAccountsData => {
            setExternalAccounts(externalAccountsData)
            if (profile.bridge_external_account_id) {
              const storedBankAccount = externalAccountsData.find(
                ({ id }) => id === profile.bridge_external_account_id
              )
              if (storedBankAccount) {
                setBankAccount(storedBankAccount)
              }
            }
          }
        )
      ])
    } catch (e) {
      errorHandler(e)
    }
  }
  const refreshExternalAccounts = () => api.get<Array<BridgeExternalAccount>>('/seller/bridge/external_accounts').then(
    externalAccounts => setExternalAccounts(externalAccounts)
  )
  const saveOffRampConfig = async () => {
    try {
      if (bankAccount) {
        setOffRampLoading(true)
        await api.post('/seller/setup/off-ramp', {
          payment_rail: 'ach',
          currency: 'usd',
          external_account_id: bankAccount.id
        })
        successHandler('Off-ramp settings saved')
      }
    } catch (e) {
      errorHandler(e)
    } finally {
      setOffRampLoading(false)
    }
  }
  const { open: plaidOpen, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token: string, metadata: PlaidLinkOnSuccessMetadata) => {
      try {
        if (isLocal) {
          console.log('onSuccess', { public_token, metadata })
        }
        await api.post<Array<BridgeExternalAccount>>('/seller/bridge/plaid/exchange', {
          public_token,
          link_token: linkToken
        })
      } catch (e) {
        errorHandler(e as Error)
      }
    },
    onExit: (err, metadata) => {
      if (err) {
        errorHandler(err)
      }
      if (isLocal) {
        console.warn('onExit', { err, metadata })
      }
    }
  } as PlaidLinkOptions)
  useEffect(
    () => {
      if (!isMounted.current && profile.bridge_onboarded) {
        isMounted.current = true
        onMounted()
      }
    },
    []
  )
  return profile.bridge_onboarded && <>
    <h2>Off-ramp</h2>
    <p>
      The off-ramp configuration allows Treasury Smart Contract (TSC) to "liquidate" crypto currency accumulated on your behalf and effectively to fund your bank account with earnings from payments.
    </p>
    <section className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <label htmlFor="dd_bank" className='font-bold'>Select bank account</label>
        <div className='flex gap-4'>
          <Dropdown
            className='basis-72'
            inputId='dd_bank'
            value={bankAccount}
            onChange={(e) => setBankAccount(e.value)}
            placeholder="Please select an your bank account from the list"
            options={externalAccounts}
            valueTemplate={
              (bank: BridgeExternalAccount) => {
                return bank
                  ? <span>{`${bank.bank_name} (${bank.account?.last_4})`}</span>
                  : <span>---</span>
              }
            }
            itemTemplate={
              (bank: BridgeExternalAccount) => {
                return <span>{`${bank?.bank_name} (${bank?.account?.last_4})`}</span>
              }
            }
            checkmark={true}
            highlightOnSelect={false} />
          <Button
            icon="pi pi-sync"
            size='small'
            severity='secondary'
            rounded
            outlined
            aria-label="Refresh"
            onClick={refreshExternalAccounts}/>
        </div>
      </div>
      <div className='flex justify-between'>
        <Button
          severity='secondary'
          outlined
          disabled={!plaidReady}
          onClick={
            () => plaidOpen()
          }>
          Link bank account
        </Button>
        <Button
          severity='success'
          disabled={offRampLoading}
          loading={offRampLoading}
          onClick={saveOffRampConfig}>
          <span className='mx-4'>Save</span>
        </Button>
      </div>
    </section>
  </>
}
