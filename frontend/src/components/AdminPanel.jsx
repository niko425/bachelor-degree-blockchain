import { useState } from 'react'
import { useTranslation } from 'react-i18next'

function AdminPanel({
  stateLabel,
  adminAction,
  adminError,
  adminNotice,
  candidateCount,
  onAddCandidate,
  onApproveVoter,
  onStartVoting,
  onEndVoting,
}) {
  const { t } = useTranslation()
  const [newCandidateName, setNewCandidateName] = useState('')
  const [newVoterAddress, setNewVoterAddress] = useState('')

  async function handleAddCandidate(event) {
    event.preventDefault()

    if (await onAddCandidate(newCandidateName)) {
      setNewCandidateName('')
    }
  }

  async function handleApproveVoter(event) {
    event.preventDefault()

    if (await onApproveVoter(newVoterAddress)) {
      setNewVoterAddress('')
    }
  }

  return (
    <fieldset className="admin-panel" disabled={adminAction !== null}>
      <legend>{t('admin.legend')}</legend>

      <p>
        {t('admin.stateLabel')} <strong>{stateLabel ? t(`state.${stateLabel}`) : '—'}</strong>
      </p>

      {stateLabel === 'Setup' && (
        <>
          <form onSubmit={handleAddCandidate}>
            <label>
              {t('admin.candidateName')}{' '}
              <input
                type="text"
                value={newCandidateName}
                onChange={(e) => setNewCandidateName(e.target.value)}
              />
            </label>{' '}
            <button type="submit" className="button-seal">
              {adminAction === 'addCandidate' ? t('admin.adding') : t('admin.addCandidate')}
            </button>
          </form>

          <form onSubmit={handleApproveVoter}>
            <label>
              {t('admin.voterAddress')}{' '}
              <input
                type="text"
                className="address-input"
                placeholder={t('admin.addressPlaceholder')}
                value={newVoterAddress}
                onChange={(e) => setNewVoterAddress(e.target.value)}
              />
            </label>{' '}
            <button type="submit" className="button-seal">
              {adminAction === 'approveVoter' ? t('admin.approving') : t('admin.approveVoter')}
            </button>
          </form>

          <button
            type="button"
            className="button-seal"
            onClick={onStartVoting}
            disabled={candidateCount === 0}
          >
            {adminAction === 'startVoting' ? t('admin.starting') : t('admin.startVoting')}
          </button>
          {candidateCount === 0 && <p className="helper-text">{t('admin.needCandidate')}</p>}
        </>
      )}

      {stateLabel === 'Voting' && (
        <button
          type="button"
          className="button-seal"
          onClick={onEndVoting}
        >
          {adminAction === 'endVoting' ? t('admin.ending') : t('admin.endVoting')}
        </button>
      )}

      {stateLabel === 'Ended' && <p>{t('admin.ended')}</p>}

      {adminNotice && <p className="notice-success">{adminNotice}</p>}
      {adminError && <p role="alert">{adminError}</p>}
    </fieldset>
  )
}

export default AdminPanel
