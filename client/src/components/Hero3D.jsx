import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, MeshDistortMaterial, Float, PerspectiveCamera } from "@react-three/drei";
import { useRef } from "react";

function AnimatedSphere() {
  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
      <mesh>
        <sphereGeometry args={[1.5, 64, 64]} />
        <MeshDistortMaterial
          color="#10b981" // Emerald Green for "Dream Valley"
          speed={3}
          distort={0.4}
          radius={1}
        />
      </mesh>
    </Float>
  );
}

export default function Hero3D() {
  return (
    <div className="relative h-screen w-full bg-slate-950 overflow-hidden">
      {/* Background 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 8]} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} />
          
          <AnimatedSphere />
          
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Overlay Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
        {/* Fancy Glassmorphism Card */}
        <div className="max-w-4xl w-full backdrop-blur-xl bg-white/5 border border-white/10 p-12 rounded-[3rem] text-center shadow-2xl">
          <div className="inline-block px-4 py-1 mb-6 border border-emerald-500/30 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium tracking-widest uppercase">
            Now Enrolling for 2026
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tight">
            Dream Valley <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Public School
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-300 font-light mb-10 max-w-2xl mx-auto leading-relaxed">
            Where curiosity meets opportunity. We nurture the leaders of tomorrow in an environment of excellence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/20">
              Explore Campus
            </button>
            <button className="px-8 py-4 bg-transparent border border-white/20 hover:bg-white/10 text-white font-bold rounded-2xl transition-all">
              Admissions
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce flex flex-col items-center">
          <span className="text-white/30 text-xs uppercase tracking-widest mb-2">Scroll Down</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-emerald-500 to-transparent"></div>
        </div>
      </div>
    </div>
  );
}