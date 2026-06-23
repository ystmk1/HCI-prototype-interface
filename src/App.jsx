import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Snowflake, Search, Menu, ArrowLeft, Send } from 'lucide-react'

import { ExperimentProvider, useExperiment } from './context/ExperimentContext'
import OperatorConsole from './components/OperatorConsole'
import { getGeminiResponse } from './services/gemini'
import { speakText, stopSpeaking } from './services/tts'

const TTS_KEY = import.meta.env.VITE_GOOGLE_TTS_API_KEY

// === ASSET IMPORTS ===
// Icons
import iconSun from '../assets/icons/Icon-15.svg'       // sun / weather
import iconWifi from '../assets/icons/Icon-14.svg'       // wifi
import iconBattery from '../assets/icons/Icon-12.svg'    // battery
import iconHome from '../assets/icons/Icon-8.svg'        // home
import iconChevronDown from '../assets/icons/Icon-7.svg' // chevron down
import iconChevronUp from '../assets/icons/Icon-4.svg'   // chevron up
import iconAC from '../assets/icons/Icon-6.svg'          // ac / snowflake
import iconSend from '../assets/icons/Icon-3.svg'        // send / navigation
import iconPhone from '../assets/icons/Icon-5.svg'       // phone
import iconMusic from '../assets/icons/Icon-2.svg'       // music
import iconMail from '../assets/icons/Icon-1.svg'        // mail
import iconCalendar from '../assets/icons/Icon.svg'      // calendar
import iconCarAlert from '../assets/icons/car-icon.svg'  // FAB — vehicle alert (Figma 304:1138)

import MusicApp from './components/MusicApp'
import MailApp from './components/MailApp'
import PhoneApp from './components/PhoneApp'
import CalendarApp from './components/CalendarApp'
import NavigationApp from './components/NavigationApp'
import ControlPanel from './components/ControlPanel'

// ── AutopilotStatus pill variants (single design, dot color + text vary) ──
// 각 시퀀스 step의 status 키가 이 표를 lookup해서 pill 색과 텍스트를 결정.
const STATUS_VARIANTS = {
  normal:      { text: '정상 주행 중입니다',       color: '#34c759' }, // green
  errored:     { text: '오류가 감지되었습니다',     color: '#FFCC00' }, // yellow
  progressing: { text: '오류 원인을 파악 중입니다', color: '#2d7cf1' }, // blue
  resolving:   { text: '오류를 해결 중입니다',      color: '#FF9500' }, // orange
}

// ── VLA scenario sequences (출처: sequence.md) ───────────────────
// 시나리오 활성 시 Ctrl+Left/Right 로 step 이동.
// 각 step: { status (pill variant), hero (zoom-in 텍스트), sub (zoom-out 텍스트 or null) }
const SEQUENCES = {
  roundabout: [
    { status: 'normal',      hero: '목적지까지 안전하게 주행 중입니다.', sub: null },                                                    // C1-1
    { status: 'errored',     hero: '회전교차로 진입 간격 확보에 어려움을 겪고 있습니다.',  sub: '안전 간격을 만들면 진입합니다.' },          // C1-2
    { status: 'normal',      hero: '목적지까지 안전하게 주행 중입니다.', sub: null },                                                    // C1-3
    { status: 'errored',     hero: '비정상적인 반복 회전이 감지되었습니다.',           sub: '2차로 진출에 실패해 같은 구간을 다시 주행합니다.' }, // C1-4
    { status: 'progressing', hero: '차선 변경에 필요한 간격 기준이 너무 보수적입니다.', sub: '간격이 확보되면 차선 변경을 시도합니다.' },   // C1-5
    { status: 'resolving',   hero: '2차로 차선 변경을 시도합니다.',                  sub: '잠시 정차 후 진입하겠습니다.' },               // C1-6
    { status: 'normal',      hero: '목적지까지 안전하게 주행 중입니다.', sub: null },                                                    // C1-7
    { status: 'errored',     hero: '진출 지점을 바로 빠져나가지 못해 한 바퀴 더 회전합니다.', sub: '다음 바퀴에 진출합니다.' },             // C1-8
    { status: 'normal',      hero: '목적지까지 안전하게 주행 중입니다.', sub: null },                                                    // C1-9
  ],
  aquaplaning: [
    { status: 'normal',      hero: '목적지까지 안전하게 주행 중입니다.', sub: null },                                                    // C2-1
    { status: 'errored',     hero: '차량이 순간적으로 크게 요동쳤습니다.',     sub: '타이어 접지력이 급격히 떨어져 미끄럼이 발생했습니다.' },// C2-2
    { status: 'progressing', hero: '노면의 물웅덩이를 미리 감지하지 못했습니다.', sub: '이로 인해 수막현상이 발생했습니다.' },             // C2-3
    { status: 'resolving',   hero: '재발 방지를 위해 속도를 낮춰 서행합니다.',   sub: '약 N초 후 정상 마찰 상태로 복귀할 예정입니다.' },    // C2-4
    { status: 'normal',      hero: '목적지까지 안전하게 주행 중입니다.', sub: null },                                                    // C2-5
    { status: 'errored',     hero: '다시 차량이 요동쳤습니다.',                sub: '노면 접지력 저하가 원인입니다.' },                    // C2-6
    { status: 'progressing', hero: '오르막 종단 물웅덩이를 파악하지 못했습니다.',  sub: '수막현상 방지를 위해 보수적으로 주행합니다.' },     // C2-7
    { status: 'resolving',   hero: '지형 경사까지 고려해 더 일찍 감속합니다.',     sub: '도착 예정 시간에는 큰 차이가 없습니다.' },          // C2-8
    { status: 'normal',      hero: '목적지까지 안전하게 주행 중입니다.', sub: null },                                                    // C2-9
    { status: 'errored',     hero: '내리막 구간에서 차량이 크게 흔들렸습니다.',     sub: '노면 접지력을 잃었습니다.' },                     // C2-10
    { status: 'progressing', hero: '센서 시야에 물웅덩이가 파악되지 않았습니다.',   sub: '내리막 가속이 더해져 요동이 커졌습니다.' },        // C2-11
    { status: 'resolving',   hero: '더이상 수막현상이 발생하지 않도록 주행 속도를 낮춥니다.', sub: '규정속도의 40%인 25km/h로 속도를 유지합니다.' }, // C2-12
    { status: 'normal',      hero: '목적지까지 안전하게 주행 중입니다.', sub: null },                                                    // C2-13
  ],
}

