import { useEffect, useMemo, useRef } from 'react'
import { createChart } from 'lightweight-charts'

const MIN_PRICE = 0.0005
const MAX_PRICE = 0.001
const RANDOM_TICK_RANGE = 0.000012
const CHART_STORAGE_KEY = 'cadena-trade-chart-candles'
const MAX_STORED_CANDLES = 180

function clampPrice(price) {
  return Number(Math.max(MIN_PRICE, Math.min(MAX_PRICE, price)).toFixed(7))
}

function makeHistoryCandle(record) {
  const price = record.price
  const previousPrice = record.previousPrice || price

  return {
    time: Math.floor(new Date(record.date || record.createdAt).getTime() / 1000),
    open: previousPrice,
    high: Math.max(previousPrice, price),
    low: Math.min(previousPrice, price),
    close: price,
  }
}

function loadStoredCandles() {
  try {
    const raw = localStorage.getItem(CHART_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((candle) => (
        Number.isFinite(candle.time) &&
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close)
      ))
      .slice(-MAX_STORED_CANDLES)
  } catch {
    return []
  }
}

function saveStoredCandles(candles) {
  try {
    localStorage.setItem(
      CHART_STORAGE_KEY,
      JSON.stringify(candles.slice(-MAX_STORED_CANDLES)),
    )
  } catch {
    // Ignore storage quota or privacy-mode errors.
  }
}

function publishCandleStats(candles, onStatsChange) {
  if (!onStatsChange || candles.length === 0) return

  onStatsChange({
    high: Math.max(...candles.map((candle) => candle.high)),
    low: Math.min(...candles.map((candle) => candle.low)),
  })
}

export default function MarketCandlestickChart({
  priceHistory,
  initialPrice = MIN_PRICE,
  onDisplayPriceChange,
  onStatsChange,
  className = '',
}) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const seriesRef = useRef(null)
  const candlesRef = useRef([])
  const lastCandleRef = useRef(null)
  const hasFitContentRef = useRef(false)

  const candles = useMemo(() => (
    Array.from(
      new Map(priceHistory.map((record) => {
        const candle = makeHistoryCandle(record)
        return [candle.time, candle]
      })).values(),
    ).sort((a, b) => a.time - b.time)
  ), [priceHistory])

  useEffect(() => {
    if (!chartRef.current) return undefined

    chartInstance.current = createChart(chartRef.current, {
      layout: {
        background: { color: '#0f0f1a' },
        textColor: '#e0e0e0',
      },
      grid: {
        vertLines: { color: '#1a1a2e' },
        horzLines: { color: '#1a1a2e' },
      },
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight || 280,
      timeScale: { timeVisible: true, barSpacing: 50 },
      crosshair: { mode: 0 },
    })

    seriesRef.current = chartInstance.current.addCandlestickSeries({
      priceFormat: {
        type: 'price',
        precision: 7,
        minMove: 0.0000001,
      },
      upColor: '#ef4444',
      downColor: '#3b82f6',
      borderUpColor: '#ef4444',
      borderDownColor: '#3b82f6',
      wickUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
    })

    const storedCandles = loadStoredCandles()
    if (storedCandles.length > 0) {
      candlesRef.current = storedCandles
      lastCandleRef.current = storedCandles[storedCandles.length - 1]
      seriesRef.current.setData(storedCandles)
      onDisplayPriceChange?.(lastCandleRef.current.close)
      publishCandleStats(storedCandles, onStatsChange)

      chartInstance.current?.timeScale().fitContent()
      hasFitContentRef.current = true
    }

    const handleResize = () => {
      if (!chartRef.current || !chartInstance.current) return

      chartInstance.current.applyOptions({
        width: chartRef.current.clientWidth,
        height: chartRef.current.clientHeight || 280,
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.remove()
      chartInstance.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return

    const candleMap = new Map(candlesRef.current.map((candle) => [candle.time, candle]))

    for (const candle of candles) {
      candleMap.set(candle.time, candle)
    }

    const mergedCandles = Array.from(candleMap.values())
      .sort((a, b) => a.time - b.time)
      .slice(-MAX_STORED_CANDLES)

    candlesRef.current = mergedCandles
    lastCandleRef.current = mergedCandles[mergedCandles.length - 1] || null
    seriesRef.current.setData(mergedCandles)
    saveStoredCandles(mergedCandles)
    publishCandleStats(mergedCandles, onStatsChange)

    if (lastCandleRef.current) {
      onDisplayPriceChange?.(lastCandleRef.current.close)
    }

    if (!hasFitContentRef.current) {
      chartInstance.current?.timeScale().fitContent()
      hasFitContentRef.current = true
    }
  }, [candles, onDisplayPriceChange, onStatsChange])

  useEffect(() => {
    const interval = setInterval(() => {
      const last = lastCandleRef.current
      const basePrice = last ? last.close : initialPrice
      const newPrice = clampPrice(basePrice + (Math.random() - 0.5) * RANDOM_TICK_RANGE)

      try {
        if (seriesRef.current) {
          const time = Math.floor(Date.now() / 1000)

          if (last && last.time === time) {
            const updated = {
              time,
              open: last.open,
              high: Math.max(last.high, newPrice),
              low: Math.min(last.low, newPrice),
              close: newPrice,
            }

            const lastIndex = candlesRef.current.length - 1
            if (lastIndex >= 0) candlesRef.current[lastIndex] = updated
            lastCandleRef.current = updated
            seriesRef.current.update(updated)
            saveStoredCandles(candlesRef.current)
            publishCandleStats(candlesRef.current, onStatsChange)
          } else {
            const candle = {
              time,
              open: last ? last.close : newPrice,
              high: newPrice,
              low: newPrice,
              close: newPrice,
            }

            candlesRef.current = [...candlesRef.current, candle].slice(-MAX_STORED_CANDLES)
            lastCandleRef.current = candle
            seriesRef.current.update(candle)
            saveStoredCandles(candlesRef.current)
            publishCandleStats(candlesRef.current, onStatsChange)
          }

          onDisplayPriceChange?.(newPrice)
        }
      } catch {
        // The chart can be unavailable for a moment during startup.
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [initialPrice, onDisplayPriceChange, onStatsChange])

  return <div ref={chartRef} className={`market-candlestick-chart ${className}`.trim()} />
}
