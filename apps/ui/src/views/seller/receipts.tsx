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
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { useNavigate } from 'react-router'

type ExternalURI = {
  href: string
  text: string
} | null

type Receipt = ReceiptAttr & {
  createdAt: Date
  buyer_email: string
  URIs: {
    pledge: ExternalURI
    refund: ExternalURI
    withdraw: ExternalURI
  }
  installments: Array<InstallmentAttr & {
    refund: RefundAttr | null
  }>
}


export default function () {
  const { errorHandler, successHandler, warnHandler } = useToast()
  const navigate = useNavigate()
  const doWithdraw = async (r: Receipt) => {
    try {
      await api.post(`/seller/receipts/${r.id}/withdraw`)
      successHandler('Withdrawing started')
      await refetchReceipts()
    } catch (e) {
      errorHandler(e)
    }
  }
  const doRefund = async (r: Receipt, action: 'deny' | 'start') => {
    try {
      await api.post(`/seller/receipts/${r.id}/${action}-refund`)
      if (action === 'deny') {
        warnHandler('Refund request denied')
      } else if (action === 'start') {
        successHandler('Refund process started')
      }
      await refetchReceipts()
    } catch (e) {
      errorHandler(e)
    }
  }
  const doDispute = async (r: Receipt, action: 'accept' | 'challenge') => {
    try {
      if (action === 'accept') {
        await api.post(`/seller/receipts/${r.id}/disputes/submit?action=accept`)
        setTimeout(
          refetchReceipts,
          5000
        )
      } else {
        navigate(`/seller/receipts/${r.id}/disputes`)
      }
    } catch (e) {
      errorHandler(e)
    }
  }
  const selectDisputeAction = async (r: Receipt) => {
    try {
      confirmDialog({
        message: 'What would you like to do with this dispute?',
        header: 'Action on dispute',
        icon: 'pi pi-question-circle',
        defaultFocus: 'accept',
        position: 'top',
        acceptLabel: 'Challenge',
        rejectLabel: 'Accept as "Lost"',
        acceptClassName: 'ml-4 p-button-success',
        rejectClassName: 'p-button-danger',
        accept: doDispute.bind(null, r, 'challenge'),
        reject: doDispute.bind(null, r, 'accept')
      })
    } catch (e) {
      errorHandler(e)
    }
  }
  const selectRefundAction = async (r: Receipt) => {
    try {
      confirmDialog({
        message: 'What would you like to with this refund request?',
        header: 'Action on refund',
        icon: 'pi pi-question-circle',
        defaultFocus: 'accept',
        position: 'top',
        acceptLabel: 'Accept',
        rejectLabel: 'Deny',
        acceptClassName: 'p-button-success',
        rejectClassName: 'p-button-danger',
        accept: doRefund.bind(null, r, 'start'),
        reject: doRefund.bind(null, r, 'deny')
      })
    } catch (e) {
      errorHandler(e)
    }
  }
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const { data: receipts, isSuccess, refetch: refetchReceipts } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => api.get<Array<Receipt>>('/seller/receipts')
  })
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
  const withdrawTemplate = (r: Receipt) => {
    const getInner = (r: Receipt) => {
      switch (r.withdraw_status) {
        case 'done': return <Tag severity="success" value="Finished"></Tag>
        case 'available': return <Button
          size='small'
          outlined
          severity='info'
          className='py-0.5'
          label='Start'
          onClick={doWithdraw.bind(null, r)}
        />
        case 'in-progress': return <Tag severity="info" value="In progress"></Tag>
        case 'failed': return <Tag severity="danger" value="Failed"></Tag>
        default: return 'N/A'
      }
    }
    return <div className='h-8 flex items-center'>
      { getInner(r) }
    </div>
  }
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
        case 'denied': return <Tag severity="danger" value="Denied"></Tag>
        case 'failed': return <Tag severity="danger" value="Failed"></Tag>
        case 'in-progress': return <Tag severity="info" value="In-Progress"></Tag>
        case 'not-requested': return <Button
          size='small'
          outlined
          severity='info'
          className='py-0.5'
          label='Start'
          onClick={doRefund.bind(null, r, 'start')}
        />
        case 'requested': return <Button
          size='small'
          outlined
          severity='warning'
          className='py-0.5'
          label='Action'
          onClick={selectRefundAction.bind(null, r)}
        />
      }
    }
    return <div className='h-8 flex items-center'>
      { getInner(r) }
    </div>
  }
  const statusTemplate = (r: Receipt) => {
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
        <Column header="Status" body={statusTemplate} className='w-28'></Column>
      </DataTable>

    </section>
  }
  const disputeTemplate = (r: Receipt) => {
    const getInner = (r: Receipt) => {
      switch (r.dispute_status) {
        case 'won': return <Tag severity="success" value="Won"></Tag>
        case 'lost': return <Tag severity="danger" value="Lost"></Tag>
        case 'mixed': return <Tag severity="secondary" value="Mixed"></Tag>
        case 'under_review': return <Tag severity="warning" value="Under review"></Tag>
        case 'open': {
          return <Button
            size='small'
            className='py-0.5'
            outlined
            severity='warning'
            label='!'
            onClick={selectDisputeAction.bind(null, r)}
          />
        }
        default: return 'N/A'
      }
    }
    return <div className='h-8 flex items-center'>
      { getInner(r) }
    </div>
  }
  const allowExpansion = (r: Receipt) => {
    return r.installments.length > 0
  }
  return isSuccess && <article className='h-full flex flex-col overflow-y-hidden'>
    <h2>Receipts for past orders, paid to you:</h2>
    <ConfirmDialog />
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
        <Column field="buyer_email" header="Buyer"></Column>
        <Column header="Amount" sortable body={amountTemplate}></Column>
        <Column header="Purchased on" sortable field="createdAt" body={dateTemplate}></Column>
        <Column header="Status" body={statusTemplate} className='w-32'></Column>
        <Column header="Withdraw" body={withdrawTemplate} className='w-32'></Column>
        <Column header="Refund" body={refundTemplate} className='w-36'></Column>
        <Column header="Dispute" body={disputeTemplate} className='w-36'></Column>
      </DataTable>
    </section>
    <section className='flex justify-between'>
      <Button
        size='small'
        severity='success'
        label='Refresh'
        onClick={() => refetchReceipts()}
      />
    </section>
  </article>
}
