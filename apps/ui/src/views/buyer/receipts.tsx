import { api } from '@/axios'
import { useQuery } from '@tanstack/react-query'
import type { ReceiptAttr, RefundAttr, InstallmentAttr } from 'api/src/db/models'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { useToast } from '@/toast'
import { Tag } from 'primereact/tag'
import { Tooltip } from 'primereact/tooltip'
import { useState } from 'react'
import { Divider } from 'primereact/divider'

type ExternalURI = {
  href: string
  text: string
} | null

type Receipt = ReceiptAttr & {
  createdAt: Date
  seller: {
    email: string
  }
  URIs: {
    nft: ExternalURI
    pledge: ExternalURI
    refund: ExternalURI
  }
  installments: Array<InstallmentAttr & {
    refund: RefundAttr | null
    URIs: Record<string, ExternalURI>
  }>
}


export default function () {
  const { errorHandler, successHandler } = useToast()
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const { data: receipts, isSuccess, refetch: refetchReceipts } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => api.get<Array<Receipt>>('/buyer/receipts')
  })
  const openBillingPortal = async () => {
    try {
      const { url } = await api.post<{url: string}>('/buyer/create-portal-session')
      if (url) {
        window.open(url, '_blank')
      }
    } catch {
      errorHandler(new Error('Unable to open billing portal'))
    }
  }
  const amountTemplate = (r: Receipt) => Number(r.total_amount).toLocaleString(
    'en-US',
    {
      style: 'currency',
      currency: 'USD'
    }
  )
  const emptyMessageTemplate = () => <span className='p-2'>
    No results found
  </span>
  const dateTemplate = (r: Receipt) => r.createdAt
    ? <span> {new Date(r.createdAt).toLocaleString()} </span>
    : 'N/A'
  const refundTemplate = (r: Receipt) => {
    const getInner = (r: Receipt) => {
      switch (r.refund_status) {
        case 'done': {
          const ts = new Date(r.refund_available_on as any).toDateString()
          return <>
            <Tag
              className='tag-refunded cursor-help'
              severity="success"
              value="Refunded"
              data-pr-tooltip={`Available on ${ts}`}
              data-pr-position="top"
              data-pr-at="center top-10"
              data-pr-my="center bottom"
            />
            <Tooltip target={'.tag-refunded'} />
          </>
        }
        case 'in-progress': return <Tag severity="warning" value="In Progress"></Tag>
        case 'denied': return <Tag severity="danger" value="Denied"></Tag>
        case 'failed': return <Tag severity="danger" value="Failed"></Tag>
        case 'requested': return <Tag severity="info" value="Pending"></Tag>
        case 'not-requested': return <Button
          size='small'
          outlined
          severity="info"
          className='py-0.5'
          label="Request"
          onClick={
            async () => {
              try {
                await api.post('/buyer/request-refund', { receipt_id: r.id })
                await refetchReceipts()
                successHandler('Refund requested')
              } catch (e) {
                errorHandler(e)
              }
            }
          }
        />
      }
    }

    return <div className='h-8 flex items-center'>
      { getInner(r) }
    </div>
  }
  const statusTemplate = (r: Receipt) => {
    if (r.dispute_status !== 'none') {
      return <Tag severity="warning" value="Disputed"></Tag>
    }
    switch (r.status) {
      case 'paid': return <Tag severity="success" value="Paid"></Tag>
      case 'created': return <Tag value="Pending"></Tag>
      case 'in-progress': return <Tag severity="info" value="Partially paid"></Tag>
      case 'failed': return <Tag severity="danger" value="Failed"></Tag>
    }
  }
  const rowExpansionTemplate = (r: Receipt) => {
    type Installment = Receipt['installments'][number]
    const paymentIntentTemplate = (i: Installment) => <a
      href={i.stripe_receipt_url}
      target='_blank' > {i.payment_intent_id} </a>
    const amountTemplate = (i: Installment) => Number(i.amount).toLocaleString(
      'en-US',
      {
        style: 'currency',
        currency: 'USD'
      }
    )
    const dateTemplate = (i: Installment) => <span> {new Date(i.scheduled_on).toLocaleString()} </span>
    const statusTemplate = (i: Installment) => {
      switch (i.status) {
        case 'payment_scheduled':
        case 'created': return <Tag severity="info" value="Pending"></Tag>
        case 'paid-out':
        case 'paid-in': return <Tag severity="success" value="Paid"></Tag>
        case 'failed': return <Tag severity="danger" value="Failed"></Tag>
        case 'canceled': return <Tag severity="warning" value="Canceled"></Tag>
      }
    }
    const hashTemplate = (key: string) => (i: Installment) => {
      const v = i.URIs[key]
      return v
        ? <a
          href={v.href}
          target='_blank'
          className='no-underline text-blue-600'>
          {`${v.text.slice(0, 3)}...${v.text.slice(-3)}`}
        </a>
        : 'N/A'
    }
    return <section className='p-4'>
      <h3 className='my-0'>Blockchain data</h3>
      <ul>
        {
          Object.entries(r.URIs).filter(
            ([, v]) => Boolean(v)
          ).map(
            ([k, v], idx) => <li key={idx}>
              <a href={v?.href} className='no-underline text-blue-600' target="_blank">{`${k} >> ${v?.text}`}</a>
            </li>
          )
        }
      </ul>
      <Divider />
      <h3 className='my-0'>Installment(s)</h3>
      <DataTable
        value={r.installments}
        showGridlines
        sortField="idx"
        sortOrder={+1}
      >
        <Column header="ID" body={paymentIntentTemplate} bodyClassName='p-2' headerClassName='p-2'></Column>
        <Column header="Date" body={dateTemplate}></Column>
        <Column header="Amount" body={amountTemplate}></Column>
        <Column header="Failures" field='failed_times'></Column>
        <Column header="Confirm" body={hashTemplate('confirm')}></Column>
        <Column header="Status" body={statusTemplate} className='w-28'></Column>
      </DataTable>

    </section>
  }
  const allowExpansion = (r: Receipt) => {
    return r.installments.length > 0
  }
  return isSuccess && <article className='h-full flex flex-col overflow-y-hidden'>
    <h2>Receipts for past orders, paid by you:</h2>
    <section className='flex-grow overflow-y-auto'>
      <DataTable
        sortField="createdAt"
        sortOrder={-1}
        showGridlines
        value={receipts}
        emptyMessage={emptyMessageTemplate}
        rowExpansionTemplate={rowExpansionTemplate}
        dataKey="id"
        expandedRows={expandedRows}
        onRowToggle={
          (e) => {
            setExpandedRows(e.data as any)
          }
        }
      >
        <Column expander={allowExpansion} bodyClassName='w-10 p-2'/>
        <Column field="seller.email" header="Seller"></Column>
        <Column header="Amount" sortable body={amountTemplate}></Column>
        <Column header="Purchased on" sortable field="createdAt" body={dateTemplate}></Column>
        <Column header="Status" body={statusTemplate} className='w-28'></Column>
        <Column header="Refund" body={refundTemplate} className='w-36'></Column>
      </DataTable>
    </section>
    <p>
      To replace the default payment method associated with all pending payments, please navigate to the hosted "Billing Portal" by clicking the corresponding button below
    </p>
    <section className='flex justify-between'>
      <Button
        size='small'
        severity='info'
        outlined
        label='Update default payment method'
        onClick={openBillingPortal}
      />
      <Button
        size='small'
        severity='success'
        label='Refresh'
        onClick={() => refetchReceipts()}
      />
    </section>
  </article>
}
