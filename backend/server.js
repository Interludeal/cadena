require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const cron = require('node-cron')
const { updatePriceFromNews } = require('./src/services/newsService')
const { seedInitialPrice } = require('./src/services/priceService')

const app = express()

app.use(
  cors({
    origin: ['http://localhost:5173', 'https://cadena-three.vercel.app'],
  }),
)
app.use(express.json())

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cadana')
  .then(async () => {
    console.log('MongoDB connected')
    await seedInitialPrice()
  })
  .catch((err) => console.error('MongoDB error:', err))

app.use('/api/auth', require('./src/routes/auth'))
app.use('/api/trade', require('./src/routes/trade'))
app.use('/api/location', require('./src/routes/location'))
app.use('/api/news', require('./src/routes/news'))
app.use('/api/price', require('./src/routes/price'))

// 자동 가격 업데이트
// 1분마다 최근 10개 기사 수집 & 감성 분석 (테스트용)
const schedulePattern = '0 * * * * *' // 1분마다

cron.schedule(schedulePattern, async () => {
  console.log(
    `⏰ Running news price update at ${new Date().toLocaleString('ko-KR')}...`,
  )
  try {
    const result = await updatePriceFromNews()
    console.log(`✅ Price update completed:`, result)
  } catch (err) {
    console.error(`❌ Price update failed:`, err.message)
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Cadana backend running on port ${PORT}`))
