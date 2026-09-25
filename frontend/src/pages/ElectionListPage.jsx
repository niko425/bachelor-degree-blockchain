import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ContractInfo from '../components/ContractInfo'
import WalletConnect from '../components/WalletConnect'
import { FACTORY_ADDRESS } from '../contract'
import { formatTurnout } from '../lib/format'

function ElectionListPage({ wallet, factory, onConnect }) {
  const { account, provider } = wallet
  const [newTitle, setNewTitle] = useState('')

  const loadElections = factory.loadElections

  useEffect(() => {
    if (!provider) {
      return
    }

    loadElections(provider)
  }, [provider, loadElections])

  const isOwner =
    account !== null && factory.owner !== null && account.toLowerCase() === factory.owner.toLowerCase()

  async function handleCreateElection(event) {
    event.preventDefault()

    if (await factory.createElection(provider, newTitle)) {
      setNewTitle('')
    }
  }

  return (
    <>
      <h1>Blockchain voting</h1>

      <ContractInfo label="Factory" address={FACTORY_ADDRESS} />

      <WalletConnect
        account={account}
        connecting={wallet.connecting}
        error={wallet.error}
        onConnect={onConnect}
      />

      {!account && <p>Connect your wallet to see the elections.</p>}

      {account && factory.loading && !factory.elections && <p>Loading elections...</p>}

      {factory.error && <p role="alert">{factory.error}</p>}

      {factory.elections && factory.elections.length === 0 && <p>No elections have been created yet.</p>}

      {factory.elections && factory.elections.length > 0 && (
        <ul className="election-list">
          {factory.elections.map((election) => (
            <li key={election.address}>
              <span>{election.title}</span>
              <span className="election-state">{election.stateLabel}</span>
              <span className="election-figure">
                {election.totalVotes} {election.totalVotes === 1 ? 'vote' : 'votes'}
              </span>
              <span className="election-figure">
                {formatTurnout(election.totalVotes, election.approvedVoterCount)}
              </span>
              <Link to={`/election/${election.address}`}>Open</Link>
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <fieldset className="admin-panel" disabled={factory.creating}>
          <legend>Create election</legend>

          <form onSubmit={handleCreateElection}>
            <label>
              Election title{' '}
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </label>{' '}
            <button type="submit" className="button-seal">
              {factory.creating ? 'Creating...' : 'Create election'}
            </button>
          </form>

          {factory.createNotice && <p className="notice-success">{factory.createNotice}</p>}
          {factory.createError && <p role="alert">{factory.createError}</p>}
        </fieldset>
      )}
    </>
  )
}

export default ElectionListPage
