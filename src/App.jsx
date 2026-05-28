import { useState, useEffect, useRef, useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Snowflake, Wind, Volume, Volume1, Volume2, VolumeX, Search } from 'lucide-react'

import { ExperimentProvider, useExperiment } from './context/ExperimentContext'
import OperatorConsole from './components/OperatorConsole'
import { buildRouteSvg, formatClockTime } from './utils/kakaoNav'

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
import iconMenu from '../assets/icons/Icon-13.svg'       // hamburger menu

// Images
import imgMap from '../assets/images/image 21.png'        // road/ADAS view (camera widget)

import MusicApp from './components/MusicApp'
import SwipeSlider from './components/SwipeSlider'
import MailApp from './components/MailApp'
import PhoneApp from './components/PhoneApp'
import CalendarApp from './components/CalendarApp'
import NavigationApp from './components/NavigationApp'
import ControlPanel from './components/ControlPanel'

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
  const [isBriefingOpen, setIsBriefingOpen] = useState(false)
  const [temperature, setTemperature] = useState(20)
  const [isAutoClimate, setIsAutoClimate] = useState(true)
  const [currentSpeed, setCurrentSpeed] = useState(52)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [fanSpeed, setFanSpeed] = useState(3)
  const [volume, setVolume] = useState(0.6)
  const [muted, setMuted] = useState(false)
  const [volumeOpen, setVolumeOpen] = useState(false)
  const volumeCloseTimer = useRef(null)
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false)
  const [navInitialView, setNavInitialView] = useState(null) // 'search' when opened from greeting

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

  // Traffic-congestion pattern for the moving route dot — animateMotion's
  // keyTimes/keyPoints make the dot accelerate, slow, and almost-stop in
  // different segments, so it reads as real-world stop-and-go. Recomputed
  // once per route (keyed on departureIso) so the same trip keeps a
  // consistent rhythm even as the parent re-renders. Must sit AFTER the
  // activeRoute declaration above — useMemo runs synchronously during
  // render, so referencing activeRoute before its `let` binding triggers TDZ.
  const trafficPattern = useMemo(() => {
    if (!activeRoute) return null
    const N = 14
    const speeds = []
    for (let i = 0; i < N; i++) {
      const r = Math.random()
      if (r < 0.22) speeds.push(0.08 + Math.random() * 0.15)        // jam / near-stop
      else if (r < 0.45) speeds.push(1.3 + Math.random() * 0.8)     // burst (clear road)
      else speeds.push(0.5 + Math.random() * 0.5)                   // cruise
    }
    const total = speeds.reduce((a, b) => a + b, 0)
    let p = 0
    const times = ['0']
    const points = ['0']
    for (let i = 0; i < N; i++) {
      p += speeds[i] / total
      times.push(((i + 1) / N).toFixed(3))
      points.push(Math.min(1, p).toFixed(3))
    }
    return { keyTimes: times.join(';'), keyPoints: points.join(';') }
  }, [activeRoute?.departureIso])

  const openVolume = () => {
    setVolumeOpen(true)
    if (volumeCloseTimer.current) clearTimeout(volumeCloseTimer.current)
    volumeCloseTimer.current = setTimeout(() => setVolumeOpen(false), 3000)
  }

  const renderVolumeIcon = () => {
    if (muted || volume === 0) return <VolumeX size={26} />
    if (volume < 0.34) return <Volume size={26} />
    if (volume < 0.67) return <Volume1 size={26} />
    return <Volume2 size={26} />
  }

  // Airplane seatbelt chime sound
  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const playTone = (freq, startTime) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 1);
      };
      playTone(1046.50, ctx.currentTime); // C6
      playTone(1318.51, ctx.currentTime + 0.15); // E6
    } catch(e) {
      console.warn('Audio play failed', e);
    }
  }

  // ── Operator-driven scenario control (via ExperimentContext + BroadcastChannel) ──
  // When operator picks a scenario from /operator (Alt+Q / Alt+W), it sets
  // activeScenario here. We mirror that to the local simStage so the existing
  // animations fire just like Ctrl+1 / Ctrl+2 would.
  useEffect(() => {
    if (!activeScenario) return
    const id = activeScenario.scenarioId
    if (id === 'frustration_roundabout_loop' && simStage === 'idle') {
      setSimType('roundabout')
      playChime()
      setSimStage('attempting')
    } else if (id === 'anxiety_hydroplaning' && simStage === 'idle') {
      setSimType('aquaplaning')
      playChime()
      setIsBriefingOpen(true)
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

  // Keyboard shortcuts: Alt+Q (roundabout) / Alt+W (hydroplaning)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'q') {
        e.preventDefault()
        setSimType('roundabout')
        setSimStage(prev => {
          if (prev === 'idle') {
            playChime()
            return 'attempting'
          }
          return 'idle'
        })
      } else if (k === 'w') {
        e.preventDefault()
        setSimType('aquaplaning')
        setSimStage(prev => {
          if (prev === 'idle') {
            playChime()
            setIsBriefingOpen(true)
            return 'aquaplaning_active'
          }
          return 'idle'
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  // Simulation orchestrator
  useEffect(() => {
    let timer;
    if (simStage === 'attempting') {
      timer = setTimeout(() => setSimStage('searching'), 4000)
    } else if (simStage === 'searching') {
      timer = setTimeout(() => {
        setSimStage('prompting')
        setIsBriefingOpen(true)
      }, 3000)
    } else if (simStage === 'prompting') {
      timer = setTimeout(() => {
        handleApproveDetour()
      }, 3000)
    } else if (simStage === 'approved') {
      timer = setTimeout(() => setSimStage('idle'), 4000)
    } else if (simStage === 'waiting') {
      timer = setTimeout(() => setSimStage('success'), 3000)
    } else if (simStage === 'success') {
      timer = setTimeout(() => setSimStage('returning'), 2000)
    } else if (simStage === 'returning') {
      timer = setTimeout(() => setSimStage('idle'), 2500)
    } else if (simStage === 'aquaplaning_active') {
      timer = setTimeout(() => {
        setSimStage('aquaplaning_holding')
        setIsBriefingOpen(false)
      }, 3000)
    } else if (simStage === 'aquaplaning_holding') {
      timer = setTimeout(() => {
        setSimStage('aquaplaning_recovering')
      }, 2000)
    } else if (simStage === 'aquaplaning_recovering') {
      timer = setTimeout(() => setSimStage('idle'), 2500)
    }
    return () => clearTimeout(timer)
  }, [simStage])

  const handleApproveDetour = () => {
    setSimStage('approved')
    setIsBriefingOpen(false)
  }

  const getAlertConfig = () => {
    switch (simStage) {
      case 'searching':
        return {
          text: '합류 공간 찾는 중...',
          dotAnimate: { opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] },
          dotColor: '#007AFF',
          dotTransition: { repeat: Infinity, duration: 1.2, ease: [0.4, 0, 0.2, 1] }
        }
      case 'prompting':
        return {
          text: '합류 승인 대기',
          dotAnimate: { scale: [1, 1.3, 1] },
          dotColor: '#FFCC00',
          dotTransition: { repeat: Infinity, duration: 0.8 }
        }
      case 'approved':
        return {
          text: '합류 시작',
          dotAnimate: { opacity: 1, scale: 1 },
          dotColor: '#34C759',
          dotTransition: { duration: 0.3 }
        }
      case 'waiting':
        return {
          text: '대기 중...',
          dotAnimate: { opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] },
          dotColor: '#FF9500',
          dotTransition: { repeat: Infinity, duration: 1.2, ease: [0.4, 0, 0.2, 1] }
        }
      case 'success':
        return {
          text: '합류 완료',
          dotAnimate: { opacity: 1, scale: 1 },
          dotColor: '#34C759',
          dotTransition: { duration: 0.3, type: "spring", stiffness: 300 }
        }
      case 'returning':
        return {
          text: '정상 주행으로 복귀',
          dotAnimate: { opacity: 1, scale: 1 },
          dotColor: '#34C759',
          dotTransition: { duration: 0.3, type: "spring", stiffness: 300 }
        }
      case 'aquaplaning_active':
        return {
          text: '안전한 속도로 감속 중...',
          dotAnimate: { opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] },
          dotColor: '#007AFF',
          dotTransition: { repeat: Infinity, duration: 1.2, ease: [0.4, 0, 0.2, 1] }
        }
      case 'aquaplaning_holding':
        return {
          text: '감속 유지 중...',
          dotAnimate: { opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] },
          dotColor: '#007AFF',
          dotTransition: { repeat: Infinity, duration: 1.2, ease: [0.4, 0, 0.2, 1] }
        }
      case 'aquaplaning_recovering':
        return {
          text: '정상 속도로 가속',
          dotAnimate: { opacity: 1, scale: 1 },
          dotColor: '#34C759',
          dotTransition: { duration: 0.3, type: "spring", stiffness: 300 }
        }
      default:
        return null
    }
  }

  const alertConfig = getAlertConfig()

  return (
    <div className="hmi-viewport">
      <div className="screen">

      <div className="absolute left-0 top-0 w-[480px] h-full bg-[rgba(247,248,250,0.3)]"
           style={{ boxShadow: '0px 6px 24px 0px rgba(0,0,0,0.09)' }} />

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

      <motion.div
        animate={{
          opacity: (activeApp === 'Music' && isMusicFullscreen) ? 0 : 1,
          x: (activeApp === 'Music' && isMusicFullscreen) ? -100 : 0,
        }}
        style={{
          pointerEvents: (activeApp === 'Music' && isMusicFullscreen) ? 'none' : 'auto',
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="absolute inset-0 z-20 pointer-events-none"
      >
        {/* Left widget column — cards stack from top with consistent gap so the
            layout breathes naturally whether the destination card is in the
            short greeting state or the taller route state. */}
        <motion.div
          layout
          className="absolute left-[31px] top-[122px] w-[408px] flex flex-col gap-[20px] pointer-events-none"
        >
        {/* Top Destination Widget — Figma node 244:23491 */}
        <motion.div layout className="pointer-events-auto bg-gradient-to-r from-white to-[#edeef2] border border-[rgba(19,20,23,0.1)] drop-shadow-[0px_6px_12px_rgba(0,0,0,0.08)] flex flex-col gap-[12px] items-center p-[32px] rounded-[32px] w-full">
          {(() => {
            const hasRoute = !!activeRoute
            const destName = hasRoute ? activeRoute.destination.name : '어디로 갈까요?'
            const labelText = hasRoute ? '목적지' : '반갑습니다'
            const arrivalText = hasRoute ? formatClockTime(new Date(activeRoute.baseArrivalIso)) : '10:12 PM'
            const timeParts = arrivalText.split(' ')
            const timeOnly = timeParts[0] || '10:12'
            const ampm = timeParts[1] || 'PM'

            return (
              <>
                {/* Top text block — Figma: font-Medium, items-start, leading-1.4 */}
                <div className="flex items-center leading-[1.4] w-[294px] gap-[12px]">
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="font-medium text-[#99a1af] text-[22px]">
                      {labelText}
                    </p>
                    <p className="font-medium text-[#131417] text-[26px] tracking-[-1px] truncate">
                      {destName}
                    </p>
                  </div>
                  {!hasRoute && (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      whileHover={{ y: -1 }}
                      onClick={openNavSearch}
                      aria-label="경로 검색"
                      className="shrink-0 w-[56px] h-[56px] rounded-full bg-[#f7f8fa] border border-[rgba(19,20,23,0.2)] flex items-center justify-center drop-shadow-[0px_6px_12px_rgba(0,0,0,0.08)]"
                    >
                      <Search size={22} color="#131417" strokeWidth={2} />
                    </motion.button>
                  )}
                </div>

                {/* Route + ETA — Figma uses absolute positioning inside w-294 h-64 */}
                {hasRoute && (() => {
                  const svgPath = buildRouteSvg(activeRoute.geometry, 106, 66, 8)
                  const pathId = `route-path-${activeRoute.departureIso}`
                  const glowId = `route-glow-${activeRoute.departureIso}`
                  // Negative begin offsets the SVG animation to the current
                  // elapsed time so the dot appears already in progress.
                  const now = Date.now()
                  const startMs = new Date(activeRoute.departureIso).getTime()
                  const elapsedSec = Math.max(0, (now - startMs) / 1000)
                  // Slow the whole traversal down so the stop-and-go rhythm is
                  // visible at the widget scale (durationSec can be hours).
                  const dotDur = Math.max(45, Math.min(activeRoute.durationSec, 240))
                  return (
                    <div className="relative h-[64px] w-[294px]">
                      {/* Route SVG at left-13.5 top-0 (h-66 overflows container slightly) */}
                      <div className="absolute h-[66px] left-[13.5px] top-0 w-[106px]">
                        <svg width="100%" height="100%" viewBox="0 0 106 66" preserveAspectRatio="xMidYMid meet" overflow="visible">
                          <defs>
                            <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
                              <stop offset="0%"  stopColor="#7fb3ff" stopOpacity="1" />
                              <stop offset="55%" stopColor="#2d7cf1" stopOpacity="0.55" />
                              <stop offset="100%" stopColor="#2d7cf1" stopOpacity="0" />
                            </radialGradient>
                          </defs>
                          {/* Path */}
                          <path id={pathId} d={svgPath.d} stroke="#2d7cf1" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
                          {/* Origin marker — solid blue dot (matches route color) */}
                          <circle cx={svgPath.start[0]} cy={svgPath.start[1]} r={3.2} fill="#2d7cf1" />
                          {/* Destination marker — solid red dot */}
                          <circle cx={svgPath.end[0]} cy={svgPath.end[1]} r={3.6} fill="#e85d5d" />
                          {/* Moving progress dot — variable speed (keyTimes/keyPoints
                              simulate stop-and-go), glow + pulse for "일렁일렁" */}
                          <g>
                            <animateMotion
                              dur={`${dotDur}s`}
                              begin={`-${elapsedSec}s`}
                              fill="freeze"
                              repeatCount="1"
                              calcMode="linear"
                              keyTimes={trafficPattern?.keyTimes}
                              keyPoints={trafficPattern?.keyPoints}
                            >
                              <mpath href={`#${pathId}`} />
                            </animateMotion>
                            {/* Outer halo — gradient glow, larger pulse */}
                            <circle r={8} fill={`url(#${glowId})`}>
                              <animate attributeName="r"       values="7;10.5;7"   dur="1.7s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
                              <animate attributeName="opacity" values="0.55;0.9;0.55" dur="1.7s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
                            </circle>
                            {/* Inner core — solid, smaller pulse */}
                            <circle r={3.4} fill="#2d7cf1">
                              <animate attributeName="r" values="3;3.8;3" dur="1.7s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
                            </circle>
                          </g>
                        </svg>
                      </div>
                      {/* ETA group at left-166 — ~170% line-height between
                          label and value for comfortable typographic rhythm. */}
                      <div className="absolute left-[166px] top-0">
                        <p className="font-normal leading-[1.7] text-[#99a1af] text-[20px]">
                          도착예정
                        </p>
                        <div className="flex items-baseline gap-[4px] whitespace-nowrap leading-[1.05]">
                          <span className="font-semibold text-[32px] tracking-[-0.64px] text-[#131417]">{timeOnly}</span>
                          <span className="font-normal text-[20px] tracking-[-0.4px] text-[#99a1af]">{ampm}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </>
            )
          })()}
        </motion.div>

        {/* Bottom Speed & ADAS Widget — sits below the destination card with a
            consistent 20px gap (managed by the parent flex column). */}
        <motion.div layout className="pointer-events-auto bg-gradient-to-r from-white to-[#edeef2] border border-[rgba(19,20,23,0.1)] drop-shadow-[0px_6px_12px_rgba(0,0,0,0.08)] flex flex-col gap-[24px] items-start p-[32px] rounded-[32px] w-full">
          <div className="flex items-baseline shrink-0">
            <span className="font-medium leading-[1.1] text-[#131417] text-[66px] tracking-[-1.6px]">{currentSpeed}</span>
            <span className="font-normal leading-[37px] ml-[8px] text-[#99a1af] text-[22px]">km/h</span>
          </div>
          <div className="flex flex-col gap-[20px] items-start relative shrink-0 w-full">
            <div className="h-[200px] opacity-80 relative shrink-0 w-full overflow-hidden rounded-[16px]">
              <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgMap} />
            </div>

            <AnimatePresence mode="wait">
              {simType === 'roundabout' && simStage !== 'idle' && (
                <motion.div
                  key="slider"
                  initial={{ opacity: 0, y: 12, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 63 }}
                  exit={{ opacity: 0, y: 12, height: 0 }}
                  transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full shrink-0"
                >
                  <SwipeSlider onApprove={handleApproveDetour} />
                </motion.div>
              )}
              {simType === 'aquaplaning' && simStage !== 'idle' && (
                <motion.div
                  key="aquaplaning"
                  initial={{ opacity: 0, y: 12, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: 12, height: 0 }}
                  transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full shrink-0 overflow-hidden"
                >
                  <div className="bg-white border border-[rgba(19,20,23,0.05)] drop-shadow-[0px_12px_6px_rgba(0,0,0,0.11)] flex flex-col gap-[18px] items-start p-[24px] relative rounded-[20px] shrink-0 w-full">
                    <div className="flex flex-col gap-[6px] items-start whitespace-nowrap">
                      <div className="text-[#131417] tracking-[-0.52px]">
                        <p className="font-normal leading-[1.3] mb-0 text-[24px]">안전 확보를 위해</p>
                        <p className="text-[24px] leading-[1.3]">
                          <span className="font-bold tracking-[-0.48px]">80km/h</span>
                          <span className="font-normal">로 감속</span>
                        </p>
                      </div>
                      <p className="font-medium text-[#99a1af] text-[16px] tracking-[-0.32px] leading-[1.4]">
                        <span>약 </span>
                        <span className="text-[#2d7cf1]">3초간 감속</span>
                        <span>을 유지합니다.</span>
                      </p>
                    </div>
                    <div className="relative w-full h-[8px] bg-[#f0f0f0] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: '100%' }}
                        animate={{ width: '0%' }}
                        transition={{ delay: 0.95, duration: 3, ease: 'linear' }}
                        className="absolute top-0 left-0 h-full bg-[#2d7cf1] rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Top-edge ambient shimmer — flat bell, centered on screen.
          Width ~600px (~31% of 1920), height 96px so the bell sits
          flat against the top instead of reading as a hemisphere.
          All wave layers are symmetric around horizontal center so
          the glow doesn't bias to one side. Alert text uses its own
          backdrop-blurred pill for guaranteed legibility against any
          stage color. */}
      <AnimatePresence>
        {alertConfig && (
          <motion.div
            key="top-shimmer"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute top-0 inset-x-0 mx-auto w-[600px] h-[96px] z-[60] pointer-events-none"
          >
            {/* Shimmer surface — bell-curve mask: tall at center, fast falloff */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                maskImage:       'radial-gradient(ellipse 50% 100% at 50% 0%, #000 0%, #000 20%, rgba(0,0,0,0.55) 55%, transparent 95%)',
                WebkitMaskImage: 'radial-gradient(ellipse 50% 100% at 50% 0%, #000 0%, #000 20%, rgba(0,0,0,0.55) 55%, transparent 95%)',
              }}
            >
              {/* Base color veil — strongest at the top, fades downward */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, ${alertConfig.dotColor} 0%, ${alertConfig.dotColor}66 60%, ${alertConfig.dotColor}00 100%)`,
                  opacity: 0.55,
                }}
              />
              {/* Wave 1 — centered radial blob, gentle horizontal sway */}
              <motion.div
                className="absolute -inset-x-[10%] -top-[40%] h-[200%]"
                style={{
                  background: `radial-gradient(ellipse 35% 60% at 50% 25%, ${alertConfig.dotColor}cc 0%, transparent 65%)`,
                  mixBlendMode: 'screen',
                }}
                animate={{ x: ['-4%', '4%', '-4%'], opacity: [0.55, 0.85, 0.55] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Wave 2 — slightly smaller, counter-phase, also centered */}
              <motion.div
                className="absolute -inset-x-[10%] -top-[30%] h-[180%]"
                style={{
                  background: `radial-gradient(ellipse 28% 55% at 50% 30%, ${alertConfig.dotColor}aa 0%, transparent 60%)`,
                  mixBlendMode: 'screen',
                }}
                animate={{ x: ['3%', '-3%', '3%'], opacity: [0.4, 0.75, 0.4] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
              />
            </div>

            {/* Alert text — backdrop-blurred pill keeps the copy readable
                regardless of stage color, sits in the bright center band. */}
            <div className="absolute top-[18px] inset-x-0 mx-auto w-fit flex items-center gap-[10px] bg-white/85 backdrop-blur-md px-[18px] py-[8px] rounded-full border border-white/60 shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
              <motion.div
                animate={alertConfig.dotAnimate}
                transition={alertConfig.dotTransition}
                className="w-[10px] h-[10px] rounded-full"
                style={{ backgroundColor: alertConfig.dotColor }}
              />
              <span className="text-[16px] font-semibold tracking-[-0.3px] text-[#131417] whitespace-nowrap">
                {alertConfig.text}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeApp === 'Music' && (
          <MusicApp 
            isFullscreen={isMusicFullscreen} 
            setIsFullscreen={setIsMusicFullscreen}
            isBriefingOpen={isBriefingOpen}
            onClose={() => {
              setActiveApp(null)
              setIsMusicFullscreen(false)
            }} 
          />
        )}
        {activeApp === 'Mail' && (
          <MailApp 
            isFullscreen={isMailFullscreen} 
            setIsFullscreen={setIsMailFullscreen}
            isBriefingOpen={isBriefingOpen}
            onClose={() => {
              setActiveApp(null)
              setIsMailFullscreen(false)
            }} 
          />
        )}
        {activeApp === 'Phone' && (
          <PhoneApp 
            isFullscreen={isPhoneFullscreen} 
            setIsFullscreen={setIsPhoneFullscreen}
            isBriefingOpen={isBriefingOpen}
            onClose={() => {
              setActiveApp(null)
              setIsPhoneFullscreen(false)
            }} 
          />
        )}
        {activeApp === 'Calendar' && (
          <CalendarApp
            isFullscreen={isCalendarFullscreen}
            setIsFullscreen={setIsCalendarFullscreen}
            isBriefingOpen={isBriefingOpen}
            onClose={() => {
              setActiveApp(null)
              setIsCalendarFullscreen(false)
            }}
          />
        )}
        {activeApp === 'Navigation' && (
          <NavigationApp
            isFullscreen={isNavigationFullscreen}
            setIsFullscreen={setIsNavigationFullscreen}
            isBriefingOpen={isBriefingOpen}
            activeRoute={activeRoute}
            setActiveRoute={setActiveRoute}
            initialView={navInitialView}
            onClose={() => {
              setActiveApp(null)
              setIsNavigationFullscreen(false)
              setNavInitialView(null)
            }}
          />
        )}
      </AnimatePresence>



      {/* ── Bottom App Bar ────────────────────────────────────── */}
      <div className="bottom-bar">
        {/* Left: Home, Climate, Fan */}
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

          {/* Fan speed indicator */}
          <button
            className="fan-display"
            title={`바람 세기 ${fanSpeed}/5`}
            onClick={() => setFanSpeed(prev => (prev % 5) + 1)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <Wind size={22} color={fanSpeed >= 4 ? '#4A90D9' : 'var(--text-secondary)'} />
            <div className="fan-dots">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="fan-dot"
                  style={{ background: i <= fanSpeed ? '#4A90D9' : 'rgba(140,144,168,0.28)' }}
                />
              ))}
            </div>
          </button>
        </div>

        {/* Center: App Icons (5 apps) */}
        <div className="bottom-center">
          {[
            { id: 'Navigation', icon: iconSend },
            { id: 'Phone', icon: iconPhone },
            { id: 'Music', icon: iconMusic },
            { id: 'Mail', icon: iconMail },
            { id: 'Calendar', icon: iconCalendar },
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
        </div>

        {/* Right: Volume, Menu */}
        <div className="bottom-right">
          <div className="volume-control" title={`볼륨 ${Math.round((muted ? 0 : volume) * 100)}%`}>
            <motion.div
              initial={false}
              animate={{ width: volumeOpen ? 160 : 0, opacity: volumeOpen ? 1 : 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div
                className="volume-bar"
                role="slider"
                aria-label="시스템 볼륨"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((muted ? 0 : volume) * 100)}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
                  setVolume(ratio)
                  if (muted && ratio > 0) setMuted(false)
                  openVolume()
                }}
              >
                <div
                  className="volume-fill"
                  style={{ width: `${(muted ? 0 : volume) * 100}%` }}
                />
              </div>
            </motion.div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="volume-icon-btn"
              onClick={() => {
                if (!volumeOpen) { openVolume(); return }
                setMuted(m => !m)
                openVolume()
              }}
              aria-label={volumeOpen ? (muted ? '음소거 해제' : '음소거') : '음량 조절'}
            >
              {renderVolumeIcon()}
            </motion.button>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="btn-menu"
            onClick={() => setIsControlPanelOpen(v => !v)}
          >
            <img src={iconMenu} alt="Menu" />
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
