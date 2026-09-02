import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api, type CoinPack } from '../api'
import { useAuth } from '../AuthContext'

export default function WalletPage() {
  const { user, refreshUser } = useAuth()
  const [packs, setPacks] = useState<CoinPack[]>([])
  const [buying, setBuying] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.coinPacks().then(setPacks)
  }, [])

  if (!user) return <Navigate to="/login" replace />

  const purchase = async (packId: string) => {
    setBuying(packId)
    setMessage('')
    try {
      const result = await api.purchaseCoins(packId)
      await refreshUser()
      setMessage(`Added ${result.coinsAdded} coins. New balance: ${result.coins}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Purchase failed')
    } finally {
      setBuying(null)
    }
  }

  return (
    <div className="wallet-page">
      <section className="wallet-header">
        <p className="eyebrow">Your wallet</p>
        <h1>◎ {user.coins} coins</h1>
        <p className="hero-copy">Use coins to unlock VIP chapters and support writers.</p>
      </section>

      {message && <div className="inline-notice">{message}</div>}

      <section className="coin-grid">
        {packs.map((pack) => (
          <div key={pack.id} className="coin-pack">
            <p className="pack-label">{pack.label}</p>
            <p className="pack-coins">◎ {pack.coins + pack.bonus}</p>
            {pack.bonus > 0 && <p className="pack-bonus">+{pack.bonus} bonus</p>}
            <p className="pack-price">${pack.price.toFixed(2)}</p>
            <button
              className="btn primary full"
              disabled={buying === pack.id}
              onClick={() => purchase(pack.id)}
            >
              {buying === pack.id ? 'Processing…' : 'Buy'}
            </button>
          </div>
        ))}
      </section>

      <p className="payment-note">
        Payments are mocked for now. In production, connect Stripe or PayPal like JJWXC's coin top-up flow.
      </p>
    </div>
  )
}
