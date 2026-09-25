function ContractInfo({ label = 'Contract', address }) {
  return (
    <dl className="credential">
      <dt>{label}</dt>
      <dd>{address}</dd>
      <dt>Network</dt>
      <dd>Sepolia</dd>
    </dl>
  )
}

export default ContractInfo
