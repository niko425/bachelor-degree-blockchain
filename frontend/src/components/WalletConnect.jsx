import { useTranslation } from 'react-i18next'

function WalletConnect({ account, connecting, error, onConnect }) {
  const { t } = useTranslation()

  return (
    <>
      {account ? (
        <p>
          {t('wallet.connected')} <code>{account}</code>
        </p>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          disabled={connecting}
        >
          {connecting ? t('wallet.connecting') : t('wallet.connect')}
        </button>
      )}

      {error && <p role="alert">{error}</p>}
    </>
  )
}

export default WalletConnect
