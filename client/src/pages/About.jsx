export default function About() {
  return (
    <div className="bg-white text-gray-800 font-sans">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-5xl font-extrabold mb-4">Our Story</h1>
          <p className="text-xl opacity-90">
            Pushing boundaries and creating meaningful experiences since 2024.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-6xl mx-auto py-20 px-6 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold mb-6">Who We Are</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We are a team of designers, developers, and dreamers dedicated to 
            building tools that make life easier. Our approach is simple: 
            user-first design backed by rock-solid engineering.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Whether it's a small internal tool or a global platform, we bring 
            the same level of passion and precision to every pixel.
          </p>
        </div>
        <div className="bg-gray-200 h-64 rounded-2xl shadow-lg flex items-center justify-center">
          <span className="text-gray-400 italic">[Image/Illustration Placeholder]</span>
        </div>
      </section>

      {/* Values Grid */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <ValueCard title="Innovation" desc="Always looking for a better way to solve old problems." />
            <ValueCard title="Transparency" desc="Open communication is the foundation of our trust." />
            <ValueCard title="Quality" desc="We don't ship until it's something we're proud of." />
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper Component for the grid
function ValueCard({ title, desc }) {
  return (
    <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <h3 className="text-xl font-semibold mb-3 text-indigo-600">{title}</h3>
      <p className="text-gray-500">{desc}</p>
    </div>
  );
}