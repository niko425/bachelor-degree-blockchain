import { useState } from 'react'
import { Link } from 'react-router-dom'
import ContractInfo from '../components/ContractInfo'
import WalletConnect from '../components/WalletConnect'
import { FACTORY_ADDRESS } from '../contract'

function ElectionListPage({ wallet, factory, onConnect }) {
  const { account, provider } = wallet
  const [newTitle, setNewTitle] = useState('')

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

      {account && factory.loading && <p>Loading elections...</p>}

      {factory.error && <p role="alert">{factory.error}</p>}

      {factory.elections && factory.elections.length === 0 && <p>No elections have been created yet.</p>}

      {factory.elections && factory.elections.length > 0 && (
        <ul className="election-list">
          {factory.elections.map((election) => (
            <li key={election.address}>
              <span>{election.title}</span>
              <span className="election-state">{election.stateLabel}</span>
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
