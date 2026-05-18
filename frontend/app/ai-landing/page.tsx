"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import SplashScreen from "@/components/ai-landing/SplashScreen";
import NeuralNetwork from "@/components/ai-landing/NeuralNetwork";

export default function AILandingPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for buttery movement
  const springX = useSpring(mouseX, { damping: 30, stiffness: 150 });
  const springY = useSpring(mouseY, { damping: 30, stiffness: 150 });

  useEffect(() => {
    setIsMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // CSS Mask image driven by mouse position
  const maskImage = useTransform(
    [springX, springY],
    ([x, y]) => `radial-gradient(circle 250px at ${x}px ${y}px, black 0%, transparent 100%)`
  );

  if (!isMounted) return <div className="bg-[#030303] min-h-screen" />;

  return (
    <div className="relative min-h-screen bg-[#030303] text-white selection:bg-cyan-500/30 overflow-hidden font-sans">
      <SplashScreen onComplete={() => setIsLoaded(true)} />

      {isLoaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative w-full min-h-screen"
        >
          {/* ─── HIDDEN LAYER (Neural Core) ─── */}
          <motion.div
            style={{ 
              WebkitMaskImage: maskImage, 
              maskImage: maskImage 
            }}
            className="fixed inset-0 z-10 pointer-events-none select-none"
          >
            <NeuralNetwork />
          </motion.div>

          {/* ─── VISIBLE CONTENT LAYER ─── */}
          <div className="relative z-20 container mx-auto px-6 pt-32 flex flex-col items-center">
            
            {/* Header / Nav */}
            <nav className="fixed top-0 left-0 w-full flex justify-between items-center px-10 py-8 z-50">
              <div className="text-xl font-black tracking-tighter flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 shadow-[0_0_20px_rgba(6,182,212,0.4)]" />
                <span>AETHER.AI</span>
              </div>
              <div className="hidden md:flex gap-8 text-[11px] font-bold tracking-[0.2em] uppercase text-white/40">
                {["Intelligence", "Nodes", "Security", "Protocol"].map((item) => (
                  <a key={item} href="#" className="hover:text-cyan-400 transition-colors">{item}</a>
                ))}
              </div>
              <button className="px-6 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[11px] font-bold tracking-widest uppercase hover:bg-white/10 transition-all">
                Access System
              </button>
            </nav>

            {/* Hero Section */}
            <header className="max-w-4xl text-center mt-20 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="inline-block px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-[10px] font-black tracking-[0.25em] uppercase mb-8">
                  Core Revision v6.0
                </div>
                
                <h1 className="text-7xl md:text-[140px] font-black tracking-tighter leading-[0.85] mb-8 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
                  THE FUTURE <br /> OF INTELLIGENCE
                </h1>
                
                <p className="max-w-xl mx-auto text-white/50 text-lg md:text-xl leading-relaxed mb-12">
                  Experience the dawn of cognitive sovereignty. A platform architected for absolute 
                  efficiency and biological intent.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="px-10 py-5 rounded-full bg-white text-black font-black text-xs tracking-widest uppercase hover:scale-105 transition-transform">
                    Deploy Core
                  </button>
                  <button className="px-10 py-5 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl font-black text-xs tracking-widest uppercase hover:bg-white/10 transition-all">
                    View Network
                  </button>
                </div>
              </motion.div>
            </header>

            {/* Feature Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-48 pb-40">
              <FeatureCard 
                title="Neural Mesh"
                desc="Hyper-threaded pathways processing 4.2 petabytes per second at the edge."
                accent="cyan"
              />
              <FeatureCard 
                title="Ghost Protocol"
                desc="Zero-knowledge encryption layer that vanishes after verification."
                accent="purple"
              />
              <FeatureCard 
                title="Bio Interface"
                desc="Adaptive UI that reacts to neural biological intent and sentiment."
                accent="emerald"
              />
            </section>
          </div>
        </motion.div>
      )}

      {/* Font & Cursor Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Space+Grotesk:wght@300;400;700&display=swap');
        
        body {
          background-color: #030303;
          cursor: crosshair;
        }

        h1 {
          font-family: 'Inter', sans-serif;
        }

        p, a, button, span {
          font-family: 'Space Grotesk', sans-serif;
        }
      `}</style>
    </div>
  );
}

function FeatureCard({ title, desc, accent }: { title: string; desc: string; accent: "cyan" | "purple" | "emerald" }) {
  const accentColor = {
    cyan: "rgba(6, 182, 212, 1)",
    purple: "rgba(139, 92, 246, 1)",
    emerald: "rgba(16, 185, 129, 1)",
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      whileHover={{ y: -5 }}
      className="group relative p-8 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] transition-all duration-300
                 hover:bg-white/[0.06] hover:border-white/[0.15]"
      style={{
        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)",
      }}
    >
      {/* Subtle Hover Glow Border */}
      <div 
        className="absolute inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 20px -5px ${accentColor}`,
          border: `1px solid ${accentColor}44`,
        }}
      />
      
      <div className="relative z-10">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center mb-6"
          style={{ background: `${accentColor}11`, border: `1px solid ${accentColor}33` }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
        </div>
        <h3 className="text-xl font-bold mb-3 tracking-tight">{title}</h3>
        <p className="text-white/40 text-sm leading-relaxed">
          {desc}
        </p>
      </div>
    </motion.div>
  );
}
