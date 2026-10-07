'use client'

import { useActionState } from 'react'
import { deleteAccount, resetPassword, updateAccount, type ResetPasswordState } from '@/app/admin-actions'
import type { Dictionary } from '@/lib/i18n'
import { ConfirmButton } from './ConfirmButton'
import { Fields, type DoctorOption, type Option, type StaffValues } from './CreateStaffForm'

/** Edit, reset the password of, or delete one staff account. */
export function AccountEditor({
  account,
  isSelf,
  back,
  t,
  labels,
  clinics,
  doctors,
}: {
  account: StaffValues & { id: string }
  isSelf: boolean
  back: string
  /** Only plain strings can be sent to the browser, so not the whole dictionary. */
  t: Pick<Dictionary, 'admin' | 'edit'>
  labels: { name: string; email: string }
  clinics: Option[]
  doctors: DoctorOption[]
}) {
  const [reset, resetAction, resetting] = useActionState<ResetPasswordState, FormData>(resetPassword, null)
  return (
    <div className="stack edit-panel" style={{ '--stack': '16px' } as React.CSSProperties}>
      <form action={updateAccount} className="stack" style={{ '--stack': '16px' } as React.CSSProperties}>
        <input type="hidden" name="id" value={account.id} />
        <input type="hidden" name="back" value={back} />
        <Fields t={t.admin} labels={labels} clinics={clinics} doctors={doctors} prefix={`acct-${account.id}`} initial={account} lockRole={isSelf} />
        <div>
          <button type="submit" className="btn btn-sm">
            {t.edit.save}
          </button>
        </div>
      </form>
      {!isSelf && (
        <div className="row">
          <form action={resetAction}>
            <input type="hidden" name="id" value={account.id} />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={resetting}>
              {t.edit.resetPassword}
            </button>
          </form>
          <form action={deleteAccount}>
            <input type="hidden" name="id" value={account.id} />
            <input type="hidden" name="back" value={back} />
            <ConfirmButton label={t.edit.deleteAccount} question={t.edit.sure} className="btn btn-danger btn-sm" />
          </form>
        </div>
      )}
      {reset && (
        <div className="card card-paper" role="status">
          <p style={{ margin: 0 }}>{t.edit.newPassword.replace('{email}', account.email)}</p>
          <p dir="ltr" style={{ margin: '8px 0 0', fontFamily: 'monospace', fontSize: '1.25rem' }}>
            {reset.password}
          </p>
        </div>
      )}
    </div>
  )
}
