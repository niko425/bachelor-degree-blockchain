import { useTranslation } from 'react-i18next'

function ContractInfo({ label, address }) {
  const { t } = useTranslation()

  return (
    <dl className="credential">
      <dt>{label}</dt>
      <dd>{address}</dd>
      <dt>{t('contract.network')}</dt>
      <dd>{t('contract.networkName')}</dd>
    </dl>
  )
}

export default ContractInfo
