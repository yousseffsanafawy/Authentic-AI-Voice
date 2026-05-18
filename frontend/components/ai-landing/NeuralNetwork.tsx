"use client";

import { motion } from "framer-motion";

export default function NeuralNetwork() {
  return (
    <div className="absolute inset-0 bg-[#030303] overflow-hidden">
      {/* Cyan/Purple Grid */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Animated Synapse Particles */}
      {[...Array(25)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: Math.random() * 100 + "%",
            opacity: 0 
          }}
          animate={{
            opacity: [0, 0.4, 0],
            scale: [0, 1.5, 0],
            x: [null, (Math.random() - 0.5) * 200 + "px"],
            y: [null, (Math.random() - 0.5) * 200 + "px"],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute w-1 h-1 bg-cyan-400 rounded-full blur-[2px]"
          style={{
            boxShadow: "0 0 10px #06b6d4, 0 0 20px #8b5cf6",
          }}
        />
      ))}

      {/* Glowing Ambient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full" />
    </div>
  );
}
