import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
  X, Maximize2, Shrink,
  Search, Home as HomeIcon, Star, Clock,
  MapPin, Navigation as NavIcon, ChevronRight,
  Fuel, ParkingMeter, Zap, Coffee, UtensilsCrossed,
  Volume2, VolumeX, ArrowLeft,
} from 'lucide-react'

import imgMap from '../../assets/images/image 21.png'
import imgMapSmall from '../../assets/images/image 21-2.png'
import groupPin from '../../assets/icons/Group 49.svg'
import vectorRoad from '../../assets/icons/Vector-3.svg'

const PLACES = [
  { id: 1, name: '집', addr: '서울 마포구 합정동', icon: HomeIcon, eta: 18, km: 9.2, cat: 'home' },
  { id: 2, name: '회사', addr: '서울 강남구 테헤란로 152', icon: 'work', eta: 24, km: 12.4, cat: 'work' },
  { id: 3, name: '스타벅스 강남점', addr: '서울 강남구 강남대로 390', icon: Coffee, eta: 8, km: 3.1, cat: 'cafe' },
  { id: 4, name: '아버지 댁', addr: '경기 성남시 분당구 정자동', icon: HomeIcon, eta: 32, km: 18.6, cat: 'family' },
  { id: 5, name: 'SK주유소 양재점', addr: '서울 서초구 양재대로 100', icon: Fuel, eta: 12, km: 5.4, cat: 'fuel' },
  { id: 6, name: '코엑스 주차장', addr: '서울 강남구 영동대로 513', icon: ParkingMeter, eta: 16, km: 8.1, cat: 'parking' },
  { id: 7, name: '한남동 맛집거리', addr: '서울 용산구 한남대로 27', icon: UtensilsCrossed, eta: 22, km: 10.7, cat: 'food' },
  { id: 8, name: 'GS칼텍스 충전소', addr: '서울 강남구 봉은사로 524', icon: Zap, eta: 14, km: 6.8, cat: 'charge' },
]

const CATEGORIES = [
  { id: 'fuel', label: '주유소', icon: Fuel, color: '#E85D5D' },
  { id: 'parking', label: '주차장', icon: ParkingMeter, color: '#4A90D9' },
  { id: 'charge', label: '충전소', icon: Zap, color: '#34C759' },
  { id: 'cafe', label: '카페', icon: Coffee, color: '#A07855' },
  { id: 'food', label: '맛집', icon: UtensilsCrossed, color: '#FF9500' },
]

const RECENT_SEARCHES = ['강남역', '집', '코엑스', '연남동 카페', '인천공항']

const ROUTES = [
  { label: '추천', etaDelta: 0, kmDelta: 0, detail: '통행료 2,300원 · 신호 6개', tag: '가장 빠름' },
  { label: '최단', etaDelta: -2, kmDelta: -0.4, detail: '통행료 3,800원 · 신호 4개', tag: '짧음' },
  { label: '무료', etaDelta: 6, kmDelta: 1.8, detail: '통행료 0원 · 신호 11개', tag: '무료' },
]

