import { useEffect, useRef, useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { useMarket } from '../contexts/MarketContext'
import MarketCandlestickChart from './MarketCandlestickChart'
import api from '../api/client'
import { ethers } from 'ethers'

function getSentimentMeta(score) {
  const absScore = Math.abs(score)
  const multiplier = absScore === 0 ? 1 : 1 + Math.min(absScore, 10) * 0.1

  if (score > 0) {
    return { label: '긍정', type: 'positive', direction: '상승', multiplier }
  }

  if (score < 0) {
    return { label: '부정', type: 'negative', direction: '하락', multiplier }
  }

  return { label: '중립', type: 'neutral', direction: '변화 없음', multiplier }
}

export default function TradingDashboard() {
  const { user, ethBalance, fetchUser, fetchEthBalance, account } = useWallet()
  const {
    currentPrice,
    priceHistory,
    priceUpdatedAt,
    priceStats,
    fetchHistory,
  } = useMarket()
  const [mode, setMode] = useState('buy')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [displayPrice, setDisplayPrice] = useState(0.0005)
  const [sentimentPopup, setSentimentPopup] = useState(null)

  const lastPopupUpdateRef = useRef(null)

  useEffect(() => {
    setDisplayPrice(currentPrice)
  }, [currentPrice])

  useEffect(() => {
    if (!priceUpdatedAt || priceStats.newsCount <= 0) return

    if (!lastPopupUpdateRef.current) {
      lastPopupUpdateRef.current = priceUpdatedAt
      return
    }

    if (lastPopupUpdateRef.current === priceUpdatedAt) return

    lastPopupUpdateRef.current = priceUpdatedAt

    const sentiment = getSentimentMeta(priceStats.sentimentScore)

    setSentimentPopup({
      text: `보안뉴스 감성 분석 (${sentiment.label}) ${sentiment.multiplier.toFixed(2)}배 ${sentiment.direction}`,
      type: sentiment.type,
    })

    const timeout = setTimeout(() => setSentimentPopup(null), 5000)
    return () => clearTimeout(timeout)
  }, [priceUpdatedAt, priceStats])

  const handleTrade = async () => {
    if (!amount || Number(amount) <= 0) return
    setLoading(true)
    setMsg(null)

    try {
      const cdaAmount = Number(amount)

      if (mode === 'buy') {
        if (!window.ethereum) throw new Error('MetaMask가 필요합니다.')

        const treasuryAddress = import.meta.env.VITE_TREASURY_ADDRESS
        if (!treasuryAddress) throw new Error('서버 지갑 주소가 설정되지 않았습니다.')

        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()

        const tx = await signer.sendTransaction({
          to: treasuryAddress,
          value: ethers.parseEther(costEth.toString()),
        })

        await api.post('/trade/buy', { cdaAmount, txHash: tx.hash })
        setMsg({ type: 'success', text: `${cdaAmount} CDA 매수 완료!` })
      } else {
        await api.post('/trade/sell', { cdaAmount })
        setMsg({ type: 'success', text: `${cdaAmount} CDA 매도 완료!` })
      }

      setAmount('')
      fetchUser()
      fetchEthBalance(account)
      fetchHistory()
    } catch (err) {
      console.error('Trade error:', err)
      setMsg({ type: 'error', text: err.response?.data?.error || err.message || '거래 실패' })
    } finally {
      setLoading(false)
    }
  }

  const costEth = amount ? Number((Number(amount) * displayPrice).toFixed(7)) : 0
  const maxBuy = ethBalance && displayPrice > 0 ? Math.floor(Number(ethBalance) / displayPrice) : 0
  const maxSell = user?.cdaBalance || 0

  return (
    <div className="trading-dashboard-v2">
      <div className="chart-section-full">
        <div className="chart-header-top">
          <div>
            <h2>CDA/ETH</h2>
            <span className="price-large">{displayPrice.toFixed(7)} ETH</span>
          </div>
          <div className="chart-stats">
            <div className="stat-box">
              <span className="label">변동률</span>
              <span className={`value ${priceStats.changePercent >= 0 ? 'up' : 'down'}`}>
                {priceStats.changePercent >= 0 ? '▲' : '▼'}{' '}
                {Math.abs(priceStats.changePercent).toFixed(2)}%
              </span>
            </div>
            <div className="stat-box">
              <span className="label">수집 뉴스</span>
              <span className="value">{priceStats.newsCount}개</span>
            </div>
          </div>
        </div>
        <MarketCandlestickChart
          priceHistory={priceHistory}
          initialPrice={currentPrice}
          onDisplayPriceChange={setDisplayPrice}
          className="chart-container-full"
        />
        {sentimentPopup && (
          <div className={`sentiment-popup ${sentimentPopup.type}`}>
            <span>{sentimentPopup.text}</span>
          </div>
        )}
      </div>

      <div className="middle-section">
        <div className="trade-card">
          <h3>거래하기</h3>

          <div className="toggle-group">
            <button
              className={`toggle-btn ${mode === 'buy' ? 'active' : ''}`}
              onClick={() => {
                setMode('buy')
                setAmount('')
              }}
            >
              매수
            </button>
            <button
              className={`toggle-btn ${mode === 'sell' ? 'active' : ''}`}
              onClick={() => {
                setMode('sell')
                setAmount('')
              }}
            >
              매도
            </button>
          </div>

          <div className="trade-input-group">
            <label>수량 (CDA)</label>
            <div className="input-row">
              <input
                type="number"
                min="1"
                max={mode === 'buy' ? maxBuy : maxSell}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
              <button
                className="max-btn"
                onClick={() => setAmount(mode === 'buy' ? maxBuy : maxSell)}
              >
                MAX
              </button>
            </div>
          </div>

          <div className="trade-summary">
            <div className="summary-row">
              <span>예상 {mode === 'buy' ? '구매가' : '수령액'}</span>
              <strong>{costEth} ETH</strong>
            </div>
            <div className="summary-row">
              <span>평단가</span>
              <strong>{displayPrice.toFixed(7)} ETH</strong>
            </div>
          </div>

          <button
            className={`trade-btn ${mode === 'buy' ? 'buy' : 'sell'}`}
            onClick={handleTrade}
            disabled={loading || !amount}
          >
            {loading ? '처리 중...' : mode === 'buy' ? '매수하기' : '매도하기'}
          </button>

          {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
        </div>

        <div className="info-card">
          <h3>내 자산</h3>

          <div className="info-row">
            <span className="label">ETH 잔액</span>
            <span className="value">{Number(ethBalance).toFixed(7)} ETH</span>
          </div>

          <div className="info-row">
            <span className="label">CDA 보유</span>
            <span className="value">{(user?.cdaBalance || 0).toLocaleString()} CDA</span>
          </div>

          <div className="divider"></div>

          <div className="info-row total">
            <span className="label">총 자산 (ETH 환산)</span>
            <span className="value">
              {(Number(ethBalance) + (user?.cdaBalance || 0) * currentPrice).toFixed(7)} ETH
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
