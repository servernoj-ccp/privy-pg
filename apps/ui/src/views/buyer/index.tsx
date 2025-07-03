import { Button } from 'primereact/button'
import { useNavigate } from 'react-router'

export default function () {
  const navigate = useNavigate()
  return <article className='flex flex-col items-start'>
    <Button label="Shopping" link onClick={
      () => {
        navigate('shopping')
      }
    }/>
    <Button label="Receipts" link onClick={
      () => {
        navigate('receipts')
      }
    }/>
  </article>
}