export default function NavigationApp({ isFullscreen, setIsFullscreen, isBriefingOpen, onClose }) {
  const [view, setView] = useState('home') // home | search | route
  const [activeTab, setActiveTab] = useState('Home')
  const [destination, setDestination] = useState(null)
  const [routeIdx, setRouteIdx] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [favIds, setFavIds] = useState(new Set([1, 2]))
  const [muted, setMuted] = useState(false)

  const briefingWidth = 420 + 30 + 16
  const getWidth = () => {
    if (isFullscreen && isBriefingOpen) return 1920 - briefingWidth
    if (isFullscreen) return 1920
    if (isBriefingOpen) return 1410 - briefingWidth
    return 1410
  }
  const getLeft = () => (isFullscreen ? 0 : 461)

  const isNarrow = !isFullscreen || isBriefingOpen
  const filtered = selectedCategory ? PLACES.filter(p => p.cat === selectedCategory) : PLACES
  const baseEta = destination?.eta ?? 0
  const baseKm = destination?.km ?? 0
  const selectedRoute = ROUTES[routeIdx]

  const toggleFav = (id) => {
    setFavIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const pickDestination = (place) => {
    setDestination(place)
    setView('route')
  }

  const TABS = [
    { id: 'Home', icon: HomeIcon },
    { id: 'Search', icon: Search },
    { id: 'Favorites', icon: Star },
    { id: 'Recent', icon: Clock },
  ]

  return (
    <motion.div
      initial={{
        opacity: 0, y: 60,
        left: getLeft(), top: isFullscreen ? 79 : 104,
        width: getWidth(), height: isFullscreen ? 880 : 830,
      }}
      animate={{
        opacity: 1, y: 0, scale: 1,
        width: getWidth(), height: isFullscreen ? 880 : 830,
        left: getLeft(), top: isFullscreen ? 79 : 104,
      }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', stiffness: 250, damping: 30 }}
      className={`absolute z-30 overflow-hidden ${isFullscreen ? '' : 'border border-[rgba(19,20,23,0.05)]'}`}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(237,238,242,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow: isFullscreen ? 'none' : '0px 12px 48px 0px rgba(0,0,0,0.12)',
        borderRadius: isFullscreen ? '0px' : '32px',
      }}
    >
      {/* Window Controls */}
      <div className="absolute top-[30px] right-[40px] flex items-center gap-[16px] z-10">
        <button
          onClick={() => setMuted(m => !m)}
          className="w-[48px] h-[48px] rounded-full bg-white border border-[rgba(19,20,23,0.1)] shadow-[0px_4px_12px_rgba(0,0,0,0.05)] hover:bg-[#f7f8fa] transition-all flex items-center justify-center text-[#131417]"
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="w-[48px] h-[48px] rounded-full bg-white border border-[rgba(19,20,23,0.1)] shadow-[0px_4px_12px_rgba(0,0,0,0.05)] hover:bg-[#f7f8fa] transition-all flex items-center justify-center text-[#131417]"
        >
          {isFullscreen ? <Shrink size={20} /> : <Maximize2 size={20} />}
        </button>
        <button
          onClick={onClose}
          className="w-[48px] h-[48px] rounded-full bg-white border border-[rgba(19,20,23,0.1)] shadow-[0px_4px_12px_rgba(0,0,0,0.05)] hover:bg-[#f7f8fa] transition-all flex items-center justify-center text-[#131417]"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex w-full h-full">
        {/* Sidebar */}
        <div className={`border-r border-[rgba(19,20,23,0.05)] bg-[rgba(255,255,255,0.3)] flex flex-col pt-[40px] shrink-0 transition-all duration-300 ${isNarrow ? 'w-[100px] items-center' : 'w-[260px]'}`}>
          <div className="flex flex-col gap-[8px] px-[16px] mt-[80px]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setView(tab.id === 'Search' ? 'search' : 'home'); setDestination(null) }}
                className={`flex items-center rounded-[16px] transition-all ${
                  activeTab === tab.id
                    ? 'bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.04)] text-[#131417]'
                    : 'text-[#666] hover:bg-[rgba(255,255,255,0.5)]'
                } ${isNarrow ? 'justify-center w-[68px] h-[60px] mx-auto' : 'px-[20px] py-[16px]'}`}
              >
                <tab.icon size={22} />
                {!isNarrow && <span className={`ml-[16px] text-[18px] ${activeTab === tab.id ? 'font-medium' : ''}`}>{tab.id}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 flex flex-col h-full ${isNarrow ? 'p-[40px]' : 'p-[60px]'} overflow-hidden`}>
          {/* Route view (when destination picked) */}
          {view === 'route' && destination ? (
            <div className="flex flex-col h-full">
              <button
                onClick={() => { setDestination(null); setView(activeTab === 'Search' ? 'search' : 'home') }}
                className="self-start flex items-center gap-2 text-[#99a1af] hover:text-[#131417] mb-[24px] text-[18px] font-medium"
              >
                <ArrowLeft size={20} /> 뒤로
              </button>

              <div className="flex items-center gap-[18px] mb-[36px]">
                <div className="w-[64px] h-[64px] rounded-[20px] bg-white border border-[rgba(19,20,23,0.08)] flex items-center justify-center shrink-0 shadow-[0px_6px_12px_rgba(0,0,0,0.06)]">
                  <NavIcon size={28} className="text-[#2d7cf1]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[18px] font-medium text-[#99a1af] leading-[24px]">목적지</p>
                  <p className="text-[32px] font-semibold text-[#131417] leading-[40px] tracking-[-0.6px] truncate">{destination.name}</p>
                  <p className="text-[16px] text-[#99a1af] truncate">{destination.addr}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-[12px] mb-[32px]">
                {ROUTES.map((r, i) => {
                  const isActive = routeIdx === i
                  return (
                    <button
                      key={r.label}
                      onClick={() => setRouteIdx(i)}
                      className={`text-left p-[20px] rounded-[20px] border transition-all ${
                        isActive
                          ? 'bg-white border-[#2d7cf1] shadow-[0px_8px_20px_rgba(45,124,241,0.15)]'
                          : 'bg-white/60 border-[rgba(19,20,23,0.08)] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-[8px]">
                        <span className={`text-[20px] font-semibold ${isActive ? 'text-[#2d7cf1]' : 'text-[#131417]'}`}>{r.label}</span>
                        <span className="text-[12px] font-semibold text-[#99a1af] px-[8px] py-[2px] rounded-full bg-[rgba(19,20,23,0.05)]">{r.tag}</span>
                      </div>
                      <p className="text-[24px] font-bold text-[#131417] tabular-nums">{baseEta + r.etaDelta}<span className="text-[14px] font-normal text-[#99a1af] ml-[3px]">분</span></p>
                      <p className="text-[14px] text-[#99a1af] mt-[4px] tabular-nums">{(baseKm + r.kmDelta).toFixed(1)} km · {r.detail}</p>
                    </button>
                  )
                })}
              </div>

              <button className="w-full py-[22px] rounded-full text-white text-[24px] font-semibold flex items-center justify-center gap-3 shadow-[0_10px_24px_rgba(45,124,241,0.32)]"
                style={{ background: 'linear-gradient(-90deg, #77a9e8 0%, #2d7cf1 100%)' }}>
                <NavIcon size={24} /> {selectedRoute.label} 경로로 안내 시작
              </button>

              {isFullscreen && (
                <div className="mt-[28px] flex-1 rounded-[24px] overflow-hidden border border-[rgba(19,20,23,0.08)] relative">
                  <img src={imgMap} alt="" className="w-full h-full object-cover" />
                  <img src={vectorRoad} alt="" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] opacity-50" />
                  <img src={groupPin} alt="" className="absolute top-[30%] left-[45%] w-[40px]" />
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Search bar */}
              <div className="flex items-center gap-[12px] bg-white border border-[rgba(19,20,23,0.08)] rounded-full px-[24px] py-[16px] mb-[28px] shadow-[0px_2px_8px_rgba(0,0,0,0.04)]">
                <Search size={22} className="text-[#99a1af] shrink-0" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="어디로 갈까요?"
                  className="flex-1 text-[20px] outline-none bg-transparent placeholder:text-[#99a1af]"
                />
              </div>

              {/* Category chips */}
              {view === 'home' && (
                <div className="flex items-center gap-[12px] mb-[28px] overflow-x-auto pb-[4px]">
                  {CATEGORIES.map((c) => {
                    const isActive = selectedCategory === c.id
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategory(isActive ? null : c.id)}
                        className={`flex items-center gap-[8px] px-[18px] py-[12px] rounded-full border transition-all shrink-0 ${
                          isActive
                            ? 'bg-[#131417] text-white border-[#131417]'
                            : 'bg-white text-[#131417] border-[rgba(19,20,23,0.1)] hover:bg-[#f7f8fa]'
                        }`}
                      >
                        <c.icon size={18} style={{ color: isActive ? '#fff' : c.color }} />
                        <span className="text-[16px] font-medium">{c.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Recent searches (search view) */}
              {view === 'search' && (
                <div className="mb-[24px]">
                  <p className="text-[14px] font-semibold text-[#99a1af] mb-[12px] uppercase tracking-wider">최근 검색</p>
                  <div className="flex flex-wrap gap-[8px]">
                    {RECENT_SEARCHES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSearchText(s)}
                        className="px-[16px] py-[10px] rounded-full bg-white border border-[rgba(19,20,23,0.1)] text-[16px] text-[#131417] hover:bg-[#f7f8fa] flex items-center gap-[6px]"
                      >
                        <Clock size={14} className="text-[#99a1af]" /> {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Place list */}
              <div className="flex-1 overflow-y-auto pr-[8px] -mr-[8px]">
                <p className="text-[14px] font-semibold text-[#99a1af] mb-[12px] uppercase tracking-wider">
                  {selectedCategory ? CATEGORIES.find(c => c.id === selectedCategory)?.label : activeTab === 'Favorites' ? '즐겨찾기' : '추천 장소'}
                </p>
                <div className="flex flex-col gap-[10px]">
                  {(activeTab === 'Favorites' ? PLACES.filter(p => favIds.has(p.id)) : filtered).map((p) => {
                    const Icon = typeof p.icon === 'function' ? p.icon : MapPin
                    const isFav = favIds.has(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => pickDestination(p)}
                        className="w-full flex items-center gap-[16px] p-[18px] bg-white border border-[rgba(19,20,23,0.06)] rounded-[20px] hover:border-[#2d7cf1] hover:shadow-[0px_4px_16px_rgba(45,124,241,0.08)] transition-all text-left"
                      >
                        <div className="w-[48px] h-[48px] rounded-[14px] bg-[#f7f8fa] flex items-center justify-center shrink-0">
                          <Icon size={22} className="text-[#131417]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[18px] font-semibold text-[#131417] truncate">{p.name}</p>
                          <p className="text-[14px] text-[#99a1af] truncate">{p.addr}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[18px] font-semibold text-[#131417] tabular-nums">{p.eta}<span className="text-[12px] font-normal text-[#99a1af] ml-[2px]">분</span></p>
                          <p className="text-[12px] text-[#99a1af] tabular-nums">{p.km} km</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFav(p.id) }}
                          className="shrink-0 p-[6px] hover:scale-110 transition-transform"
                        >
                          <Star size={20} className={isFav ? 'text-[#FFCC00] fill-[#FFCC00]' : 'text-[#d1d5db]'} />
                        </button>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Map panel (fullscreen only, when not in route view) */}
        <AnimatePresence>
          {isFullscreen && view !== 'route' && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex-1 p-[40px] border-l border-[#131417]/10"
            >
              <div className="w-full h-full rounded-[24px] overflow-hidden relative border border-[rgba(19,20,23,0.08)]">
                <img src={imgMap} alt="Map" className="w-full h-full object-cover" />
                <img src={vectorRoad} alt="" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] opacity-50" />
                <img src={groupPin} alt="" className="absolute top-[30%] left-[45%] w-[48px]" />
                <div className="absolute top-[24px] left-[24px] bg-white/95 backdrop-blur-md rounded-[16px] px-[20px] py-[14px] shadow-[0px_8px_24px_rgba(0,0,0,0.1)] flex items-center gap-[10px]">
                  <MapPin size={18} className="text-[#2d7cf1]" />
                  <span className="text-[16px] font-medium text-[#131417]">현재 위치 · 홍익대학교</span>
                </div>
                <div className="absolute bottom-[24px] right-[24px] w-[120px] h-[120px] rounded-[16px] overflow-hidden border-2 border-white shadow-[0px_8px_24px_rgba(0,0,0,0.12)]">
                  <img src={imgMapSmall} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
