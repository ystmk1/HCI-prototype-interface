import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Flame, Snowflake } from 'lucide-react'

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
import iconCouch from '../assets/icons/Icon-9.svg'       // seat / couch
import iconTruck from '../assets/icons/Icon-10.svg'      // delivery / truck
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
import imgBriefing from '../assets/images/image 28.png'   // 상황브리핑 icon
import imgMapSmall from '../assets/images/image 21-2.png' // mini map for camera

import MusicApp from './components/MusicApp'
import BriefingPanel from './components/BriefingPanel'
import MailApp from './components/MailApp'
import PhoneApp from './components/PhoneApp'
import CalendarApp from './components/CalendarApp'

function App() {
  const [activeTab, setActiveTab] = useState('Top view')
  const [activeApp, setActiveApp] = useState(null)
  const [isMusicFullscreen, setIsMusicFullscreen] = useState(false)
  const [isMailFullscreen, setIsMailFullscreen] = useState(false)
  const [isPhoneFullscreen, setIsPhoneFullscreen] = useState(false)
  const [isCalendarFullscreen, setIsCalendarFullscreen] = useState(false)
  const [simStage, setSimStage] = useState('idle')
  const [simType, setSimType] = useState('roundabout')
  const [isBriefingOpen, setIsBriefingOpen] = useState(false)
  const [temperature, setTemperature] = useState(20)
  const [isAutoClimate, setIsAutoClimate] = useState(true)
  const [currentSpeed, setCurrentSpeed] = useState(52)
  const [currentTime, setCurrentTime] = useState(new Date())

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
    <div className="relative w-[1920px] h-[1080px] bg-[#f7f8fa] overflow-hidden rounded-[32px]"
         style={{ fontFamily: "'Pretendard', sans-serif" }}>

      <div className="absolute left-0 top-0 w-[421px] h-full bg-[rgba(247,248,250,0.3)]"
           style={{ boxShadow: '0px 6px 24px 0px rgba(0,0,0,0.09)' }} />

      <div className="absolute left-0 top-0 w-[1920px] h-[79px] bg-white flex items-center justify-between px-[49px] z-30">
        <div className="flex items-center gap-[24px]">
          <span className="text-[21px] text-black leading-[30px] tabular-nums">{formatTime(currentTime)}</span>
          <div className="flex items-center gap-[6px]">
            <img src={iconSun} alt="" className="w-[24px] h-[24px]" />
            <span className="text-[21px] text-black leading-[30px]">24°C</span>
          </div>
        </div>
        <div className="flex items-center gap-[18px]">
          <img src={iconWifi} alt="" className="w-[24px] h-[24px]" />
          <img src={iconBattery} alt="" className="w-[24px] h-[24px]" />
          <span className="text-[21px] text-black leading-[30px]">100%</span>
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

      <div className="absolute left-0 bottom-0 w-[1920px] h-[121px] flex items-center justify-between px-[49px] z-30"
           style={{ background: 'linear-gradient(90deg, #fff 0%, #edeef2 100%)' }}>
        <div className="flex items-center gap-[18px]">
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="w-[73px] h-[73px] rounded-[21px] flex items-center justify-center"
          >
            <img src={iconHome} alt="" className="w-[36px] h-[36px]" />
          </motion.button>

          <motion.button whileTap={{ scale: 0.92 }}
            onClick={() => { setTemperature(prev => Math.max(17, prev - 1)); setIsAutoClimate(false) }}
            className="w-[55px] h-[55px] rounded-[21px] flex items-center justify-center">
            <img src={iconChevronDown} alt="" className="w-[30px] h-[30px]" />
          </motion.button>

          <div className="flex flex-col items-center px-[12px]">
            <span className={`text-[36px] font-semibold leading-[49px] transition-colors duration-300 ${isAutoClimate ? 'text-[#a0a0a5]' : temperature <= 22 ? 'text-[#4A90D9]' : 'text-[#E85D5D]'}`}>{temperature}.0</span>
            <button onClick={() => setIsAutoClimate(true)} className="flex items-center gap-[6px] hover:opacity-70 transition-opacity">
              {isAutoClimate ? (
                <img src={iconAC} alt="" className="w-[18px] h-[18px] opacity-60" />
              ) : temperature <= 22 ? (
                <Snowflake size={18} className="text-[#4A90D9]" />
              ) : (
                <Flame size={18} className="text-[#E85D5D]" />
              )}
              <span className={`text-[18px] leading-[24px] transition-colors duration-300 ${isAutoClimate ? 'text-[#99a1af]' : temperature <= 22 ? 'text-[#4A90D9]' : 'text-[#E85D5D]'}`}>
                {isAutoClimate ? 'AUTO' : temperature <= 22 ? 'COOL' : 'HEAT'}
              </span>
            </button>
          </div>

          <motion.button whileTap={{ scale: 0.92 }}
            onClick={() => { setTemperature(prev => Math.min(29, prev + 1)); setIsAutoClimate(false) }}
            className="w-[55px] h-[55px] rounded-[21px] flex items-center justify-center">
            <img src={iconChevronUp} alt="" className="w-[30px] h-[30px]" />
          </motion.button>

          <motion.button whileTap={{ scale: 0.92 }}
            className="w-[67px] h-[67px] rounded-[21px] flex items-center justify-center">
            <img src={iconCouch} alt="" className="w-[30px] h-[30px]" />
          </motion.button>

          <motion.button whileTap={{ scale: 0.92 }}
            className="w-[67px] h-[67px] rounded-[21px] flex items-center justify-center">
            <img src={iconTruck} alt="" className="w-[30px] h-[30px]" />
          </motion.button>
        </div>

        <div className="flex items-center gap-[18px]">
          {[
            { id: 'Navigation', icon: iconSend, label: 'Navigation' },
            { id: 'Phone', icon: iconPhone, label: 'Phone' },
            { id: 'Music', icon: iconMusic, label: 'Music' },
            { id: 'Mail', icon: iconMail, label: 'Mail' },
            { id: 'Calendar', icon: iconCalendar, label: 'Calendar' },
          ].map((item, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (item.id === 'Music' || item.id === 'Mail' || item.id === 'Phone' || item.id === 'Calendar') {
                  setActiveApp(prev => prev === item.id ? null : item.id)
                }
              }}
              className={`w-[73px] h-[73px] border border-[rgba(19,20,23,0.2)] rounded-full flex items-center justify-center transition-colors ${
                activeApp === item.id ? 'bg-white shadow-[inset_0px_2px_4px_rgba(0,0,0,0.05)]' : 'bg-[#f7f8fa]'
              }`}
              style={{ filter: 'drop-shadow(0px 6px 12px rgba(0,0,0,0.08))' }}
            >
              <img src={item.icon} alt={item.label} className="w-[30px] h-[30px]" />
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-[18px]">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsBriefingOpen(prev => !prev)}
            className={`flex flex-col items-center cursor-pointer transition-opacity ${isBriefingOpen ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
          >
            <div className="w-[61px] h-[57px] relative">
              <img src={imgBriefing} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="text-[12px] font-semibold text-[#a0a0a5] leading-[15px] mt-[3px]">상황브리핑</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="w-[51px] h-[51px] rounded-[16px] flex items-center justify-center bg-[#f7f8fa] border border-[rgba(19,20,23,0.1)]"
          >
            <img src={iconMenu} alt="" className="w-[24px] h-[24px]" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default App
