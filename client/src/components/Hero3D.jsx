import { Canvas } from "@react-three/fiber";
import { MeshDistortMaterial, Float, PerspectiveCamera } from "@react-three/drei";

export default function Hero3D({ isSidebarCollapsed }) {
  // This logic ensures the Hero "pushes" away from the sidebar
  const sidebarWidth = isSidebarCollapsed ? "70px" : "240px";

  return (
    <div 
      style={{ 
        marginLeft: sidebarWidth,
        width: `calc(100% - ${sidebarWidth})`,
        transition: "all 0.5s cubic-bezier(0.2, 1, 0.2, 1)"
      }}
      className="relative h-screen bg-[#FAFAFA] overflow-hidden"
    >
      
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0 opacity-40">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 8]} />
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#10b981" />
          <AnimatedGlass />
        </Canvas>
      </div>

      {/* Hero Content Area */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-12 text-center">
        
        {/* Minimalist Subtitle */}
        <div className="overflow-hidden mb-4">
          <span className="inline-block text-[10px] font-black tracking-[0.6em] text-emerald-600 uppercase animate-in slide-in-from-bottom duration-1000">
            ESTABLISHED 1998 • PREMIUM SELECTION
          </span>
        </div>

        {/* Oversized Swiss Typography - The "Appropriate" Size */}
        <h1 className="text-[10vw] md:text-[120px] font-black text-[#020617] leading-[0.8] tracking-[-0.06em] uppercase">
          DREAM <br />
          <span className="text-emerald-500">VALLEY</span>
        </h1>

        {/* Minimalist Body Text */}
        <p className="mt-8 text-lg md:text-xl text-slate-400 font-medium max-w-xl leading-relaxed tracking-tight">
          Redefining the architecture of modern education. <br />
          <span className="text-slate-900 font-bold">Simple. Bold. Effective.</span>
        </p>

        {/* Buttons Removed as requested for a cleaner look */}
      </div>

      {/* Decorative Minimalist Accents */}
      <div className="absolute bottom-12 right-12 text-right">
        <p className="text-[10px] font-black text-slate-900 tracking-widest uppercase">2026 Edition</p>
        <p className="text-[10px] text-slate-400 uppercase">System Active</p>
      </div>

      <div className="absolute bottom-12 left-12 flex items-center gap-4">
        <div className="w-12 h-[1px] bg-slate-200"></div>
        <span className="text-[10px] font-bold text-slate-300 tracking-[0.3em] uppercase">Scroll to explore</span>
      </div>
    </div>
  );
}

function AnimatedGlass() {
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <mesh>
        <sphereGeometry args={[1.8, 64, 64]} />
        <MeshDistortMaterial
          color="#10b981" 
          speed={2}
          distort={0.25}
          radius={1}
          opacity={0.12}
          transparent
          roughness={0}
        />
      </mesh>
    </Float>
  );
}