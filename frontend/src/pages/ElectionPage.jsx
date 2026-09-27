import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { isAddress } from 'ethers'
import ActivityLog from '../components/ActivityLog'
import AdminPanel from '../components/AdminPanel'
import CandidateList from '../components/CandidateList'
import ContractInfo from '../components/ContractInfo'
import ElectionStats from '../components/ElectionStats'
import ResultsChart from '../components/ResultsChart'
import { useActivityLog } from '../hooks/useActivityLog'
import { useBallot } from '../hooks/useBallot'

function ElectionPage({ wallet, factory }) {
  const { t } = useTranslation()
  const { address } = useParams()
  const { account, provider } = wallet

  const election = factory.elections?.find(
    (candidate) => candidate.address.toLowerCase() === address.toLowerCase()
  )

  const loadElections = factory.loadElections

  const refreshElections = useCallback(() => {
    if (provider) {
      loadElections(provider)
    }
  }, [provider, loadElections])

  const activityLog = useActivityLog(address, election?.createdBlock)
  const ballot = useBallot(provider, address, activityLog.loadActivity, refreshElections)

  const loadCandidates = ballot.loadCandidates
  const loadElectionInfo = ballot.loadElectionInfo
  const loadActivity = activityLog.loadActivity
  const electionAddress = election?.address

  useEffect(() => {
    if (!provider || !electionAddress) {
      return
    }

    loadCandidates(provider)
    loadElectionInfo(provider)
    loadActivity(provider)
  }, [provider, electionAddress, loadCandidates, loadElectionInfo, loadActivity])

  const isAdmin =
    account !== null && ballot.adminAddress !== null && account.toLowerCase() === ballot.adminAddress.toLowerCase()

  return (
    <>
      <p className="back-link-row">
        <Link className="back-link" to="/">
          {t('election.back')}
        </Link>
      </p>

      <h1>{election ? election.title : t('election.fallbackTitle')}</h1>

      <ContractInfo label={t('contract.election')} address={address} />

      {!account && <p>{t('election.connectPrompt')}</p>}

      {account && !isAddress(address) && <p role="alert">{t('election.invalidAddress')}</p>}

      {account && isAddress(address) && factory.loading && !factory.elections && (
        <p>{t('election.loading')}</p>
      )}

      {account && isAddress(address) && !factory.loading && factory.elections && !election && (
        <p role="alert">{t('election.notFromFactory')}</p>
      )}

      {election && (
        <>
          <ElectionStats
            approvedVoterCount={ballot.approvedVoterCount}
            totalVotes={ballot.totalVotes}
            candidateCount={ballot.candidateCount}
            stateLabel={ballot.stateLabel}
          />

          <ResultsChart candidates={ballot.candidates} />

          <CandidateList
            account={account}
            candidates={ballot.candidates}
            candidatesError={ballot.candidatesError}
            votingFor={ballot.votingFor}
            voteError={ballot.voteError}
            lastVotedId={ballot.lastVotedId}
            stateLabel={ballot.stateLabel}
            onVote={ballot.castVote}
            onTickEnd={ballot.clearVoteTick}
          />

          {isAdmin && (
            <AdminPanel
              stateLabel={ballot.stateLabel}
              adminAction={ballot.adminAction}
              adminError={ballot.adminError}
              adminNotice={ballot.adminNotice}
              candidateCount={ballot.candidateCount}
              onAddCandidate={ballot.addCandidate}
              onApproveVoter={ballot.approveVoter}
              onStartVoting={ballot.startVoting}
              onEndVoting={ballot.endVoting}
            />
          )}

          <ActivityLog
            account={account}
            activity={activityLog.activity}
            activityLoading={activityLog.activityLoading}
            activityError={activityLog.activityError}
            candidates={ballot.candidates}
          />
        </>
      )}
    </>
  )
}

export default ElectionPage
