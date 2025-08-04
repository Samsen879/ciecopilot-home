import React from 'react';
import { motion } from 'framer-motion';

const SimpleTransition = () => {
  return (
    <section className="relative h-32 bg-gradient-to-b from-white via-blue-25 to-blue-50">
      <div className="absolute inset-0 overflow-hidden">
        {/* 流体波浪 */}
        <svg 
          className="absolute bottom-0 w-full h-32" 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none"
        >
          <motion.path
            d="M0,60 C300,100 500,20 800,60 C900,80 1000,40 1200,60 L1200,120 L0,120 Z"
            fill="url(#simpleGradient)"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="simpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* 简洁的浮动点 */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-300/40 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 2) * 20}%`
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.4, 0.8, 0.4],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </section>
  );
};

export default SimpleTransition;