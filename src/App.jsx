import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Snowflake, Wind, Volume, Volume1, Volume2, VolumeX } from 'lucide-react'

import { ExperimentProvider, useExperiment } from './context/ExperimentContext'
import OperatorConsole from './components/OperatorConsole'

// === ASSET IMPORTS ===
// Icons
import iconSun from '../assets/icons/Icon-15.svg'       // sun / weather
import iconWifi from '../assets/icons/Icon-14.svg'       // wifi
import iconBattery from '../assets/icons/Icon-12.svg'    // battery
import iconNav from '../assets/icons/Icon-11.svg'        // nav arrow (blue, destination)
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

// Map vectors
import vectorRoute from '../assets/icons/Vector 1.svg'   // route line
import vectorCursor from '../assets/icons/Vector.svg'     // blue nav cursor
import vectorDotRed from '../assets/icons/Vector-1.svg'   // red dot
import vectorDotGreen from '../assets/icons/Vector-2.svg' // green dot
import vectorRoad from '../assets/icons/Vector-3.svg'     // road curve

// Map pin
import groupPin from '../assets/icons/Group 49.svg'       // map pin

// Images
import imgMap from '../assets/images/image 21.png'        // road/ADAS view (camera widget)
import imgCar from '../assets/images/image 26.png'        // car side view
import imgMapSmall from '../assets/images/image 21-2.png' // mini map for camera

import MusicApp from './components/MusicApp'
import BriefingPanel from './components/BriefingPanel'
import MailApp from './components/MailApp'
import PhoneApp from './components/PhoneApp'
import CalendarApp from './components/CalendarApp'
import NavigationApp from './components/NavigationApp'

