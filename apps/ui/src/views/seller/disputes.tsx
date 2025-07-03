import { api } from '@/axios'
import { useToast } from '@/toast'
import { useQuery } from '@tanstack/react-query'
import { EvidenceAttr } from 'api/src/db/models'
import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import { InputTextarea } from 'primereact/inputtextarea'
import { Tag } from 'primereact/tag'
import { Tooltip } from 'primereact/tooltip'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

type Evidence = EvidenceAttr & {
  isProvided: boolean
  description: string
}

export default function () {
  const { receipt_id } = useParams()
  const navigate = useNavigate()
  const [submissionLoading, setSubmissionLoading] = useState(false)
  const { errorHandler } = useToast()
  const { data: evidences, isSuccess, refetch: refetchEvidences } = useQuery({
    queryKey: ['evidences', receipt_id],
    queryFn: () => api.get<Array<Evidence>>(`/seller/receipts/${receipt_id}/disputes/evidences`)
  })
  const submitEvidences = async () => {
    try {
      setSubmissionLoading(true)
      await api.post(`/seller/receipts/${receipt_id}/disputes/submit`)
      navigate('/seller/receipts')
    } catch (e) {
      errorHandler(e)
    } finally {
      setSubmissionLoading(false)
    }
  }
  const emptyMessageTemplate = () => <span className='p-2'>
    No results found
  </span>
  const typeTemplate = (e: Evidence) => <>
    <Tag
      className='tag-evidence-type cursor-help'
      severity="info"
      value={e.evidence_type}
      data-pr-tooltip={e.description}
      data-pr-position="top"
      data-pr-at="left top-10"
      data-pr-my="left bottom"
    />
    <Tooltip target={'.tag-evidence-type'} className='max-w-2xl'/>
  </>
  const valueTemplate = (e: Evidence) => {
    const textRef = useRef(null)
    const [isOverflowed, setIsOverflowed] = useState(false)
    if (e.kind === 'text') {
      useEffect(() => {
        const el = textRef.current as any
        if (el) {
          setIsOverflowed(el.scrollWidth > el.clientWidth)
        }
      }, [])
      return <>
        <span
          ref={textRef}
          className={`text-content-${e.id} inline-block truncate w-full`}
          data-pr-tooltip={e.text ?? undefined}
          data-pr-position="top"
          data-pr-at="left top-10"
          data-pr-my="left bottom">
          {e.text ?? <>&mdash;</>}
        </span>
        { isOverflowed && <Tooltip target={`.text-content-${e.id}`} className='w-96'/> }
      </>
    } else {
      return e.file_url
        ? <a
          href={e.file_url}
          className='no-underline text-inherit truncate flex gap-2 items-center'
          target='_blank'
        >
          <i className="pi pi-paperclip"></i>
          {e.file_id}
        </a>
        : <>&mdash;</>
    }
  }
  const actionTemplate = (e: Evidence) => {
    const resetHandler = async () => {
      try {
        await api.delete(`/seller/receipts/${receipt_id}/disputes/evidences/${e.id}`)
        await refetchEvidences()
      } catch (e) {
        errorHandler(e)
      }
    }
    const Reset = () => <Button
      disabled={!e.isProvided}
      severity='danger'
      tooltip='Remove the evidence'
      rounded
      outlined
      icon='pi pi-trash'
      className='p-0 w-8 h-8'
      onClick={resetHandler}
    />
    if (e.kind === 'text') {
      const [value, setValue] = useState(e.text ?? '')
      const [visible, setVisible] = useState(false)
      const updateEvidenceText = async (e:Evidence, text: string) => {
        try {
          await api.post(`/seller/receipts/${receipt_id}/disputes/evidences/${e.id}/text`, {
            text: text || null
          })
          await refetchEvidences()
        } catch (e) {
          errorHandler(e)
        }
      }
      const footerTemplate = () => <div className='flex justify-end'>
        <Button label="Close" icon="pi pi-times" onClick={() => setVisible(false)} className="p-button-text" />
        <Button
          label="Save"
          icon="pi pi-check"
          autoFocus
          onClick={
            async () => {
              setVisible(false)
              await updateEvidenceText(e, value)
            }
          }
        />
      </div>
      return <>
        <Dialog
          header={`Edit evidence '${e.evidence_type}'`}
          footer={footerTemplate}
          visible={visible}
          onHide={
            () => {
              if (!visible) {
                return
              }
              setVisible(false)
            }
          }>
          <InputTextarea
            key={e.id}
            value={value}
            onChange={
              (e) => setValue(e.target.value)
            }
            rows={5}
            cols={60}
          />
        </Dialog>
        <section className='flex gap-2'>
          <Button
            severity='info'
            rounded
            outlined
            onClick={
              () => setVisible(true)
            }
            className='w-8 h-8 p-0'
            icon='pi pi-pencil'
          />
          <Reset/>

        </section>
      </>
    } else {
      const [loading, setLoading] = useState(false)
      const fileRef = useRef<HTMLInputElement>(null)
      const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event?.target?.files?.[0]
        if (!file) {
          return
        }
        const formData = new FormData()
        formData.append('file', file)
        try {
          setLoading(true)
          await api.post(`/seller/receipts/${receipt_id}/disputes/evidences/${e.id}/file`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
          await refetchEvidences()
        } catch (e) {
          errorHandler(e)
        } finally {
          setLoading(false)
        }
      }
      return <>
        <input
          ref={fileRef}
          type="file"
          className='hidden'
          onChange={handleUpload}
        />
        <section className='flex gap-2'>
          <Button
            severity='info'
            loading={loading}
            rounded
            outlined
            icon='pi pi-upload'
            className='p-0 w-8 h-8'
            onClick={
              () => fileRef?.current?.click()
            }
          />
          <Reset/>
        </section>
      </>
    }
  }
  return isSuccess && <article className='h-full flex flex-col gap-4 overflow-y-hidden'>
    <h2 className=''>
      Please provide evidences to challenge the open dispute
    </h2>
    <p>
      The worksheet with evidences below allows for multiple editing/uploading of artifacts.
      All updates remain temporal before you click on "<strong>Submit evidences to bank</strong>" button.
      The submission is a one-time process and cannot be repeated.
    </p>
    <section className='flex-grow overflow-y-auto'>
      <DataTable
        showGridlines
        value={evidences}
        emptyMessage={emptyMessageTemplate}
      >
        <Column header="Type" body={typeTemplate} bodyClassName='p-2' headerClassName='p-2'></Column>
        <Column header="Action" body={actionTemplate} bodyClassName='w-24'></Column>
        <Column header="Current value" body={valueTemplate} bodyClassName='w-96 max-w-96 pr-4'></Column>
      </DataTable>
    </section>
    <section className='flex justify-end'>
      <Button
        size='small'
        loading={submissionLoading}
        severity='warning'
        label='Submit evidences to bank'
        onClick={() => submitEvidences()}
      />
    </section>
  </article>
}
