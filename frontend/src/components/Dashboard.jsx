import { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, Gift, Shield,
  Newspaper, AlertTriangle, ExternalLink,
  MapPin, User, Wallet, Clock, BarChart2,
} from "lucide-react";
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useWallet } from "../contexts/WalletContext";
import { useMarket } from "../contexts/MarketContext";
import MarketCandlestickChart from "./MarketCandlestickChart";
import api from "../api/client";

/* ──────────────────── 차트 섹션 ──────────────────── */
function DashboardChart() {
  const { currentPrice, priceHistory } = useMarket();
  const [displayPrice, setDisplayPrice] = useState(currentPrice);
  const [chartStats, setChartStats] = useState(null);

  const prev = priceHistory.length >= 2 ? priceHistory[priceHistory.length - 2]?.price : currentPrice;
  const change = displayPrice - (prev || displayPrice);
  const pct = prev ? ((change / prev) * 100).toFixed(2) : "0.00";
  const isUp = change >= 0;

  useEffect(() => {
    setDisplayPrice(currentPrice);
  }, [currentPrice]);

  return (
    <div className="db-card">
      <div className="db-chart-header">
        <div>
          <p className="db-label">CADENA / ETH</p>
          <div className="db-price-row">
            <span className="db-price-big">{displayPrice.toFixed(6)} ETH</span>
            <span className={`db-badge-pct ${isUp ? "up" : "down"}`}>
              {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isUp ? "+" : ""}{pct}%
            </span>
          </div>
        </div>
      </div>

      <div className="db-chart-wrap">
        <MarketCandlestickChart
          priceHistory={priceHistory}
          initialPrice={currentPrice}
          onDisplayPriceChange={setDisplayPrice}
          onStatsChange={setChartStats}
        />
      </div>

      {chartStats && (
        <div className="db-chart-stats">
          <div>
            <p className="db-label">최고가</p>
            <p className="db-stat-val up">{chartStats.high.toFixed(6)} ETH</p>
          </div>
          <div>
            <p className="db-label">최저가</p>
            <p className="db-stat-val down">{chartStats.low.toFixed(6)} ETH</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* 보상 지점 좌표 — 경기도 고양시 덕양구 대자동 동헌로 305 (중부대학교 고양캠퍼스) */
const REWARD_LATLNG = [37.7132095, 126.8904235];
const REWARD_RADIUS = 200; // 반경 200m 이내 인증 가능 표시

/* 사용자 위치가 바뀌면 지도 중심 이동 */
function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 1.2 });
  }, [position, map]);
  return null;
}

