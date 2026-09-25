import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isAddress } from 'ethers'
import ActivityLog from '../components/ActivityLog'
import AdminPanel from '../components/AdminPanel'
import CandidateList from '../components/CandidateList'
import ContractInfo from '../components/ContractInfo'
import WalletConnect from '../components/WalletConnect'
import { useActivityLog } from '../hooks/useActivityLog'
import { useBallot } from '../hooks/useBallot'

function ElectionPage({ wallet, factory, onConnect }) {
  const { address } = useParams()
  const { account, provider } = wallet

  const election = factory.elections?.find(
    (candidate) => candidate.address.toLowerCase() === address.toLowerCase()
  )

  const activityLog = useActivityLog(address, election?.createdBlock)
  const ballot = useBallot(provider, address, activityLog.loadActivity)

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
      <p>
        <Link className="back-link" to="/">
          Back to all elections
        </Link>
      </p>

      <h1>{election ? election.title : 'Election'}</h1>

      <ContractInfo label="Election" address={address} />

      <WalletConnect
        account={account}
        connecting={wallet.connecting}
        error={wallet.error}
        onConnect={onConnect}
      />

      {!account && <p>Connect your wallet to see this election.</p>}

      {account && !isAddress(address) && (
        <p role="alert">This is not a valid contract address.</p>
      )}

      {account && isAddress(address) && factory.loading && <p>Loading election...</p>}

      {account && isAddress(address) && !factory.loading && factory.elections && !election && (
        <p role="alert">This address is not an election created by this factory.</p>
      )}

      {election && (
        <>
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

          <ActivityLog
            account={account}
            activity={activityLog.activity}
            activityLoading={activityLog.activityLoading}
            activityError={activityLog.activityError}
            candidates={ballot.candidates}
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
        </>
      )}
    </>
  )
}

export default ElectionPage
