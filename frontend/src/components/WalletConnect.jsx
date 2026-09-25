function WalletConnect({ account, connecting, error, onConnect }) {
  return (
    <>
      {account ? (
        <p>
          Connected wallet: <code>{account}</code>
        </p>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          disabled={connecting}
        >
          {connecting ? 'Connecting...' : 'Connect wallet'}
        </button>
      )}

      {error && <p role="alert">{error}</p>}
    </>
  )
}

export default WalletConnect