function VehicleHMI() {
  const { activeScenario, hmiResetNonce } = useExperiment()
  const [activeTab, setActiveTab] = useState('Top view')
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

  const cameraViews = ['Top view', 'Side View', 'Rear View']

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

  // Keyboard shortcut listener for Ctrl+1 and Ctrl+2
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault()
        setSimType('roundabout')
        setSimStage(prev => {
          if (prev === 'idle') {
            playChime()
            return 'attempting'
          }
          return 'idle'
        })
      } else if (e.ctrlKey && e.key === '2') {
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

  const handleWaitAndRetry = () => {
    setSimStage('waiting')
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

      <div className="absolute left-0 top-0 w-[421px] h-full bg-[rgba(247,248,250,0.3)]"
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
          pointerEvents: (activeApp === 'Music' && isMusicFullscreen) ? 'none' : 'auto'
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="absolute left-[33px] top-[104px] h-[830px] flex flex-col justify-between w-[361px] z-20"
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-[361px] h-[390px] rounded-[20px] border border-[rgba(19,20,23,0.05)] overflow-hidden flex flex-col shrink-0"
          style={{
            background: 'linear-gradient(90deg, #fff 0%, #edeef2 100%)',
            filter: 'drop-shadow(0px 6px 12px rgba(0,0,0,0.08))',
          }}
        >
          <div className="px-[32px] pt-[38px] flex items-center gap-[18px]">
            <div className="w-[49px] h-[49px] rounded-[16px] bg-[#f7f8fa] border border-[rgba(19,20,23,0.2)] flex items-center justify-center shrink-0"
                 style={{ filter: 'drop-shadow(0px 6px 12px rgba(0,0,0,0.08))' }}>
              <img src={iconNav} alt="" className="w-[25px] h-[25px]" />
            </div>
            <div>
              <p className="text-[18px] font-medium text-[#99a1af] leading-[25px]">목적지</p>
              <p className="text-[22px] font-medium text-[#131417] leading-[31px] tracking-[-1px] whitespace-nowrap">서울시 강남구 대림로 47</p>
            </div>
          </div>

          <div className="mx-[32px] mt-[18px] w-[297px] h-[135px] bg-[#f7f8fa] rounded-[8px] overflow-hidden relative border border-[rgba(19,20,23,0.1)]">
            <img src={imgMapSmall} alt="Navigation Map" className="w-full h-full object-cover" />
          </div>

          <div className="h-[116px] border-t-2 border-[rgba(19,20,23,0.05)] flex items-center justify-center px-[32px] gap-[32px] mt-auto rounded-b-[20px]"
               style={{
                 background: 'linear-gradient(90deg, #fff 0%, #edeef2 100%), linear-gradient(90deg, #f7f8fa 0%, #f7f8fa 100%)',
                 filter: 'drop-shadow(0px 6px 12px rgba(0,0,0,0.08))',
               }}>
            <div className="whitespace-nowrap">
              <p className="text-[18px] text-[#99a1af] leading-[25px]">잔여거리</p>
              <p className="text-[30px] font-semibold text-[#131417] leading-[25px] tracking-[-0.6px] whitespace-nowrap">
                1.9 <span className="text-[18px] font-normal text-[#99a1af] tracking-[-0.36px]">km</span>
              </p>
            </div>
            <div className="whitespace-nowrap">
              <p className="text-[18px] text-[#99a1af] leading-[25px]">소요시간</p>
              <p className="text-[30px] font-semibold text-[#131417] leading-[25px] tracking-[-0.6px] whitespace-nowrap">
                12 <span className="text-[18px] font-normal text-[#99a1af] tracking-[-0.36px]">분</span>
              </p>
            </div>
            <div className="whitespace-nowrap">
              <p className="text-[18px] text-[#99a1af] leading-[25px]">도착예정</p>
              <p className="text-[30px] font-semibold text-[#131417] leading-[25px] tracking-[-0.6px] whitespace-nowrap">
                10:12 <span className="text-[18px] font-normal text-[#99a1af] tracking-[-0.36px]">PM</span>
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-[361px] h-[160px] bg-[#f7f8fa] border border-[rgba(19,20,23,0.2)] rounded-[20px] relative overflow-hidden shrink-0"
          style={{ boxShadow: '0px 6px 24px 0px rgba(0,0,0,0.08)' }}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-[2px] bg-gradient-to-r from-transparent via-[rgba(19,20,23,0.15)] to-transparent"
                style={{
                  width: Math.floor(Math.random() * 80 + 40) + 'px',
                  top: Math.floor(Math.random() * 120 + 10) + 'px',
                  left: '-100px'
                }}
                animate={{
                  left: ['-100px', '400px'],
                }}
                transition={{
                  duration: Math.random() * 1.2 + 0.6,
                  repeat: Infinity,
                  delay: Math.random() * 1.5,
                  ease: "linear"
                }}
              />
            ))}
          </div>

          <div className="absolute left-[26px] top-[15px] z-10">
            <span className="text-[66px] font-medium text-[#131417] leading-[72px] tabular-nums">{currentSpeed}</span>
            <br />
            <span className="text-[22px] text-[#99a1af] leading-[37px]">km/h</span>
          </div>
          <div className="absolute right-[-20px] top-[5px] w-[247px] h-[165px]">
            <motion.img 
              src={imgCar} 
              alt="" 
              className="w-full h-full object-contain"
              animate={{ 
                x: [0, 1.5, -1, 0],
                y: [0, -0.5, 0.5, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.6,
                ease: "linear"
              }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-[361px] h-[250px] rounded-[20px] border border-[rgba(19,20,23,0.05)] px-[32px] py-[20px] flex flex-col items-center shrink-0"
          style={{
            background: 'linear-gradient(90deg, #fff 0%, #edeef2 100%)',
            filter: 'drop-shadow(0px 6px 12px rgba(0,0,0,0.08))',
          }}
        >
          <div className="w-full h-[36px] bg-[#e9e9eb] rounded-[12px] p-[3px] flex shrink-0">
            {cameraViews.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-[9px] text-[13px] transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-[#f7f8fa] font-semibold text-[#131417] shadow-[0px_0.668px_0.668px_0px_rgba(0,0,0,0.08),0px_2.673px_10.691px_0px_rgba(0,0,0,0.16)]'
                    : 'font-medium text-[rgba(19,20,23,0.84)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="w-full flex-1 mt-[15px] rounded-[12px] overflow-hidden relative">
            <img src={imgMap} alt="" className="w-full h-full object-cover" />
          </div>
        </motion.div>
      </motion.div>

      <div className="absolute left-[421px] top-[79px] w-[1499px] h-[880px] z-10">
        <img src={imgMap} alt="" className="w-full h-full object-cover" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
           <img src={vectorRoad} alt="" className="w-[1000px] opacity-40" />
           <div className="absolute top-[40%] left-[45%] flex flex-col items-center">
              <motion.img 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                src={vectorCursor} alt="" className="w-[40px]" />
           </div>
        </div>
      </div>

      <AnimatePresence>
        {alertConfig && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="absolute left-1/2 top-[100px] z-50 bg-white/90 backdrop-blur-md px-[24px] py-[12px] rounded-full shadow-2xl flex items-center gap-[12px] border border-white/50"
          >
            <motion.div 
              animate={alertConfig.dotAnimate}
              transition={alertConfig.dotTransition}
              className="w-[12px] h-[12px] rounded-full"
              style={{ backgroundColor: alertConfig.dotColor }}
            />
            <span className="text-[18px] font-bold text-[#131417]">{alertConfig.text}</span>
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
            onClose={() => {
              setActiveApp(null)
              setIsNavigationFullscreen(false)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBriefingOpen && (
          <BriefingPanel 
            onClose={() => setIsBriefingOpen(false)} 
            simStage={simStage}
            simType={simType}
            onApprove={handleApproveDetour}
            onWait={handleWaitAndRetry}
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
          >
            <img src={iconMenu} alt="Menu" />
          </motion.button>
        </div>
      </div>
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
