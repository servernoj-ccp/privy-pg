import { createContext, useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router'

export const installmentIntervalValues = ['1m', '5m', '1h', '1d', '1w', '2w', '1mo', '3mo'] as const
export type InstallmentInterval = typeof installmentIntervalValues[number]

type CheckoutState = {
  email: string
  amount: number
  installments: number
  installmentsInterval: InstallmentInterval
}

interface CheckoutStateContextType {
  state: CheckoutState;
  setEmail: (value: string) => void;
  setAmount: (value: number) => void;
  setInstallments: (value: number) => void;
  setInstallmentsInterval: (value: InstallmentInterval) => void;
  reset: () => void
}

const CheckoutContext = createContext<CheckoutStateContextType | undefined>(undefined)

export const useCheckout = () => {
  const context = useContext(CheckoutContext)
  if (!context) {
    throw new Error('useCheckout() hook can only be used inside <CheckoutProvider/>')
  }
  return context
}

export default () => {
  const defaultState: CheckoutState = {
    email: '',
    amount: 0,
    installments: 1,
    installmentsInterval: '1m'
  }
  const [state, setState] = useState<CheckoutState>(() => {
    const savedState = sessionStorage.getItem('checkoutState')
    return savedState
      ? JSON.parse(savedState)
      : defaultState
  })
  useEffect(
    () => {
      sessionStorage.setItem('checkoutState', JSON.stringify(state))
    },
    [state]
  )
  const setEmail = (value: string) => {
    setState((prevState) => ({ ...prevState, email: value }))
  }
  const setAmount = (value: number) => {
    setState((prevState) => ({ ...prevState, amount: value }))
  }
  const setInstallments = (value: number) => {
    setState((prevState) => ({ ...prevState, installments: value }))
  }
  const setInstallmentsInterval = (value: InstallmentInterval) => {
    setState((prevState) => ({ ...prevState, installmentsInterval: value }))
  }
  const reset = () => {
    setState(defaultState)
  }
  return <CheckoutContext.Provider value={{ state, setEmail, setAmount, setInstallments, setInstallmentsInterval, reset }}>
    <Outlet/>
  </CheckoutContext.Provider>
}

