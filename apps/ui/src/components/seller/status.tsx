import { Tooltip } from 'primereact/tooltip'

type Props = {
  dues: {
    stripeAccountDues: Array<string>
    bridgeAccountDues: Array<string>
  }
}

export default function ({ dues }: Props) {
  const renderStatus = (flag?: boolean) => {
    const className = `m-0 pi ${
      flag
        ? 'pi-check-circle text-green-500'
        : 'pi-times-circle text-red-400'
    }`
    return <i className={className}/>
  }
  return <>
    <h2>Account status:</h2>
    <ul>
      <li className='flex gap-4 items-center'>
        <span>Stripe:</span>
        <span
          id='stripe-status'
          data-pr-tooltip={dues.stripeAccountDues.slice(0, 4).join(', ')}
          data-pr-position='right'>
          {renderStatus(!dues.stripeAccountDues.length)}
        </span>
        {
          !!dues.stripeAccountDues.length &&
          <Tooltip
            target="#stripe-status"
            pt={{
              text: 'text-xs'
            } as any}
          />
        }
      </li>
      <li className='flex gap-4 items-center'>
        <span>Bridge:</span>
        <span
          id='bridge-status'
          data-pr-tooltip={dues.bridgeAccountDues.slice(0, 4).join(', ')}
          data-pr-position='right'>
          {renderStatus(!dues.bridgeAccountDues.length)}
        </span>
        {
          !!dues.bridgeAccountDues.length &&
          <Tooltip
            target="#bridge-status"
            pt={{
              text: 'text-xs'
            } as any}
          />
        }
      </li>
    </ul>
  </>
}
