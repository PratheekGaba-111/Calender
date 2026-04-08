import WallCalendar from "@/components/WallCalendar";

export default function Home() {
  return (
    <div
      className="min-h-screen px-4 py-6 text-white lg:h-dvh lg:overflow-hidden lg:py-4"
      style={{
        backgroundColor: "#05010A",
        backgroundImage:
          "radial-gradient(1200px circle at 20% 0%, rgba(255,20,147,0.35), transparent 60%), radial-gradient(900px circle at 85% 10%, rgba(0,255,255,0.22), transparent 55%), linear-gradient(180deg, rgba(131,56,236,0.18), rgba(5,1,10,0) 35%, rgba(5,1,10,1) 100%)",
      }}
    >
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:h-full lg:min-h-0">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Interactive Wall Calendar
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-white/80 lg:hidden">
            Default is <span className="font-semibold text-white">Notes</span> mode: tap a date and
            hit <span className="font-semibold text-white">+</span> to add a titled note. Toggle to{" "}
            <span className="font-semibold text-white">Range</span> only when you want range
            selection. Everything saves to your browser (localStorage).
          </p>
          <p className="hidden text-sm text-white/70 lg:block">
            Dated notes • Optional range • Saved locally
          </p>
        </header>

        <div className="flex-1 min-h-0">
          <WallCalendar />
        </div>
      </main>
    </div>
  );
}
