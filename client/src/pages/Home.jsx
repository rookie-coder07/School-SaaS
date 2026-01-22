import Hero3D from "../components/Hero3D";

export default function Home() {
  return (
    <div>
      <Hero3D />

      <section className="text-center py-20 px-4">
        <h2 className="text-4xl font-bold mb-4">
          Shaping Future Leaders
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto text-lg">
          At Ghalib Public School, we focus on academic excellence,
          strong values, and holistic development for every student.
        </p>
      </section>
    </div>
  );
}
