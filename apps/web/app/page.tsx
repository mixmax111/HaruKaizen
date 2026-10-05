import Link from 'next/link';
import {
  Dumbbell,
  Smartphone,
  Cpu,
  ShieldCheck,
  UtensilsCrossed,
  Camera,
  ArrowRight,
  Sparkles,
  WifiOff,
  Zap,
  Activity,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-pink-500 selection:text-white">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-pink-500/10 blur-[130px] rounded-full" />
        <div className="absolute top-[35%] -right-40 w-[500px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full" />
        <div className="absolute top-[65%] -left-40 w-[500px] h-[350px] bg-blue-500/10 blur-[130px] rounded-full" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 w-full border-b border-zinc-800/80 bg-[#0b0f17]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="text-2xl transition-transform group-hover:scale-110">🌸</span>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-pink-400 via-rose-300 to-amber-200 bg-clip-text text-transparent">
                HaruKaizen
              </span>
              <span className="text-[10px] text-zinc-400 tracking-wider font-mono uppercase -mt-1">
                改善 • Self-Hosted
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <a href="#features" className="hover:text-pink-400 transition-colors">
              Funzionalità
            </a>
            <a href="#showcase" className="hover:text-pink-400 transition-colors">
              Dashboard
            </a>
            <a href="#architecture" className="hover:text-pink-400 transition-colors">
              Architettura
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Accedi
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition shadow-lg shadow-pink-500/25 flex items-center gap-1.5"
            >
              Inizia Ora
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1">
        <section className="pt-20 pb-16 sm:pt-28 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-semibold mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Piattaforma Core Fitness & Nutrizione Offline-First</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6">
            <span className="block text-slate-100">Track. Evolve.</span>
            <span className="bg-gradient-to-r from-pink-400 via-rose-300 to-emerald-400 bg-clip-text text-transparent">
              Conquer.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed mb-10">
            Il monorepo definitivo per trasformare la tua disciplina fisica. Tracciamento pesi in sala,
            calcolo TDEE dinamico, barcode scanning nutrizionale e AI Coach guidato dai principi del
            miglioramento continuo. 100% self-hosted, privato e senza compromessi.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-pink-500 hover:bg-pink-600 transition shadow-xl shadow-pink-500/25 flex items-center justify-center gap-2 group"
            >
              Inizia Gratuitamente
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-sm text-zinc-200 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition flex items-center justify-center"
            >
              Accedi alla Dashboard
            </Link>
          </div>

          {/* Key trust bullets */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Offline-First (Zero perdita dati)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-pink-400" />
              <span>100% Self-Hosted & Open Source</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>AI Coaching Contestuale</span>
            </div>
          </div>
        </section>

        {/* Visual Showcase / Mockup Placeholders */}
        <section id="showcase" className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pb-24">
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 backdrop-blur-xl shadow-2xl shadow-black/80">
            {/* Window Topbar */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
                <span className="ml-2 text-xs font-mono text-zinc-400">harukaizen.local:3000/dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  API v1 Online
                </span>
              </div>
            </div>

            {/* Simulated Live UI Metrics & Placeholders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Card 1: Gym Tracker Live Set */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                    <span className="font-semibold text-zinc-200">Ultimo Set Registrato</span>
                    <span className="text-pink-400 font-mono">1 min fa</span>
                  </div>
                  <div className="text-xl font-bold text-slate-100 mb-1">Panca Piana Bilanciere</div>
                  <p className="text-xs text-zinc-400 font-mono">4 serie • 100 kg × 5 reps • RPE 8.5</p>
                </div>
                {/* Visual placeholder wave */}
                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <div className="h-2 w-28 bg-pink-500/30 rounded-full overflow-hidden">
                    <div className="h-full w-4/5 bg-pink-500 rounded-full" />
                  </div>
                  <span className="text-[11px] text-pink-400 font-mono">1RM Est: 116 kg</span>
                </div>
              </div>

              {/* Card 2: Daily Nutrition Macros */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                    <span className="font-semibold text-zinc-200">Bilancio Calorico Odierno</span>
                    <span className="text-emerald-400 font-mono">Target: 2,650 kcal</span>
                  </div>
                  <div className="text-xl font-bold text-slate-100 mb-1">2,180 / 2,650 kcal</div>
                  <p className="text-xs text-zinc-400">Proteine 165g • Carboidrati 220g • Grassi 64g</p>
                </div>
                {/* Visual placeholder bars */}
                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-emerald-500/20 rounded-full overflow-hidden">
                    <div className="h-full w-[82%] bg-emerald-400 rounded-full" />
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono">82%</span>
                </div>
              </div>

              {/* Card 3: AI Kaizen Coach Insights */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                    <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                      Kaizen Coach AI
                    </span>
                    <span className="text-zinc-500 font-mono text-[10px]">TDEE Adapt</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed italic">
                    "Volume settimanale petto completato (+8%). Recupero ottimale per la sessione gambe di domani."
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Fatigue Index: Basso</span>
                  <span className="text-emerald-400 font-semibold font-mono">Pronto</span>
                </div>
              </div>
            </div>

            {/* Visual Animated Pulse Placeholder Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="h-20 bg-zinc-800/40 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between animate-pulse">
                <div className="h-3 w-16 bg-zinc-700/60 rounded" />
                <div className="h-5 w-24 bg-zinc-700/80 rounded" />
              </div>
              <div className="h-20 bg-zinc-800/40 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between animate-pulse">
                <div className="h-3 w-20 bg-zinc-700/60 rounded" />
                <div className="h-5 w-28 bg-zinc-700/80 rounded" />
              </div>
              <div className="h-20 bg-zinc-800/40 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between animate-pulse">
                <div className="h-3 w-14 bg-zinc-700/60 rounded" />
                <div className="h-5 w-20 bg-zinc-700/80 rounded" />
              </div>
              <div className="h-20 bg-zinc-800/40 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between animate-pulse">
                <div className="h-3 w-24 bg-zinc-700/60 rounded" />
                <div className="h-5 w-16 bg-zinc-700/80 rounded" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Pillars Grid */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              I Pilastri di HaruKaizen
            </h2>
            <p className="text-sm sm:text-base text-zinc-400">
              Progettato per atleti, lifter e biohacker che rifiutano abbonamenti costosi e perdita di controllo sui propri dati personali.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pillar 1: Offline First */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-pink-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 group-hover:scale-110 transition-transform">
                <WifiOff className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Offline-First Mobile App
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Nessuna connessione nello scantinato della palestra? Nessun problema. L'app React Native gestisce le sessioni su store locale Zustand e invia i dati a NestJS tramite una Sync Queue automatica.
              </p>
            </div>

            {/* Pillar 2: AI Coach Integrato */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                AI Coach Contestuale
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Algoritmo di stima TDEE adattivo e LLM integrato con snapshot del contesto: monitora volume, sovraccarico progressivo e suggerisce modifiche a dieta e carichi in tempo reale.
              </p>
            </div>

            {/* Pillar 3: Privacy & Self-Hosting */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-blue-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Privacy & Self-Hosting
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Nessun cloud di terze parti o tracciamento pubblicitario. Esegui la piattaforma su Docker sulla tua VPS personale con Postgres, Redis e backup automatici crontab.
              </p>
            </div>

            {/* Pillar 4: Database Nutrizionale */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Database Nutrizionale & Barcode
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Scansiona i prodotti tramite fotocamera con fallback OpenFoodFacts e memorizza i tuoi alimenti preferiti per conteggi precisi di macro e calorie in pochi tocchi.
              </p>
            </div>

            {/* Pillar 5: Ghosting Camera */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-rose-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Ghosting Camera Progress
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Allinea le pose corporee sovrapponendo l'ultimo scatto con trasparenza regolabile. Confronta le variazioni di simmetria e massa magra mese dopo mese senza errori di prospettiva.
              </p>
            </div>

            {/* Pillar 6: Workout Logger Intelligente */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-violet-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                <Dumbbell className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Gym Logger & Anti-Sleep Timer
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Timer di riposo basati su timestamp assoluto (nessun freeze in background), supporto keep-awake dello schermo e feedback aptico su completamento serie e RPE.
              </p>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section id="architecture" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-zinc-800/80">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
              Stack Tecnologico Enterprise
            </h2>
            <p className="text-sm text-zinc-400">
              Architettura monorepo moderna con Turborepo, isolamento dei domini e standard elevati di robustezza.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-center">
              <div className="font-bold text-pink-400 text-lg">Next.js 16</div>
              <p className="text-xs text-zinc-400 mt-1">App Router & Tailwind</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-center">
              <div className="font-bold text-emerald-400 text-lg">NestJS v11</div>
              <p className="text-xs text-zinc-400 mt-1">API REST v1 & Guard JWT</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-center">
              <div className="font-bold text-blue-400 text-lg">React Native Expo</div>
              <p className="text-xs text-zinc-400 mt-1">Zustand Offline-First</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-center">
              <div className="font-bold text-amber-400 text-lg">Postgres & Redis</div>
              <p className="text-xs text-zinc-400 mt-1">Prisma ORM & Rate Limiter</p>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 blur-[100px] pointer-events-none rounded-full" />
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Pronto a costruire la tua migliore versione?
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto mb-8">
              Crea subito il tuo profilo e inizia a tracciare la tua evoluzione quotidiana con HaruKaizen.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-pink-500 hover:bg-pink-600 transition shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2"
              >
                Crea Account Gratuito
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-sm text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 transition"
              >
                Hai già un account? Accedi
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/80 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>🌸 HaruKaizen</span>
            <span>•</span>
            <span>改善 Kaizen Daily Fitness Platform</span>
          </div>
          <div>
            Self-Hosted & MIT Licensed • Monorepo Production Ready
          </div>
        </div>
      </footer>
    </div>
  );
}
