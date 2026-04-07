export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#FF6B00] px-6 py-20 sm:px-10 selection:bg-black selection:text-[#FF6B00]">
      <section className="w-full max-w-4xl border-4 border-black bg-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] sm:p-14">
        <p className="mb-8 inline-flex border-2 border-black bg-white px-4 py-2 text-sm font-bold uppercase tracking-[0.15em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          VIT.SOCAL
        </p>

        <h1 className="max-w-3xl text-5xl font-black leading-none tracking-tight text-black sm:text-7xl uppercase">
          The social network for <span className="text-[#FF6B00] underline decoration-black decoration-4 underline-offset-[10px]">VIT</span> students.
        </h1>

        <p className="mt-8 max-w-2xl border-l-4 border-black pl-5 text-lg font-medium leading-relaxed text-black sm:text-xl">
          Discover your campus circle, find clubs and collaborators, and stay in
          sync with everything happening at VIT.
        </p>

        <div className="mt-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <a
            href="#"
            className="inline-flex h-16 w-full sm:w-auto items-center justify-center border-4 border-black bg-[#FF6B00] px-10 text-lg font-bold text-black transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
          >
            Join Now
          </a>
          <p className="text-base font-bold text-black decoration-2 underline-offset-4 sm:underline">
            Early access for VIT students.
          </p>
        </div>
      </section>
    </main>
  );
}
