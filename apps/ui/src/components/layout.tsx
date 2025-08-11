import { Menubar } from 'primereact/menubar'
import { Outlet, useNavigate } from 'react-router'

const pathForPadding = [
  '/',
  '/status'
]

export default function ()  {
  const navigate = useNavigate()
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
          label: 'Profile',
          command: () => {
            navigate('/seller')
          }
        },
        {
          label: 'Stripe onboarding',
          command: () => {
            navigate('/seller/kyc/stripe')
          }
        }
      ]
    },
    {
      label: 'Buyer',
      icon: 'pi pi-credit-card',
      items: [
        {
          label: 'Guest',
          command: () => {
            navigate('/buyer')
          }
        },
        {
          label: 'Authenticated',
          command: () => {
            navigate('/buyer/authenticated')
          }
        }
      ]
    }
  ]

  return <main className='h-full flex flex-col overflow-y-hidden'>
    <Menubar model={items} />
    <article className='prose max-w-full flex-grow overflow-y-auto p-8'>
      <Outlet/>
    </article>
  </main>
}