/* 커스텀 마커 아이콘 */
const userIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:14px;height:14px;background:#60a5fa;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px #60a5fa99"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const rewardIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:18px;height:18px;background:#EAB308;border:2px solid #fff;border-radius:50%;box-shadow:0 0 10px #EAB30899"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/* ──────────────────── 위치 보상 섹션 ──────────────────── */
function DashboardReward({ onOpenLocation }) {
  const [userPos, setUserPos] = useState(null);

  /* 페이지 진입 시 현재 위치 조회 (지도 표시용) */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  return (
    <div className="db-card">
      <h3 className="db-section-title" style={{ marginBottom: "1rem" }}>
        <Gift size={16} color="#EAB308" /> 위치보상
      </h3>

      {/* 지도 */}
      <div className="db-map-wrap">
        <MapContainer
          center={REWARD_LATLNG}
          zoom={15}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* 보상 지점 강조 원 */}
          <Circle
            center={REWARD_LATLNG}
            radius={REWARD_RADIUS}
            pathOptions={{ color: "#EAB308", fillColor: "#EAB308", fillOpacity: 0.18, weight: 2 }}
          />
          <Marker position={REWARD_LATLNG} icon={rewardIcon}>
            <Popup>
              <strong style={{ color: "#EAB308" }}>📍 보상 지점</strong><br />
              동헌로 305, 대자동<br />
              고양시 덕양구
            </Popup>
          </Marker>

          {/* 사용자 현재 위치 */}
          {userPos && (
            <>
              <FlyTo position={userPos} />
              <Marker position={userPos} icon={userIcon}>
                <Popup>내 현재 위치</Popup>
              </Marker>
            </>
          )}
        </MapContainer>

        <div className="db-map-legend">
          <span className="db-map-dot gold" /> 보상 지점
          <span className="db-map-dot blue" style={{ marginLeft: "0.75rem" }} /> 내 위치
        </div>
      </div>

      <button
        className="db-claim-btn"
        onClick={onOpenLocation}
      >
        <MapPin size={15} />
        GPS 인증하고 CDA 받기
      </button>

      <div className="db-info-box">
        <Shield size={16} color="#EAB308" />
        <div>
          <p className="db-info-title">동헌로 305 방문 인증</p>
          <p className="db-label">해당 위치 방문 시 CDA 100개 지급 · 24시간 쿨다운</p>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── 보안뉴스 섹션 ──────────────────── */
function DashboardNews() {
  const { news } = useMarket();

  const severityOf = (title = "") => {
    const t = title.toLowerCase();
    if (t.includes("랜섬웨어") || t.includes("해킹") || t.includes("취약점") || t.includes("zero")) return "high";
    if (t.includes("공격") || t.includes("침해") || t.includes("악성") || t.includes("피싱")) return "medium";
    return "low";
  };

  const cfg = {
    high:   { label: "높음", cls: "sev-high" },
    medium: { label: "보통", cls: "sev-med"  },
    low:    { label: "낮음", cls: "sev-low"  },
  };

  return (
    <div className="db-card">
      <div className="db-section-header">
        <h3 className="db-section-title">
          <Newspaper size={16} color="#EAB308" /> 보안뉴스
        </h3>
        <div className="db-threat-badge">
          <AlertTriangle size={13} />
          <span>{news.length}건</span>
        </div>
      </div>

      <div className="db-news-list">
        {news.length === 0 && (
          <p className="db-label" style={{ textAlign: "center", padding: "1rem" }}>뉴스 로딩 중...</p>
        )}
        {news.map((item, i) => {
          const sev = severityOf(item.title);
          const c = cfg[sev];
          return (
            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="db-news-item">
              <div className="db-news-item-top">
                {sev !== "low" && <span className={`db-sev-tag ${c.cls}`}>{c.label}</span>}
                <span className="db-label" style={{ fontSize: "0.73rem" }}>
                  {item.pubDate ? new Date(item.pubDate).toLocaleDateString("ko-KR") : ""}
                </span>
              </div>
              <p className="db-news-title">{item.title}</p>
              <div className="db-news-footer">
                <span className="db-label" style={{ fontSize: "0.73rem" }}>{item.source}</span>
                <ExternalLink size={11} color="#94a3b8" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────── 프로필 섹션 ──────────────────── */
function DashboardProfile() {
  const { user, account, ethBalance } = useWallet();
  const { currentPrice } = useMarket();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get("/trade/history").then((r) => setHistory(r.data)).catch(() => {});
  }, []);

  const cdaBalance = user?.cdaBalance || 0;
  const ethAsCda = currentPrice > 0 ? Number(ethBalance) / currentPrice : 0;
  const totalCda = cdaBalance + ethAsCda;
  const totalReward = (user?.locationClaimCount || 0) * 100;
  const grade = totalReward >= 1000 ? "Gold" : totalReward >= 300 ? "Silver" : null;
  const gradeColor = grade === "Gold" ? "#EAB308" : "#94a3b8";

  const buyCount  = history.filter((t) => t.type === "buy").length;
  const sellCount = history.filter((t) => t.type === "sell").length;

  const joinedAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("ko-KR")
    : "-";

  return (
    <div className="db-card db-profile-card">
      {/* 아바타 + 지갑 주소 */}
      <div className="db-profile-top">
        <div className="db-avatar">
          <User size={28} color="#EAB308" />
        </div>
        <div>
          <p className="db-profile-name">내 지갑</p>
          <p className="db-profile-address">
            {account ? `${account.slice(0, 8)}...${account.slice(-6)}` : "-"}
          </p>
          {grade && (
            <span className="db-profile-grade" style={{ color: gradeColor, borderColor: gradeColor }}>
              {grade}
            </span>
          )}
        </div>
      </div>

      {/* 자산 요약 */}
      <div className="db-profile-assets">
        <p className="db-label" style={{ marginBottom: "0.5rem" }}>
          <BarChart2 size={13} style={{ display: "inline", marginRight: 4 }} />
          자산 현황
        </p>
        <div className="db-asset-total">
          <span className="db-label">총 자산</span>
          <span className="db-asset-big">{totalCda.toFixed(2)} CDA</span>
        </div>
        <div className="db-asset-row">
          <div className="db-asset-chip">
            <Wallet size={13} color="#60a5fa" />
            <span className="db-label">ETH → CDA</span>
            <span className="blue">{ethAsCda.toFixed(2)} CDA</span>
          </div>
          <div className="db-asset-chip">
            <span className="db-label" style={{ fontSize: "0.75rem" }}>₿</span>
            <span className="db-label">보유 CDA</span>
            <span className="yellow">{cdaBalance.toLocaleString()} CDA</span>
          </div>
        </div>
        <div className="db-portfolio-bar-wrap">
          <div
            className="db-portfolio-bar-fill"
            style={{ width: totalCda > 0 ? `${Math.min((cdaBalance / totalCda) * 100, 100).toFixed(1)}%` : "0%" }}
          />
        </div>
        <div className="db-portfolio-bar-labels">
          <span className="db-label">ETH 환산 비중</span>
          <span className="db-label">CDA 비중 {totalCda > 0 ? ((cdaBalance / totalCda) * 100).toFixed(1) : 0}%</span>
        </div>
      </div>

      {/* 활동 통계 */}
      <div className="db-profile-stats">
        <p className="db-label" style={{ marginBottom: "0.5rem" }}>
          <Clock size={13} style={{ display: "inline", marginRight: 4 }} />
          활동 통계
        </p>
        <div className="db-stat-list">
          <div className="db-stat-item">
            <span className="db-label">매수 횟수</span>
            <span className="green">{buyCount}회</span>
          </div>
          <div className="db-stat-item">
            <span className="db-label">매도 횟수</span>
            <span className="red">{sellCount}회</span>
          </div>
          <div className="db-stat-item">
            <span className="db-label">위치 보상</span>
            <span className="yellow">{user?.locationClaimCount || 0}회</span>
          </div>
          <div className="db-stat-item">
            <span className="db-label">누적 CDA 보상</span>
            <span className="purple">{totalReward} CDA</span>
          </div>
          <div className="db-stat-item">
            <span className="db-label">마지막 위치인증</span>
            <span>
              {user?.lastLocationClaim
                ? new Date(user.lastLocationClaim).toLocaleDateString("ko-KR")
                : "없음"}
            </span>
          </div>
          <div className="db-stat-item">
            <span className="db-label">가입일</span>
            <span>{joinedAt}</span>
          </div>
        </div>
      </div>

      {/* 최근 거래 */}
      <div className="db-profile-recent">
        <p className="db-label" style={{ marginBottom: "0.5rem" }}>최근 거래 내역</p>
        {history.length === 0 && (
          <p className="db-label" style={{ textAlign: "center", padding: "0.75rem" }}>거래 내역 없음</p>
        )}
        {history.slice(0, 5).map((tx) => (
          <div key={tx._id} className="db-trade-row">
            <span className="db-label" style={{ fontSize: "0.75rem" }}>
              {new Date(tx.createdAt).toLocaleDateString("ko-KR")}
            </span>
            <span className={tx.type === "buy" ? "green" : tx.type === "sell" ? "red" : "yellow"}>
              {tx.type === "buy" ? "매수" : tx.type === "sell" ? "매도" : tx.type === "location_reward" ? "위치보상" : "초기지급"}
            </span>
            <span>{tx.cdaAmount > 0 ? `${tx.cdaAmount} CDA` : "-"}</span>
            <span className="db-label">
              {tx.price > 0 && tx.cdaAmount > 0
                ? `${(tx.ethAmount || 0).toFixed(6)} ETH`
                : "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────── 메인 대시보드 ──────────────────── */
export default function Dashboard({ onOpenLocation }) {
  const { fetchUser } = useWallet();
  useEffect(() => { fetchUser(); }, [fetchUser]);

  return (
    <div className="db-grid">
      <div className="db-col-left">
        <DashboardChart />
        <div className="db-bottom-row">
          <DashboardReward onOpenLocation={onOpenLocation} />
          <DashboardNews />
        </div>
      </div>
      <div className="db-col-right">
        <DashboardProfile />
      </div>
    </div>
  );
}
