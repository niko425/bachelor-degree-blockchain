import { useState } from 'react'

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
      <legend>Admin panel</legend>

      <p>
        Election state: <strong>{stateLabel}</strong>
      </p>

      {stateLabel === 'Setup' && (
        <>
          <form onSubmit={handleAddCandidate}>
            <label>
              Candidate name{' '}
              <input
                type="text"
                value={newCandidateName}
                onChange={(e) => setNewCandidateName(e.target.value)}
              />
            </label>{' '}
            <button type="submit" className="button-seal">
              {adminAction === 'addCandidate' ? 'Adding...' : 'Add candidate'}
            </button>
          </form>

          <form onSubmit={handleApproveVoter}>
            <label>
              Voter address{' '}
              <input
                type="text"
                className="address-input"
                placeholder="0x..."
                value={newVoterAddress}
                onChange={(e) => setNewVoterAddress(e.target.value)}
              />
            </label>{' '}
            <button type="submit" className="button-seal">
              {adminAction === 'approveVoter' ? 'Approving...' : 'Approve voter'}
            </button>
          </form>

          <button
            type="button"
            className="button-seal"
            onClick={onStartVoting}
            disabled={candidateCount === 0}
          >
            {adminAction === 'startVoting' ? 'Starting...' : 'Start voting'}
          </button>
          {candidateCount === 0 && <p className="helper-text">Add at least one candidate before starting voting.</p>}
        </>
      )}

      {stateLabel === 'Voting' && (
        <button
          type="button"
          className="button-seal"
          onClick={onEndVoting}
        >
          {adminAction === 'endVoting' ? 'Ending...' : 'End voting'}
        </button>
      )}

      {stateLabel === 'Ended' && <p>Voting has ended, showing final results</p>}

      {adminNotice && <p className="notice-success">{adminNotice}</p>}
      {adminError && <p role="alert">{adminError}</p>}
    </fieldset>
  )
}

export default AdminPanel
