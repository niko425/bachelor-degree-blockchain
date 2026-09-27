import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import ContractInfo from '../components/ContractInfo'
import { FACTORY_ADDRESS } from '../contract'
import { formatTurnout } from '../lib/format'
import { localeFor } from '../lib/i18n'

function ElectionListPage({ wallet, factory }) {
  const { t, i18n } = useTranslation()
  const locale = localeFor(i18n.language)
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
      <h1>{t('app.title')}</h1>

      <ContractInfo label={t('contract.factory')} address={FACTORY_ADDRESS} />

      {!account && <p>{t('electionList.connectPrompt')}</p>}

      {account && factory.loading && !factory.elections && <p>{t('electionList.loading')}</p>}

      {factory.error && <p role="alert">{factory.error}</p>}

      {factory.elections && factory.elections.length === 0 && <p>{t('electionList.empty')}</p>}

      {factory.elections && factory.elections.length > 0 && (
        <ul className="election-list">
          {factory.elections.map((election) => (
            <li key={election.address}>
              <span>{election.title}</span>
              <span className="election-state">{t(`state.${election.stateLabel}`)}</span>
              <span className="election-figure">
                {t('candidates.votes', { count: election.totalVotes })}
              </span>
              <span className="election-figure">
                {formatTurnout(election.totalVotes, election.approvedVoterCount, locale)}
              </span>
              <Link to={`/election/${election.address}`}>{t('electionList.view')}</Link>
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <fieldset className="admin-panel" disabled={factory.creating}>
          <legend>{t('electionList.createLegend')}</legend>

          <form onSubmit={handleCreateElection}>
            <label>
              {t('electionList.titleLabel')}{' '}
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </label>{' '}
            <button type="submit" className="button-seal">
              {factory.creating ? t('electionList.creating') : t('electionList.create')}
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
