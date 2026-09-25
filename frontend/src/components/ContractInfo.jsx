import { BALLOT_ADDRESS } from '../contract'

function ContractInfo() {
  return (
    <dl className="credential">
      <dt>Contract</dt>
      <dd>{BALLOT_ADDRESS}</dd>
      <dt>Network</dt>
      <dd>Sepolia</dd>
    </dl>
  )
}

export default ContractInfo
