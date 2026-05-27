import React, { useState } from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import chevronRightImg from '../../assets/icons/Icon-11.svg'; // Reuse a chevron-like icon or we can use an SVG

export default function SwipeSlider({ onApprove, text = '밀어서 우회 경로 승인' }) {
  const [isApproved, setIsApproved] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const containerWidth = 344; // Matches the Figma container width
  const sliderWidth = 223; // Matches the Figma slider button width
  const maxDrag = containerWidth - sliderWidth - 8; // 8px padding on right

  const opacity = useTransform(x, [0, maxDrag], [1, 0.3]);

  const handleDragEnd = (event, info) => {
    if (info.offset.x >= maxDrag * 0.7) {
      // Swiped far enough
      controls.start({ x: maxDrag });
      setIsApproved(true);
      setTimeout(() => {
        if (onApprove) onApprove();
      }, 300); // Trigger after animation
    } else {
      // Snap back
      controls.start({ x: 0 });
    }
  };

  return (
    <div className="bg-[#d9d9d9] border border-[rgba(19,20,23,0.05)] border-solid flex h-[63px] items-center overflow-clip px-[4px] relative rounded-[300px] w-full shrink-0">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="bg-white drop-shadow-[0px_1px_3.5px_rgba(0,0,0,0.28)] flex gap-[8px] h-[50px] items-center min-h-[48px] pl-[20px] pr-[16px] py-[12px] relative rounded-[27px] shrink-0 z-10 cursor-grab active:cursor-grabbing w-[223px]"
      >
        <p className="font-['Pretendard_Variable'] font-medium leading-[1.4] text-[#131417] text-[18px] tracking-[-0.9px] whitespace-nowrap select-none">
          {isApproved ? '승인 완료' : text}
        </p>
        <div className="ml-auto w-[24px] h-[24px] flex items-center justify-center pointer-events-none">
          {/* Custom double chevron for the slider based on Figma */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M10 6L16 12L10 18" stroke="#2D7CF1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
             <path d="M5 6L11 12L5 18" stroke="#2D7CF1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
          </svg>
        </div>
      </motion.div>
      <motion.div 
        style={{ opacity }}
        className="absolute w-full h-full left-0 top-0 pointer-events-none flex items-center justify-end pr-[24px]"
      >
        <span className="text-[14px] text-black/20 font-medium tracking-wide">SWIPE</span>
      </motion.div>
    </div>
  );
}
