import ActivityLog from './components/ActivityLog'
import AdminPanel from './components/AdminPanel'
import CandidateList from './components/CandidateList'
import ContractInfo from './components/ContractInfo'
import WalletConnect from './components/WalletConnect'
import { useActivityLog } from './hooks/useActivityLog'
import { useBallot } from './hooks/useBallot'
import { useWallet } from './hooks/useWallet'
import './App.css'

function App() {
  const { account, provider, error, connecting, connect } = useWallet()
  const { activity, activityLoading, activityError, loadActivity } = useActivityLog()
  const ballot = useBallot(provider, loadActivity)

  const isAdmin =
    account !== null && ballot.adminAddress !== null && account.toLowerCase() === ballot.adminAddress.toLowerCase()

  function handleConnect() {
    return connect(async (browserProvider) => {
      await Promise.all([ballot.loadCandidates(browserProvider), ballot.loadElectionInfo(browserProvider)])
      await loadActivity(browserProvider)
    })
  }

  return (
    <section id="center">
      <h1>Blockchain voting</h1>

      <ContractInfo />

      <span className="contract-watermark" aria-hidden="true">VERIFIABLE</span>

      <WalletConnect account={account} connecting={connecting} error={error} onConnect={handleConnect} />

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
        activity={activity}
        activityLoading={activityLoading}
        activityError={activityError}
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
    </section>
  )
}

export default App