function VehicleHMI() {
  const { activeScenario, hmiResetNonce } = useExperiment()
  const [activeApp, setActiveApp] = useState(null)
  const [isMusicFullscreen, setIsMusicFullscreen] = useState(false)
  const [isMailFullscreen, setIsMailFullscreen] = useState(false)
  const [isPhoneFullscreen, setIsPhoneFullscreen] = useState(false)
  const [isCalendarFullscreen, setIsCalendarFullscreen] = useState(false)
  const [isNavigationFullscreen, setIsNavigationFullscreen] = useState(false)
  const [simStage, setSimStage] = useState('idle')
  const [simType, setSimType] = useState('roundabout')
  // VLA 시퀀스 step 인덱스. Shift+Alt+Q/W 로 시나리오 시작 시 0으로 리셋,
  // Ctrl+Left/Right 로 step 이동.
  const [sequenceIndex, setSequenceIndex] = useState(0)
  const [isBriefingOpen, setIsBriefingOpen] = useState(false)
  const [temperature, setTemperature] = useState(20)
  const [isAutoClimate, setIsAutoClimate] = useState(true)
  const [currentSpeed, setCurrentSpeed] = useState(52)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false)
  const [navInitialView, setNavInitialView] = useState(null) // 'search' when opened from greeting

  // ── Keyboard chat (Gemini) ──────────────────────────────────
  // Searchbox doubles as a typing input. Sending fires getGeminiResponse,
  // a chat bubble overlay renders the back-and-forth above the searchbox.
  // No voice / TTS / wake-word — this variant is keyboard-only.
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isAITyping, setIsAITyping] = useState(false)
  const messagesEndRef = useRef(null)
  const chatInputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAITyping])

  const sendChatMessage = async (raw) => {
    const text = raw?.trim()
    if (!text || isAITyping) return
    setMessages((prev) => [...prev, { id: Date.now(), type: 'user', text }])
    setInputText('')
    setIsAITyping(true)
    try {
      const ai = await getGeminiResponse(text)
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, type: 'ai', text: ai || '(빈 응답)' },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, type: 'ai', text: `오류: ${err?.message ?? err}` },
      ])
    } finally {
      setIsAITyping(false)
      requestAnimationFrame(() => chatInputRef.current?.focus())
    }
  }

  const openNavSearch = () => {
    setNavInitialView('search')
    setActiveApp('Navigation')
  }

  // activeRoute is set by NavigationApp after the user confirms a destination.
  // The left widget mirrors it; null means "no destination yet".
  const [activeRoute, setActiveRoute] = useState(null)
  // Tick once a minute so the left widget's remaining-time / arrival values
  // stay current while a route is active.
  const [, setRouteTick] = useState(0)
  useEffect(() => {
    if (!activeRoute) return
    const id = setInterval(() => setRouteTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [activeRoute])

  // (옛 좌측 위젯의 경로 dot 애니메이션용 trafficPattern useMemo는 제거됨 —
  //  새 디자인은 메인 캔버스에 라이브 맵 슬롯이라 위젯 내 SVG 경로 dot이 없음)

  // (Chime/사운드 효과 제거 — 사용자 요구)

  // ── Operator-driven scenario control (via ExperimentContext + BroadcastChannel) ──
  useEffect(() => {
    if (!activeScenario) return
    const id = activeScenario.scenarioId
    if (id === 'frustration_roundabout_loop' && simStage === 'idle') {
      setSimType('roundabout')
      setSequenceIndex(0)
      setSimStage('attempting')
    } else if (id === 'anxiety_hydroplaning' && simStage === 'idle') {
      setSimType('aquaplaning')
      setSequenceIndex(0)
      setSimStage('aquaplaning_active')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScenario?.scenarioId])

  // Operator-triggered HMI reset (BC.RESET_HMI / BC.INITIALIZE_HMI / END_TRIAL)
  useEffect(() => {
    if (hmiResetNonce === 0) return
    setSimStage('idle')
    setIsBriefingOpen(false)
    setActiveApp(null)
    setIsMusicFullscreen(false)
    setIsMailFullscreen(false)
    setIsPhoneFullscreen(false)
    setIsCalendarFullscreen(false)
    setIsNavigationFullscreen(false)
  }, [hmiResetNonce])

  // Keyboard shortcuts (e.code 사용 — Mac Option+letter가 unicode 문자로
  // 바뀌어도 layout-independent 하게 동작):
  //   Alt(Option)+Q              → C1 회전교차로 시퀀스 시작
  //   Alt(Option)+W              → C2 수막현상 시퀀스 시작
  //   Alt(Option)+R              → 상황 초기화 (simStage=idle, sequenceIndex=0)
  //   Ctrl+Alt+Shift+O           → 오퍼레이터 콘솔 새 탭에서 열기
  //   Ctrl+Right                 → 시퀀스 다음 step
  //   Ctrl+Left                  → 시퀀스 이전 step
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Operator console: Ctrl + Alt + Shift + O — modifier-heaviest 조합부터 먼저 매치.
      if (e.ctrlKey && e.altKey && e.shiftKey && e.code === 'KeyO') {
        e.preventDefault()
        window.open('/operator', '_blank', 'noopener,noreferrer')
        return
      }
      // Scenario controls: Alt(Option) + Q/W/R, 다른 modifier 없이.
      if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        if (e.code === 'KeyQ') {
          e.preventDefault()
          setSimType('roundabout')
          setSequenceIndex(0)
          setSimStage('attempting')
          return
        }
        if (e.code === 'KeyW') {
          e.preventDefault()
          setSimType('aquaplaning')
          setSequenceIndex(0)
          setSimStage('aquaplaning_active')
          return
        }
        if (e.code === 'KeyR') {
          e.preventDefault()
          setSimStage('idle')
          setSequenceIndex(0)
          return
        }
      }
      // Sequence step navigation: Ctrl + Left/Right (only while scenario active)
      if (e.ctrlKey && !e.altKey && !e.shiftKey) {
        const seq = SEQUENCES[simType]
        if (!seq || simStage === 'idle') return
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          setSequenceIndex(i => Math.min(seq.length - 1, i + 1))
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setSequenceIndex(i => Math.max(0, i - 1))
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [simType, simStage])

  // Per-sequence voice narration. Each Ctrl+←/→ that changes sequenceIndex,
  // or a Shift+Alt+Q/W that enters a scenario, makes the autopilot speak the
  // matching AutopilotStatus + zoom-in + zoom-out aloud. Voice-only — no chat
  // bubble is created. Going back to idle stops any in-flight utterance.
  useEffect(() => {
    if (simStage === 'idle') {
      stopSpeaking()
      return
    }
    if (!TTS_KEY) {
      console.warn('[tts] VITE_GOOGLE_TTS_API_KEY 미설정 — 시퀀스 음성을 재생할 수 없습니다.')
      return
    }
    const seq = SEQUENCES[simType]
    const step = seq?.[Math.min(sequenceIndex, seq?.length - 1 ?? 0)]
    if (!step) return
    const statusText = STATUS_VARIANTS[step.status]?.text ?? ''
    const utterance = [statusText, step.hero, step.sub].filter(Boolean).join(' ')
    if (!utterance) return
    speakText(utterance, TTS_KEY).catch((err) => console.warn('[tts]', err))
  }, [sequenceIndex, simType, simStage])

  // Dynamic speed fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSpeed(prev => {
        const change = (Math.random() * 4 - 2).toFixed(0);
        const next = prev + parseInt(change);
        if (next > 60) return 60;
        if (next < 30) return 30;
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [])

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // update every minute
    return () => clearInterval(timer);
  }, [])

  // Time formatter
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // (옛 simStage auto-timer / handleApproveDetour / getAlertConfig 모두 제거 —
  //  시나리오 진행은 Shift+Alt+Q/W 로 시작 후 Ctrl+Left/Right 로 수동 navigate.
  //  AutopilotStatus + XAI 텍스트는 SEQUENCES lookup이 직접 담당.)

  return (
    <div className="hmi-viewport">
      <div className="screen">

      {/* 좌측 사이드바(tint) 제거 — 새 디자인은 전체 캔버스 사용 (Figma 304:1100) */}

      {/* ── Top Status Bar ───────────────────────────────────── */}
      <div className="top-bar">
        <div className="top-bar-left">
          <span className="time">{formatTime(currentTime)}</span>
          <div className="weather">
            <img src={iconSun} alt="" />
            <span>24°C</span>
          </div>
        </div>
        <div className="top-bar-right">
          <img src={iconWifi} alt="" />
          <img src={iconBattery} alt="" />
          <span className="battery-text">100%</span>
        </div>
      </div>

      {/* ── Main Canvas — idle / scenario / app-open (Figma 304:1100/1128/1139/310:5694) ──
          activeApp이 켜지면 메인 캔버스가 좌측 1305px 영역으로 축소되고
          AutopilotStatus는 Progressing variant로 전환. 우측에 615×887 앱 패널 등장. */}
      <motion.div
        animate={{
          // 앱 열려도 페이드 안 함 — 좌측에서 reasoning 계속 표시
          opacity: 1,
        }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="absolute inset-0 z-[5] pointer-events-none"
      >
        {/* FAB — 항상 표시. activeApp 시 좌측 1305 영역의 우측으로 가로 이동만.
            top은 122로 고정. 캔버스 shift + 패널 슬라이드인이 동시에 일어나되
            패널은 화면 밖에서 시작해 우측 615 영역으로만 진입 → 겹침 없음. */}
        <motion.button
          animate={{
            left: (activeApp || messages.length > 0 || isAITyping) ? 'calc(40% + 326px - 28px)' : 'calc(80% + 156px - 28px)',
          }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.04 }}
          className="absolute bg-transparent border-0 p-0 cursor-pointer pointer-events-auto"
          style={{ top: 122, width: 187, height: 187, zIndex: 2 }}
          aria-label="차량 경고"
        >
          <img src={iconCarAlert} alt="" className="block w-full h-full pointer-events-none select-none" />
        </motion.button>

        {(() => {
          const isAppOpen = !!activeApp
          // 채팅이 한 번이라도 발생하면 layout이 좌측으로 shift — 앱 열린 것과
          // 동일한 1305 캔버스 + 우측 615 영역에 말풍선 패널 표시.
          const isChatActive = messages.length > 0 || isAITyping
          // 둘 중 하나라도 활성 → 좌측 1305 영역 사용.
          const isShifted = isAppOpen || isChatActive
          const isScenarioActive = simStage !== 'idle'

          // ── Sequence-driven content (sequence.md / SEQUENCES 상수 lookup) ──
          // 시나리오 활성화 → sequenceIndex가 SEQUENCES[simType] 안의 step을 가리킴.
          // idle 상태일 땐 default normal step (C1-1 / C2-1과 동일 내용)을 사용.
          const seq = SEQUENCES[simType]
          const currentStep = (isScenarioActive && seq)
            ? seq[Math.min(sequenceIndex, seq.length - 1)]
            : { status: 'normal', hero: '목적지까지 안전하게 주행 중입니다.', sub: null }

          const status = STATUS_VARIANTS[currentStep.status] ?? STATUS_VARIANTS.normal
          const heroText = currentStep.hero
          const subText = currentStep.sub

          // 앱 열림 OR 채팅 활성 시 메인 캔버스는 좌측 1305px 영역 안에서 중앙 정렬.
          // top은 387로 고정 — 컴포넌트가 가로로만 이동, 세로 위치는 idle 기준 유지.
          const canvasWidth = isShifted ? 1305 : 1920
          const searchboxWidth = isShifted ? 994 : 1573

          return (
            <>
              {/* ── Top color bloom (Figma 311:6517 / 6521 / 6574) ──
                  Figma 사양에 충실한 2-layer 스택:
                  • Layer A — 세로 linear: top:status.color → 60% mid (0.4α) → 0% (투명).
                    opacity 0.55.
                  • Layer B — 가로로 길쭉한 radial (ellipse 672×115 at 50% 25%):
                    status.color(0.8α) → 0% (투명) at 65%. mix-blend-screen, opacity 0.553.
                  • 외부 컨테이너 opacity 0.71. (스택 합성 → 약 0.39α 의 부드러운 글로우)
                  컨테이너는 canvas shift 따라 가로 축소(1342→912) + 중앙 재정렬.
                  Status 색 전환 시 cross-fade. 일렁임은 외부 컨테이너 opacity 호흡. */}
              {/* ── Top color bloom (Figma 311:6517) ──
                  단일 radial gradient 한 장으로 부드러운 elliptical 블롭.
                  Container 자체에 직사각 background 없음 → box edge 발생 X.
                  좌우로 길쭉한 ellipse가 위쪽에 살짝 잠긴 채로 깔려서
                  자연스럽게 아래로 fade. canvas shift 시 가로 축소 + 중앙 재정렬. */}
              <motion.div
                className="absolute pointer-events-none"
                animate={{
                  left: isShifted ? 0 : 0,
                  width: isShifted ? 1305 : 1920,
                  opacity: [0.78, 0.96, 0.84, 0.88],
                  scaleY: [0.97, 1.03, 0.99, 1.0],
                }}
                transition={{
                  left: { duration: 0.36, ease: [0.16, 1, 0.3, 1] },
                  width: { duration: 0.36, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 5.2, repeat: Infinity, ease: 'easeInOut' },
                  scaleY: { duration: 6.6, repeat: Infinity, ease: 'easeInOut' },
                }}
                style={{ top: 79, height: 260, transformOrigin: 'top center' }}
              >
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={status.color}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    className="absolute inset-0"
                    style={{
                      background: `
                        radial-gradient(ellipse 38% 70% at 50% -5%, ${status.color}E6 0%, ${status.color}80 25%, ${status.color}40 45%, ${status.color}1A 65%, ${status.color}00 85%)
                      `,
                    }}
                  />
                </AnimatePresence>
              </motion.div>

            <motion.div
              className="absolute pointer-events-auto"
              animate={{ left: 0, width: canvasWidth }}
              transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              style={{ top: 387, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              {/* AutopilotStatus pill — 통일된 디자인 (Figma 311:7070 / 310:5239).
                  Dot 색은 motion으로 부드럽게 전환, 텍스트는 AnimatePresence 로
                  fade+slide 교체. */}
              <div
                className="flex items-center rounded-full"
                style={{
                  gap: 11,
                  padding: '15px 29px',
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.6)',
                  boxShadow: '0px 4px 14px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                }}
              >
                <motion.span
                  className="rounded-full shrink-0"
                  animate={{
                    backgroundColor: status.color,
                    boxShadow: `0 0 8px ${status.color}80`,
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{ width: 13, height: 13 }}
                />
                <div style={{ position: 'relative', height: 24, overflow: 'hidden' }}>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={status.text}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        display: 'inline-block',
                        fontSize: 24,
                        lineHeight: '24px',
                        letterSpacing: '-0.48px',
                        color: '#131417',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {status.text}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>

              {/* XAI block — pill로부터 15px 간격.
                  Hero / sub 텍스트는 AnimatePresence 로 fade+slide 전환. */}
              <div className="flex flex-col items-center" style={{ marginTop: 15 }}>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={heroText}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      fontSize: 62,
                      lineHeight: 1.28,
                      letterSpacing: '-2.48px',
                      fontWeight: 600,
                      color: '#676767',
                      textAlign: 'center',
                      margin: 0,
                      maxWidth: 1478,
                    }}
                  >
                    {heroText}
                  </motion.p>
                </AnimatePresence>

                {/* Sub 영역 — 항상 reservation 공간(높이 63 + mt 6 = 69)을 유지해
                    null ↔ 텍스트 전환 시 searchbox 점프 방지 */}
                <div style={{ marginTop: 6, height: 63, width: '100%', position: 'relative' }}>
                  <AnimatePresence mode="wait">
                    {subText && (
                      <motion.p
                        key={subText}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                        style={{
                          fontSize: 42,
                          lineHeight: 1.5,
                          letterSpacing: '-1.68px',
                          fontWeight: 400,
                          color: '#a0a0a0',
                          textAlign: 'center',
                          margin: 0,
                          position: 'absolute',
                          inset: 0,
                        }}
                      >
                        {subText}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Searchbox — XAI로부터 25px 간격 (Figma 304:1129). 키패드
                  타이핑으로 Gemini와 대화. 좌측 Send 버튼 + 텍스트 input
                  + (입력 없을 때) 우측 plain Search 글리프. Enter 또는 Send
                  로 전송. 채팅 활성 시 폭 1573 → 994로 축소(좌측 1305 영역).
                  말풍선 히스토리는 우측 615 패널(아래쪽 별도 블록)에 표시. */}
              <motion.form
                onSubmit={(e) => { e.preventDefault(); sendChatMessage(inputText) }}
                className="flex items-center bg-white border border-[#edeef2] rounded-full hover:shadow-[0px_6px_10px_rgba(0,0,0,0.10)] transition-shadow"
                animate={{ width: searchboxWidth }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  marginTop: 25,
                  paddingLeft: 38,
                  paddingRight: 38,
                  paddingTop: 20,
                  paddingBottom: 20,
                  gap: 28,
                  boxShadow: '0px 4px 2px rgba(0,0,0,0.10)',
                }}
              >
                <button
                  type="submit"
                  disabled={!inputText.trim() || isAITyping}
                  className="rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ width: 72, height: 72, background: '#131417', border: 'none', cursor: 'pointer' }}
                  aria-label="보내기"
                >
                  {inputText.trim()
                    ? <Send size={28} color="#ffffff" strokeWidth={2.4} />
                    : <Search size={28} color="#ffffff" strokeWidth={2.4} />}
                </button>
                <input
                  ref={chatInputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="직접 검색하기"
                  disabled={isAITyping}
                  style={{
                    flex: 1,
                    fontSize: 32,
                    lineHeight: 1.6,
                    letterSpacing: '-0.64px',
                    color: '#131417',
                    fontWeight: 400,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
                  }}
                />
              </motion.form>
            </motion.div>
            </>
          )
        })()}
      </motion.div>

      {/* 옛 디자인 잔재 모두 제거:
          - Floating SwipeSlider / hydroplaning 경고 카드 (CTA)
          - 상단 ambient shimmer 그라데이션 + alert pill
          모든 시나리오 reasoning 은 메인 캔버스의 AutopilotStatus pill +
          XAI hero/sub 텍스트로 통합. */}

      {/* ── Chat Side Panel ─────────────────────────────────────────
          검색바에 타이핑 시작하면 활성. 앱 패널과 동일한 615×880 슬롯,
          헤더 + 메시지 리스트 + 자동 스크롤. 앱 패널과 동시에 뜨지는
          않음(앱이 우선). 닫기 버튼은 messages 초기화. */}
      <AnimatePresence>
        {!activeApp && (messages.length > 0 || isAITyping) && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 1, x: 615 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 1, x: 615, transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1] } }}
            className="absolute overflow-hidden z-[10]"
            style={{
              left: 1305,
              top: 79,
              width: 615,
              height: 880,
              borderRadius: 16,
              background: 'var(--bg-primary, #f7f8fa)',
              border: '1px solid rgba(19, 20, 23, 0.2)',
              boxShadow: '0px 6px 24px 0px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="flex flex-col w-full h-full">
              {/* Header */}
              <div
                className="flex items-center bg-white shrink-0"
                style={{
                  height: 100,
                  borderBottom: '1.072px solid rgba(19, 20, 23, 0.08)',
                  paddingLeft: 21,
                  paddingRight: 32,
                  gap: 6,
                }}
              >
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { setMessages([]); setInputText('') }}
                  className="flex items-center justify-center bg-transparent border-0 cursor-pointer"
                  style={{ width: 52, height: 60, borderRadius: 21, padding: 6 }}
                  aria-label="대화 닫기"
                >
                  <ArrowLeft size={32} color="#343434" strokeWidth={2.2} />
                </motion.button>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    lineHeight: '51.418px',
                    letterSpacing: '-1.07px',
                    color: '#343434',
                  }}
                >
                  대화
                </span>
              </div>
              {/* Body — scrollable message list */}
              <div
                className="flex-1 overflow-y-auto"
                style={{
                  padding: '24px 28px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                }}
              >
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28 }}
                    className={`message-row ${msg.type === 'user' ? 'user' : ''}`}
                  >
                    <div className={`message-bubble ${msg.type}`}>{msg.text}</div>
                  </motion.div>
                ))}
                <AnimatePresence>
                  {isAITyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="message-row"
                    >
                      <div className="message-bubble ai" style={{ padding: '20px 32px' }}>
                        <div className="typing-dots">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── App Side Panel (Figma 310:5694) ────────────────────────
          앱이 켜졌을 때 우측 615×887 패널이 슬라이드 인. 헤더에 백 버튼 +
          앱 이름. 본문은 기존 앱 컴포넌트가 들어가는 자리 — 단, 기존 앱
          컴포넌트는 fullscreen 사이징(1410+)을 가정하고 있어 패널에 그대로
          넣으면 overflow됨. 다음 이터레이션에서 각 앱을 패널 사이즈에 맞게
          리팩토링 필요. 일단은 헤더만 보여주고 본문 자리에 placeholder. */}
      <AnimatePresence>
        {activeApp && (
          <motion.div
            key={`app-panel-${activeApp}`}
            // 패널 너비 615px만큼 우측 화면 밖에서 시작 (left:1305 + x:615 = 1920, 화면 오른쪽 경계).
            // 캔버스/searchbox/FAB와 동일한 duration·easing 으로 동시 진행하되,
            // 패널은 우측 외부 → 1305 영역으로만 진입하므로 캔버스 우측 빈 영역 안에서만
            // 이동 → 좌측 컴포넌트와 시각적 겹침 0.
            initial={{ opacity: 1, x: 615 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 1, x: 615, transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1] } }}
            className="absolute overflow-hidden z-[10]"
            style={{
              left: 1305,
              top: 79,
              width: 615,
              // Figma 311:7072 — top 79 + bottom 121 → height 880 (이전 887은 GNB와 7px 겹쳐 둥근 모서리 잘렸음)
              height: 880,
              borderRadius: 16,
              background: 'var(--bg-primary, #f7f8fa)',
              border: '1px solid rgba(19, 20, 23, 0.2)',
              boxShadow: '0px 6px 24px 0px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="flex flex-col w-full h-full">
              {/* Header — Figma 310:5698: bg-white, h-100, border-bottom */}
              <div
                className="flex items-center bg-white shrink-0"
                style={{
                  height: 100,
                  borderBottom: '1.072px solid rgba(19, 20, 23, 0.08)',
                  paddingLeft: 21,
                  paddingRight: 32,
                  gap: 6,
                }}
              >
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    setActiveApp(null)
                    setIsMusicFullscreen(false)
                    setIsMailFullscreen(false)
                    setIsPhoneFullscreen(false)
                    setIsCalendarFullscreen(false)
                    setIsNavigationFullscreen(false)
                    setNavInitialView(null)
                  }}
                  className="flex items-center justify-center bg-transparent border-0 cursor-pointer"
                  style={{ width: 52, height: 60, borderRadius: 21, padding: 6 }}
                  aria-label="뒤로"
                >
                  <ArrowLeft size={32} color="#343434" strokeWidth={2.2} />
                </motion.button>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    lineHeight: '51.418px',
                    letterSpacing: '-1.07px',
                    color: '#343434',
                  }}
                >
                  {activeApp === 'Navigation' ? '현재경로'
                    : activeApp === 'Phone'    ? '전화'
                    : activeApp === 'Music'    ? '음악'
                    : activeApp === 'Mail'     ? '메일'
                    : activeApp === 'Calendar' ? '캘린더'
                    : activeApp}
                </span>
              </div>

              {/* Body — placeholder. 기존 앱 컴포넌트들은 615px 패널에 맞지
                  않아서 다음 이터레이션에서 panel-mode prop 도입 후 렌더링 */}
              <div
                className="flex-1 flex items-center justify-center"
                style={{ background: 'var(--bg-primary, #f7f8fa)' }}
              >
                <span style={{ fontSize: 18, color: '#a0a0a0', letterSpacing: '-0.36px' }}>
                  앱 본문 (615px 패널용 리팩토링 필요)
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* ── Bottom App Bar ────────────────────────────────────── */}
      {/* Bottom GNB — Figma node 286:2728.
          Left: HVAC (home, temp ↓, 20.0 AUTO, temp ↑). 풍량 제거.
          Right: 5 app icons + menu (모두 73px 원형, 메뉴는 회색 배경으로 시스템 구분).
          중앙 ETA/거리는 의도적으로 미반영 (음성 버전 전용 패널). */}
      <div className="bottom-bar">
        <div className="bottom-left">
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="btn-home"
            onClick={() => {
              setActiveApp(null)
              setIsMusicFullscreen(false)
              setIsMailFullscreen(false)
              setIsPhoneFullscreen(false)
              setIsCalendarFullscreen(false)
              setIsNavigationFullscreen(false)
              setIsBriefingOpen(false)
            }}
          >
            <img src={iconHome} alt="Home" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            className="btn-chevron"
            onClick={() => { setTemperature(v => Math.max(17, v - 1)); setIsAutoClimate(false) }}
          >
            <img src={iconChevronDown} alt="Temp down" />
          </motion.button>

          <div className="climate-display">
            <span className={`climate-temp ${!isAutoClimate ? (temperature <= 22 ? 'cool' : 'heat') : ''}`}>
              {temperature}.0
            </span>
            <button
              className="climate-mode"
              onClick={() => setIsAutoClimate(true)}
            >
              {isAutoClimate ? (
                <img src={iconAC} alt="" />
              ) : temperature <= 22 ? (
                <Snowflake size={18} color="#4A90D9" />
              ) : (
                <Flame size={18} color="#E85D5D" />
              )}
              <span className={!isAutoClimate ? (temperature <= 22 ? 'cool' : 'heat') : ''}>
                {isAutoClimate ? 'AUTO' : temperature <= 22 ? 'COOL' : 'HEAT'}
              </span>
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            className="btn-chevron"
            onClick={() => { setTemperature(v => Math.min(29, v + 1)); setIsAutoClimate(false) }}
          >
            <img src={iconChevronUp} alt="Temp up" />
          </motion.button>
        </div>

        {/* Center: ETA + 현재 속도 (Figma 304:1621) — 도착 예정/현재 속도 두 그룹 */}
        <div className="gnb-center">
          {(() => {
            // 활성 경로가 있으면 잔여 분, 없으면 placeholder
            let etaMin = 10
            if (activeRoute) {
              const arr = new Date(activeRoute.baseArrivalIso).getTime()
              etaMin = Math.max(0, Math.round((arr - Date.now()) / 60_000))
            }
            return (
              <>
                <div className="gnb-stat">
                  <span className="gnb-stat-label">도착 예정</span>
                  <span className="gnb-stat-value">
                    <span className="num">{etaMin}</span>
                    <span className="unit">분 뒤</span>
                  </span>
                </div>
                <div className="gnb-stat">
                  <span className="gnb-stat-label">현재 속도</span>
                  <span className="gnb-stat-value">
                    <span className="num">{currentSpeed}</span>
                    <span className="unit">km/h</span>
                  </span>
                </div>
              </>
            )
          })()}
        </div>

        {/* Right: 5 app icons + system menu (Figma 'App' container 522×73) */}
        <div className="bottom-right">
          {[
            { id: 'Navigation', icon: iconSend },
            { id: 'Phone',      icon: iconPhone },
            { id: 'Music',      icon: iconMusic },
            { id: 'Mail',       icon: iconMail },
            { id: 'Calendar',   icon: iconCalendar },
          ].map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveApp(prev => prev === item.id ? null : item.id)}
              className={`app-icon-btn ${activeApp === item.id ? 'active' : ''}`}
            >
              <img src={item.icon} alt={item.id} />
            </motion.button>
          ))}
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="btn-menu-system"
            aria-label="시스템 메뉴"
            onClick={() => setIsControlPanelOpen(v => !v)}
          >
            <Menu size={28} color="#ffffff" strokeWidth={2.4} />
          </motion.button>
        </div>
      </div>

      {/* ── Control Panel Drawer (vehicle controls + media wireframes) ── */}
      <AnimatePresence>
        {isControlPanelOpen && (
          <ControlPanel onClose={() => setIsControlPanelOpen(false)} />
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}

// ── App shell: router + experiment provider ───────────────────
// /              → participant-facing vehicle HMI
// /operator      → researcher operator console (drives scenarios, logs sessions)
// /operator opens cleanly in a separate window/tab; both windows sync via
// BroadcastChannel inside ExperimentContext.
function App() {
  return (
    <BrowserRouter>
      <ExperimentProvider>
        <Routes>
          <Route path="/" element={<VehicleHMI />} />
          <Route path="/hmi" element={<VehicleHMI />} />
          <Route path="/operator" element={<OperatorConsole />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ExperimentProvider>
    </BrowserRouter>
  )
}

export default App
