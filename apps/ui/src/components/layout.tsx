import { Menubar } from 'primereact/menubar'
import { Outlet, useNavigate } from 'react-router'

const pathForPadding = [
  '/',
  '/status'
]

export default function ()  {
  const navigate = useNavigate()
  const isIframe = window.self !== window.top
  const items = [
    {
      label: 'Home',
      icon: 'pi pi-home',
      command: () => {
        navigate('/')
      }
    },
    {
      label: 'Seller',
      icon: 'pi pi-briefcase',
      items: [
        {
          label: 'Account',
          command: () => {
            navigate('/seller')
          }
        },
        {
          label: 'Receipts',
          command: () => {
            navigate('/seller/receipts')
          }
        }
      ]
    },
    {
      label: 'Buyer',
      icon: 'pi pi-credit-card',
      items: [
        {
          label: 'Shopping',
          command: () => {
            navigate('/buyer/shopping')
          }
        },
        {
          label: 'Receipts',
          command: () => {
            navigate('/buyer/receipts')
          }
        }
      ]
    }
  ]
  const contentWithPadding = isIframe || pathForPadding.includes(location.pathname)
  const contentClassName = [
    'prose',
    'max-w-full',
    'flex-grow',
    'overflow-y-auto',
    ...(
      contentWithPadding
        ? ['p-8']
        : []
    )
  ].join(' ')

  return <main className='h-full flex flex-col overflow-y-hidden'>
    {
      !isIframe && <Menubar model={items} />
    }
    <article className={contentClassName}>
      <Outlet/>
    </article>
  </main>
}
