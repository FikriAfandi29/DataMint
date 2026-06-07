import { useState, useEffect } from "react";
import logo from "./assets/logo.png";
import { 
  ArrowRight, 
  Sparkles, 
  Search, 
  FileText, 
  BarChart3, 
  Terminal, 
  Check, 
  Sun, 
  Moon, 
  Globe, 
  Layers, 
  ChevronRight, 
  Database,
  Cpu,
  TrendingUp,
  RotateCw,
  LineChart,
  Calendar,
  Eye,
  Plus,
  Play,
  Download,
  FileSpreadsheet
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: (mode: "login" | "register") => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function LandingPage({ onGetStarted, darkMode, setDarkMode }: LandingPageProps) {
  const [dbSearchQuery, setDbSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"step1" | "step2" | "step3">("step1");
  const [scrolled, setScrolled] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [synthProgress, setSynthProgress] = useState(0);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Auto typing simulator for hero
  useEffect(() => {
    let typingInterval: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;
    let delayTimeout: NodeJS.Timeout;

    const runAnimation = () => {
      const prompt =
        "Fetch UK, China, India, US inflation projection data from IMF";

      setTypedText("");
      setSynthProgress(0);
      setIsSynthesizing(false);

      let index = 0;

      typingInterval = setInterval(() => {
        if (index < prompt.length) {
          setTypedText((prev) => prev + prompt.charAt(index));
          index++;
        } else {
          clearInterval(typingInterval);

          delayTimeout = setTimeout(() => {
            setIsSynthesizing(true);

            let progress = 0;

            progressInterval = setInterval(() => {
              if (progress < 100) {
                progress += 4;
                setSynthProgress(progress);
              } else {
                clearInterval(progressInterval);

                delayTimeout = setTimeout(() => {
                  setIsSynthesizing(false);
                  setSynthProgress(0);
                  setTypedText("");

                  // restart animation
                  runAnimation();
                }, 4000);
              }
            }, 80);
          }, 2500);
        }
      }, 70);
    };

    runAnimation();

    return () => {
      clearInterval(typingInterval);
      clearInterval(progressInterval);
      clearTimeout(delayTimeout);
    };
  }, []);

    // Handle scroll state for sticky glassmorphism header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    handleScroll(); // cek posisi awal

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const downloadSampleExcel = () => {
    const headers = "Year,Country,Indicator,Value,Unit\n";
    const rows = [
      "2020,United Kingdom,Inflation Rate (IMF),2.5,%\n",
      "2021,United Kingdom,Inflation Rate (IMF),3.2,%\n",
      "2022,United Kingdom,Inflation Rate (IMF),7.9,%\n",
      "2023,United Kingdom,Inflation Rate (IMF),6.8,%\n",
      "2024,United Kingdom,Inflation Rate (IMF),3.0,%\n",
      "2020,Indonesia,BI-Rate Reference,3.75,%\n",
      "2021,Indonesia,BI-Rate Reference,3.50,%\n",
      "2022,Indonesia,BI-Rate Reference,5.50,%\n",
      "2023,Indonesia,BI-Rate Reference,6.00,%\n",
      "2024,Indonesia,BI-Rate Reference,6.25,%\n"
    ].join("");
    
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "DataMint_Macroeconomic_Sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const institutionalSources = [
    { name: "IMF Portal", icon: Globe, category: "Sovereign Debt", desc: "Bilateral exchange rates & financial stability accounts.", color: "text-[#38bdf8]" },
    { name: "World Bank WDI", icon: Layers, category: "Development Indices", desc: "Development data, poverty, & cross-country infrastructure.", color: "text-[#fbbf24]" },
    { name: "Federal Reserve FRED", icon: Terminal, category: "Central Bank", desc: "US Federal Funds Rate, bond yields, & monetary aggregates.", color: "text-[#10b981]" },
    { name: "Bank Indonesia (BI)", icon: TrendingUp, category: "Central Bank", desc: "BI-Rate reference interest records & transaction flows.", color: "text-[#f43f5e]" },
    { name: "BPS National Registry", icon: Cpu, category: "Localized Bureau", desc: "Consumer inflation indices and provincial microtrends.", color: "text-[#a855f7]" },
  ];

  const filteredSources = institutionalSources.filter(src => 
    src.name.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
    src.category.toLowerCase().includes(dbSearchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? "bg-[#110f0e] text-[#faf9f6]/90" : "bg-[#faf9f6] text-slate-800"
    } selection:bg-[#128a5e] selection:text-white font-sans antialiased overflow-x-hidden`}>
      
      {/* 1. Sticky Glassmorphism Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? `py-3 backdrop-blur-md border-b shadow-lg ${
              darkMode ? "bg-[#110f0e]/85 border-[#2d2722]/50" : "bg-[#faf9f6]/85 border-[#e5ded4] shadow-sm"
            }` 
          : "py-6 bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between">
          
          {/* Logo matching the terminal's theme */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
           <div
              className="flex items-center cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <img
                src={logo}
                alt="DataMint"
                className="h-16 w-auto"
              />
            </div>
          </div>

          {/* Navigation links targeting the customized features */}
          <nav className={`hidden md:flex items-center gap-8 text-[13px] font-medium ${
            darkMode ? "text-[#c4b9ae]" : "text-slate-600"
          }`}>
            <a href="#about-target" className={`transition-colors ${
              darkMode ? "hover:text-white text-[#c4b9ae]" : "hover:text-slate-950 text-slate-600"
            }`}>How It Works</a>
            <a href="#features-interactive" className={`transition-colors ${
              darkMode ? "hover:text-white text-[#c4b9ae]" : "hover:text-slate-950 text-slate-600"
            }`}>Terminal Capabilities</a>
            <a href="#excel-download-section" className={`transition-colors ${
              darkMode ? "hover:text-white text-[#c4b9ae]" : "hover:text-slate-950 text-slate-600"
            }`}>Excel Workspace</a>
            <a href="#sources-index" className={`transition-colors ${
              darkMode ? "hover:text-white text-[#c4b9ae]" : "hover:text-slate-950 text-slate-600"
            }`}>Indicator Registries</a>
          </nav>

          <div className="flex items-center gap-4">
            
            {/* Theme Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 border rounded-lg transition-all cursor-pointer ${
                darkMode 
                  ? "border-[#2d2722] bg-[#1a1714] hover:bg-[#25201c] text-white" 
                  : "border-[#e5ded4] bg-white hover:bg-[#f4efe5] text-slate-800"
              }`}
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-amber-600" />}
            </button>

            {/* Account Logins */}
            <button 
              onClick={() => onGetStarted("login")}
              className={`hidden sm:inline-block px-4 py-2 text-xs font-semibold bg-transparent border-none cursor-pointer transition-colors ${
                darkMode ? "text-[#c4b9ae] hover:text-white" : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Log in
            </button>

            <button 
              onClick={() => onGetStarted("register")}
              className="px-5 py-2.5 bg-[#128a5e] hover:bg-[#159e6c] text-white text-xs font-bold rounded-lg shadow-md shadow-[#128a5e]/15 transition-all cursor-pointer flex items-center gap-2 border-none"
            >
              <span>Launch Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section: Expressive Synthesis Simulator */}
      <section className="pt-32 md:pt-44 pb-20 relative px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#128a5e12,transparent_45%)] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#128a5e] bg-[#128a5e]/10 px-3 py-1.5 rounded-full border border-[#128a5e]/15">
            <Sparkles className="w-3.5 h-3.5" />
            Real-Time Synthesis Sandbox
          </span>

          <h1 className={`text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight font-sans max-w-4xl mx-auto leading-[1.1] ${
            darkMode ? "text-white" : "text-slate-900"
          }`}>
            Describe the dataset you need.<br />
            <span className="font-serif italic font-normal text-[#128a5e]">DataMint compiles it instantly.</span>
          </h1>

          <p className={`text-sm sm:text-md max-w-2xl mx-auto leading-relaxed ${
            darkMode ? "text-[#c4b9ae]" : "text-slate-600"
          }`}>
            Stop digging through disparate files across BPS, IMF, BI-Rate, and FRED. DataMint sweeps global registries, normalizes indicators, and serves beautifully aligned, download-ready timeseries.
          </p>

          {/* Interactive Input Demonstration */}
          <div className={`max-w-3xl mx-auto rounded-2xl border p-5 md:p-6 shadow-2xl text-left font-sans mt-10 relative overflow-hidden transition-colors ${
            darkMode ? "bg-[#181512] border-[#2d2722]" : "bg-white border-[#e5ded4]"
          }`}>
            <span className={`text-[10px] font-mono tracking-widest uppercase block mb-3 ${
              darkMode ? "text-[#8e857c]" : "text-slate-500"
            }`}>DATAMINT INTELLIGENCE SYNTHESIS ENGINE</span>
            
            <div className="relative flex items-center mb-4">
              <Search className={`absolute left-4 w-4 h-4 ${darkMode ? "text-[#8a7f75]" : "text-slate-400"}`} />
              <div className={`w-full border rounded-xl pl-11 pr-32 py-3.5 text-xs sm:text-sm flex items-center gap-0.5 font-mono min-h-[48px] ${
                darkMode ? "bg-[#110f0e] border-[#2c2621] text-[#faf9f6]" : "bg-[#fcfbf9] border-[#e2dcd0] text-slate-900"
              }`}>
                <span>{typedText}</span>
                <span className="w-1.5 h-4 bg-[#128a5e] animate-pulse rounded-sm shrink-0" />
              </div>
              <button 
                onClick={() => onGetStarted("register")}
                className="absolute right-2 px-4 py-2 bg-[#128a5e] text-white text-xs font-bold rounded-lg border-none cursor-pointer hover:bg-[#159e6c] transition-colors flex items-center gap-1.5"
              >
                <span>Synthesize</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Progress bar simulation for synthesize status */}
            {/* Progress bar simulation for synthesize status */}
            {isSynthesizing && (
              <div className="space-y-4">
                <div className={`border p-3.5 rounded-xl font-mono text-xs space-y-2 ${
                  darkMode ? "bg-[#110f0e] border-[#2c2621] text-[#c4b9ae]" : "bg-[#fcfbf9] border-[#e2dcd0] text-slate-700"
                }`}>
                  <div className={`flex justify-between font-bold text-[10px] ${darkMode ? "text-[#faf9f6]" : "text-slate-900"}`}>
                    <span className="flex items-center gap-1.5">
                      <RotateCw className="w-3 h-3 animate-spin text-[#128a5e]" />
                      SWEEPING REGISTRIES (IMF, WORLD BANK)...
                    </span>
                    <span>{synthProgress}%</span>
                  </div>
                  <div className={`h-1 rounded-full overflow-hidden ${darkMode ? "bg-[#1a1714]" : "bg-slate-200"}`}>
                    <div className="h-full bg-[#128a5e] transition-all duration-100 rounded-full" style={{ width: `${synthProgress}%` }} />
                  </div>
                  <div className={`text-[9px] flex justify-between ${darkMode ? "text-[#8e857c]" : "text-slate-400"}`}>
                    <span>Normalizing unit conflicts: (%) as index basis</span>
                    <span>Processed in { (synthProgress * 0.45).toFixed(1) }s</span>
                  </div>
                </div>

                {/* Animated Aligned live data output */}
                <div className={`overflow-hidden border rounded-xl p-4 transition-all duration-500 ${
                  darkMode ? "bg-[#13110f] border-[#2c2621]/80" : "bg-[#fcfbf9]/60 border-[#e2dcd0]/80"
                } ${synthProgress > 5 ? "opacity-100 max-h-[400px] translate-y-0" : "opacity-0 max-h-0 translate-y-2"}`}>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Table Side */}
                    <div className="md:col-span-7 space-y-2">
                      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-slate-400">
                        <span>ALIGNED TIME-SERIES</span>
                        <span className="text-[#128a5e] font-bold">IMF OUTPUT RECORD</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full font-sans text-left border-collapse text-[11px]">
                          <thead>
                            <tr className={`border-b text-[9px] font-mono font-bold tracking-wider ${
                              darkMode ? "border-[#2c2621] text-[#8e857c]" : "border-slate-250 text-slate-400"
                            }`}>
                              <th className="pb-1.5 pr-4">YEAR</th>
                              <th className="pb-1.5 pr-4">GBR</th>
                              <th className="pb-1.5 pr-4">CHN</th>
                              <th className="pb-1.5 pr-4">IND</th>
                              <th className="pb-1.5">USA</th>
                            </tr>
                          </thead>
                          <tbody className={`font-mono divide-y ${
                            darkMode ? "text-[#faf9f6]/95 divide-[#2c2621]/30" : "text-slate-800 divide-slate-100"
                          }`}>
                            {[
                              { year: "2020", gbr: "0.90%", chn: "2.50%", ind: "6.20%", usa: "1.30%", thresh: 10 },
                              { year: "2021", gbr: "2.60%", chn: "0.90%", ind: "5.50%", usa: "4.70%", thresh: 25 },
                              { year: "2022", gbr: "9.10%", chn: "2.00%", ind: "6.60%", usa: "8.00%", thresh: 40 },
                              { year: "2023", gbr: "7.30%", chn: "0.20%", ind: "5.40%", usa: "4.10%", thresh: 55 },
                              { year: "2024", gbr: "2.50%", chn: "0.20%", ind: "4.60%", usa: "3.00%", thresh: 70 },
                              { year: "2025", gbr: "3.40%", chn: "0.00%", ind: "2.10%", usa: "2.70%", thresh: 85 },
                              { year: "2026", gbr: "3.20%", chn: "1.20%", ind: "4.70%", usa: "3.20%", thresh: 95 },
                            ].map((row, idx) => {
                              const visible = synthProgress >= row.thresh;
                              return (
                                <tr 
                                  key={idx} 
                                  className={`transition-all duration-300 ${
                                    visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
                                  }`}
                                >
                                  <td className={`py-1.5 font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{row.year}</td>
                                  <td className="py-1.5 text-blue-500">{row.gbr}</td>
                                  <td className="py-1.5 text-amber-500">{row.chn}</td>
                                  <td className="py-1.5 text-emerald-500">{row.ind}</td>
                                  <td className="py-1.5 text-rose-500">{row.usa}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Sparks Mini Chart Side */}
                    <div className="md:col-span-5 flex flex-col justify-between border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4 border-slate-200/50 dark:border-slate-850/50">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold font-sans ${darkMode ? "text-white" : "text-slate-800"}`}>
                            SPARKLINE GRAPH
                          </span>
                          <div className="flex items-center gap-1 font-mono text-[7px] uppercase font-bold text-slate-400">
                            <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-blue-500" /> GBR</span>
                            <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-amber-500" /> CHN</span>
                            <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-emerald-500" /> IND</span>
                            <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-rose-500" /> USA</span>
                          </div>
                        </div>

                        <div className={`h-24 relative border rounded-lg overflow-hidden pt-1.5 transition-colors ${
                          darkMode ? "bg-[#110f0e] border-[#2c2621]/45" : "bg-slate-100/30 border-slate-200"
                        }`}>
                          <div className={`absolute inset-x-0 top-1/4 border-b border-dashed ${darkMode ? "border-[#2c2621]/30" : "border-slate-200/60"}`} />
                          <div className={`absolute inset-x-0 top-2/4 border-b border-dashed ${darkMode ? "border-[#2c2621]/30" : "border-slate-200/60"}`} />
                          <div className={`absolute inset-x-0 top-3/4 border-b border-dashed ${darkMode ? "border-[#2c2621]/30" : "border-slate-200/60"}`} />

                          <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                            {/* Animated paths based on synthProgress */}
                            {synthProgress >= 15 && (
                              <path 
                                d="M 5 32 L 20 26 L 35 5 L 50 11 L 65 27 L 80 24 L 95 24" 
                                stroke="#3b82f6" 
                                strokeWidth="1.2" 
                                fill="none" 
                                strokeDasharray="150"
                                strokeDashoffset={150 - Math.min(150, (synthProgress - 15) * 2.22)}
                                className="transition-all duration-300"
                              />
                            )}
                            {synthProgress >= 35 && (
                              <path 
                                d="M 5 27 L 20 32 L 35 28 L 50 34 L 65 34 L 80 35 L 95 31" 
                                stroke="#d97706" 
                                strokeWidth="1.2" 
                                fill="none" 
                                strokeDasharray="150"
                                strokeDashoffset={150 - Math.min(150, (synthProgress - 35) * 2.72)}
                                className="transition-all duration-300"
                              />
                            )}
                            {synthProgress >= 55 && (
                              <path 
                                d="M 5 15 L 20 17 L 35 13 L 50 17 L 65 20 L 80 28 L 95 19" 
                                stroke="#10b981" 
                                strokeWidth="1.2" 
                                fill="none" 
                                strokeDasharray="150"
                                strokeDashoffset={150 - Math.min(150, (synthProgress - 55) * 4.28)}
                                className="transition-all duration-350 animate-pulse"
                              />
                            )}
                            {synthProgress >= 75 && (
                              <path 
                                d="M 5 31 L 20 20 L 35 9 L 50 21 L 65 25 L 80 26 L 95 24" 
                                stroke="#f43f5e" 
                                strokeWidth="1.2" 
                                fill="none" 
                                strokeDasharray="150"
                                strokeDashoffset={150 - Math.min(150, (synthProgress - 75) * 7.5)}
                                className="transition-all duration-300"
                              />
                            )}
                          </svg>
                          
                          <div className={`absolute bottom-0.5 inset-x-1.5 flex justify-between font-mono text-[7px] ${
                            darkMode ? "text-[#8e857c]" : "text-slate-400"
                          }`}>
                            <span>2020</span>
                            <span>2026</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[9px] text-[#128a5e] font-bold mt-1.5">
                        <Database className="w-3 h-3 animate-pulse" />
                        <span>SYNTHESIS COMPLETE AND ALIGNED</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section: Feature Anchors Selector */}
      <section id="about-target" className="scroll-mt-24 max-w-7xl mx-auto px-6 sm:px-8 py-10 text-center">
        <p className={`font-mono text-[10px] uppercase tracking-[0.25em] ${darkMode ? "text-[#8a7f75]" : "text-slate-400"}`}>
          Interactive Terminal Architecture
        </p>
        
        <div className={`mt-4 inline-flex p-1.5 rounded-2xl gap-2 shadow-inner ${
          darkMode ? "bg-[#181512] border border-[#2c2621]" : "bg-[#f4efe5] border border-[#dcd6c9]"
        }`}>
          <button 
            onClick={() => setActiveTab("step1")}
            onMouseEnter={() => setActiveTab("step1")}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold font-mono tracking-wider transition-all duration-200 cursor-pointer border-none ${
              activeTab === "step1" 
                ? "bg-[#128a5e] text-white shadow-md shadow-[#128a5e]/15" 
                : `${darkMode ? "text-[#8a7f75] hover:text-[#faf9f6]" : "text-slate-600 hover:text-slate-950"} bg-transparent`
            }`}
          >
            01 . DYNAMIC SYNTHESIS
          </button>
          <button 
            onClick={() => setActiveTab("step2")}
            onMouseEnter={() => setActiveTab("step2")}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold font-mono tracking-wider transition-all duration-200 cursor-pointer border-none ${
              activeTab === "step2" 
                ? "bg-[#128a5e] text-white shadow-md shadow-[#128a5e]/15" 
                : `${darkMode ? "text-[#8a7f75] hover:text-[#faf9f6]" : "text-slate-600 hover:text-slate-950"} bg-transparent`
            }`}
          >
            02 . MULTIVARIATE INTERVIEW
          </button>
          <button 
            onClick={() => setActiveTab("step3")}
            onMouseEnter={() => setActiveTab("step3")}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold font-mono tracking-wider transition-all duration-200 cursor-pointer border-none ${
              activeTab === "step3" 
                ? "bg-[#128a5e] text-white shadow-md shadow-[#128a5e]/15" 
                : `${darkMode ? "text-[#8a7f75] hover:text-[#faf9f6]" : "text-slate-600 hover:text-slate-950"} bg-transparent`
            }`}
          >
            03 . RECURRENT SCHEDULING
          </button>
        </div>
      </section>

      {/* Feature Demos built from real terminal screens */}
      <section id="features-interactive" className="max-w-7xl mx-auto px-6 sm:px-8 py-12 space-y-36">
        
        {/* Step 1: Synthesis Engine Demonstration */}
        <div 
          onMouseEnter={() => setActiveTab("step1")}
          onClick={() => setActiveTab("step1")}
          className={`grid grid-cols-1 lg:grid-cols-12 gap-12 items-center transition-all duration-500 cursor-pointer ${
            activeTab !== "step1" ? "opacity-60 scale-[0.99] filter saturate-50 hover:opacity-100" : "opacity-100"
          }`}
        >
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[#128a5e] font-mono text-[10px] uppercase tracking-widest block font-bold">CAPABILITY 01 • SYNTHESIS & RESOLUTION</span>
            <h2 className={`text-3xl sm:text-4xl font-semibold leading-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
              A unified output grid for messy records.
            </h2>
            <p className={`text-sm leading-relaxed ${darkMode ? "text-[#c4b9ae]" : "text-slate-600"}`}>
              When variables are described, DataMint searches real institutional sources, solves missing gaps, resolves structural conflicts, and displays formatted results in standard clean tabular catalogs.
            </p>
            <div className={`space-y-3 font-medium text-xs ${darkMode ? "text-[#faf9f6]/80" : "text-slate-700"}`}>
              <div className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#128a5e]" />
                <span>Simultaneous compilation of GBR, CHN, IND, and USA indicators</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#128a5e]" />
                <span>Automated frequency alignment (Monthly, Annual, Daily)</span>
              </div>
            </div>
          </div>

          <div className={`lg:col-span-7 border rounded-2xl p-5 shadow-2xl overflow-hidden text-xs transition-colors ${
            darkMode ? "bg-[#151311] border-[#2c2621]" : "bg-white border-slate-200"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
              darkMode ? "border-[#2c2621]" : "border-slate-100"
            }`}>
              <span className={`font-mono text-[10px] uppercase px-2.5 py-1 rounded ${
                darkMode ? "text-[#8e857c] bg-[#1d1916]" : "text-slate-500 bg-slate-50"
              }`}>Structured Output Preview</span>
              <span className="text-[10px] text-[#128a5e] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#128a5e] rounded-full animate-ping" />
                IMF AUDIT • ACTIVE
              </span>
            </div>

            <div className="w-full overflow-x-auto select-none">
              <table className="w-full font-sans text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[10px] font-mono font-bold tracking-wider ${
                    darkMode ? "border-[#2c2621] text-[#8e857c]" : "border-slate-100 text-slate-400"
                  }`}>
                    <th className="pb-2.5 pr-4">YEAR</th>
                    <th className="pb-2.5 pr-4">GBR</th>
                    <th className="pb-2.5 pr-4">CHN</th>
                    <th className="pb-2.5 pr-4">IND</th>
                    <th className="pb-2.5">USA</th>
                  </tr>
                </thead>
                <tbody className={`font-mono text-[11px] divide-y ${
                  darkMode ? "text-[#faf9f6]/95 divide-[#2c2621]/30" : "text-slate-800 divide-slate-100"
                }`}>
                  <tr>
                    <td className={`py-2 font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>1980</td>
                    <td className="py-2">16.80</td>
                    <td className="py-2">-</td>
                    <td className="py-2">11.30</td>
                    <td className="py-2">13.50</td>
                  </tr>
                  <tr>
                    <td className={`py-2 font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>1981</td>
                    <td className="py-2">12.20</td>
                    <td className="py-2">2.50</td>
                    <td className="py-2">12.70</td>
                    <td className="py-2">10.40</td>
                  </tr>
                  <tr>
                    <td className={`py-2 font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>1982</td>
                    <td className="py-2">8.60</td>
                    <td className="py-2">2.00</td>
                    <td className="py-2">7.70</td>
                    <td className="py-2">6.20</td>
                  </tr>
                  <tr>
                    <td className={`py-2 font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>1983</td>
                    <td className="py-2">4.60</td>
                    <td className="py-2">1.50</td>
                    <td className="py-2">12.60</td>
                    <td className="py-2">3.20</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={`mt-4 pt-3 border-t flex justify-between items-center text-[10px] font-mono ${
              darkMode ? "border-[#2c2621] text-[#8e857c]" : "border-slate-100 text-slate-400"
            }`}>
              <span>Showing 1 to 4 of 52 records</span>
              <span className="text-[#128a5e] font-sans font-bold">Excel-aligned dataset output</span>
            </div>
          </div>
        </div>

        {/* Step 2: Multivariate Visualizations */}
        <div 
          onMouseEnter={() => setActiveTab("step2")}
          onClick={() => setActiveTab("step2")}
          className={`grid grid-cols-1 lg:grid-cols-12 gap-12 items-center transition-all duration-500 cursor-pointer ${
            activeTab !== "step2" ? "opacity-60 scale-[0.99] filter saturate-50 hover:opacity-100" : "opacity-100"
          }`}
        >
          <div className={`lg:col-span-7 border rounded-2xl p-5 shadow-2xl relative order-last lg:order-first transition-colors ${
            darkMode ? "bg-[#151311] border-[#2c2621]" : "bg-white border-slate-200"
          }`}>
            
            {/* Visualisasi Pivot Multivariat heading bar */}
            <div className={`flex items-center justify-between border-b pb-3 mb-4 select-none ${
              darkMode ? "border-[#2c2621]" : "border-slate-100"
            }`}>
              <div className="flex items-center gap-2">
                <LineChart className="w-4 h-4 text-[#128a5e]" />
                <span className={`text-xs font-semibold font-sans ${darkMode ? "text-white" : "text-slate-800"}`}>
                  Visualisasi Pivot Multivariat
                </span>
              </div>
              <div className={`flex p-0.5 rounded-lg border font-mono text-[9px] uppercase font-bold ${
                darkMode ? "bg-[#1a1714] border-[#2d2722]/60 text-[#8a7f75]" : "bg-slate-100 border-slate-200 text-slate-500"
              }`}>
                <span className="bg-[#128a5e] text-white px-2.5 py-1 rounded">LINE</span>
                <span className="px-2.5 py-1">BAR</span>
                <span className="px-2.5 py-1">DUAL</span>
              </div>
            </div>

            {/* Custom line plot canvas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold font-sans ${darkMode ? "text-white" : "text-slate-800"}`}>
                  Normalized Time-Series Index
                </span>
                <div className="flex items-center gap-2 font-mono text-[8px] uppercase">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" /> GBR</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" /> CHN</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> IND</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" /> USA</span>
                </div>
              </div>

              {/* Vector path line preview */}
              <div className={`h-40 relative border rounded-xl overflow-hidden pt-3 transition-colors ${
                darkMode ? "bg-[#13110f] border-[#2c2621]/45" : "bg-slate-50 border-slate-100"
              }`}>
                <div className={`absolute inset-x-0 top-1/4 border-b ${darkMode ? "border-[#2c2621]/20" : "border-slate-200/50"}`} />
                <div className={`absolute inset-x-0 top-2/4 border-b ${darkMode ? "border-[#2c2621]/20" : "border-slate-200/50"}`} />
                <div className={`absolute inset-x-0 top-3/4 border-b ${darkMode ? "border-[#2c2621]/20" : "border-slate-200/50"}`} />

                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path d="M 0 10 Q 25 18, 50 25 T 100 20" stroke="#3b82f6" strokeWidth="0.85" fill="none" />
                  <path d="M 0 32 Q 25 24, 50 12 T 100 28" stroke="#fbbf24" strokeWidth="0.85" fill="none" />
                  <path d="M 0 18 Q 25 28, 50 16 T 100 26" stroke="#10b981" strokeWidth="0.85" fill="none" />
                  <path d="M 0 25 Q 25 15, 50 22 T 100 18" stroke="#f43f5e" strokeWidth="0.85" fill="none" strokeDasharray="1.5 1" />
                </svg>

                <div className={`absolute bottom-1 inset-x-2 flex justify-between font-mono text-[8px] ${
                  darkMode ? "text-[#8e857c]" : "text-slate-400"
                }`}>
                  <span>1980</span>
                  <span>1995</span>
                  <span>2010</span>
                  <span>2025</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <span className="text-[#128a5e] font-mono text-[10px] uppercase tracking-widest block font-bold">CAPABILITY 02 • VISUAL ASSESSMENT</span>
            <h2 className={`text-3xl sm:text-4xl font-semibold leading-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
              Aesthetically paired analytical charting.
            </h2>
            <p className={`text-sm leading-relaxed ${darkMode ? "text-[#c4b9ae]" : "text-slate-600"}`}>
              Pivot continuous variables across multiple jurisdictions on the fly. Switch instantaneously between single charts, bar comparisons, or integrated dual ratios directly inside the visual canvas helper.
            </p>
            <button 
              onClick={() => onGetStarted("register")}
              className="px-4 py-2 border border-[#128a5e]/50 hover:bg-[#128a5e]/10 text-xs font-semibold rounded-lg bg-transparent transition-all cursor-pointer flex items-center gap-1.5 hover:text-[#128a5e]"
            >
              <span>Explore Visualizer</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Step 3: Recurrent Scheduling */}
        <div 
          onMouseEnter={() => setActiveTab("step3")}
          onClick={() => setActiveTab("step3")}
          className={`grid grid-cols-1 lg:grid-cols-12 gap-12 items-center transition-all duration-500 cursor-pointer ${
            activeTab !== "step3" ? "opacity-60 scale-[0.99] filter saturate-50 hover:opacity-100" : "opacity-100"
          }`}
        >
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[#128a5e] font-mono text-[10px] uppercase tracking-widest block font-bold">CAPABILITY 03 • MONITORS & INTERVALS</span>
            <h2 className={`text-3xl sm:text-4xl font-semibold leading-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
              Active query monitors.
            </h2>
            <p className={`text-sm leading-relaxed ${darkMode ? "text-[#c4b9ae]" : "text-slate-600"}`}>
              Lock queries into dynamic schedule pipelines. DataMint maintains standard scanning intervals to execute the searches, download the latest figures, and compile direct economic catalogs asynchronously.
            </p>
            <div className={`p-4 border rounded-xl space-y-2.5 transition-colors ${
              darkMode ? "bg-[#181512] border-[#2d2722]/70" : "bg-white border-slate-200"
            }`}>
              <span className={`text-[9px] font-mono uppercase block tracking-wider ${darkMode ? "text-[#8a7f75]" : "text-slate-400"}`}>
                MEMBER WORKFLOWS
              </span>
              <p className={`text-xs font-serif italic ${darkMode ? "text-[#ede7db]" : "text-slate-700"}`}>
                "Keep Microsoft Stock Prices & Global IMF Debt variables automatically updated on a monthly sweep frequency."
              </p>
            </div>
          </div>

          <div className={`lg:col-span-7 border rounded-2xl p-5 shadow-2xl space-y-4 transition-colors ${
            darkMode ? "bg-[#151311] border-[#2c2621]" : "bg-white border-slate-200"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              darkMode ? "border-[#2c2621]" : "border-slate-100"
            }`}>
              <span className={`font-mono text-[10px] ${darkMode ? "text-[#8e857c]" : "text-slate-400"}`}>Active Query Monitors • Scheduled</span>
              <span className="text-[9.5px] font-mono text-[#128a5e] font-bold uppercase">Automated Sweeps</span>
            </div>

            {/* Table of monitors */}
            <div className="space-y-2.5 text-xs">
              <div className={`p-3 rounded-xl border flex justify-between items-center gap-4 transition-colors ${
                darkMode ? "bg-[#1d1916]/80 border-[#2c2621]" : "bg-slate-50 border-slate-100"
              }`}>
                <div className="min-w-0">
                  <div className={`font-bold truncate ${darkMode ? "text-white" : "text-slate-900"}`}>MICROSOFT STOCK PRICE DATA</div>
                  <div className={`text-[10px] font-mono mt-0.5 truncate ${darkMode ? "text-[#8a7f75]" : "text-slate-400"}`}>
                    "fetch microsoft stock price data for january 2026"
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    darkMode ? "text-[#c4b9ae] bg-[#2d2722]" : "text-slate-600 bg-slate-200/75"
                  }`}>MONTHLY</span>
                  <span className="text-[9px] font-mono text-[#128a5e] bg-[#128a5e]/15 px-2 py-0.5 rounded font-bold uppercase">ACTIVE</span>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex justify-between items-center gap-4 transition-colors ${
                darkMode ? "bg-[#1d1916]/80 border-[#2c2621]" : "bg-slate-50 border-slate-100"
              }`}>
                <div className="min-w-0">
                  <div className={`font-bold truncate ${darkMode ? "text-white" : "text-slate-900"}`}>UK, China, India, US Inflation Projections</div>
                  <div className={`text-[10px] font-mono mt-0.5 truncate ${darkMode ? "text-[#8a7f75]" : "text-slate-400"}`}>
                    "UK, China, India, US inflation projection data from IMF"
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    darkMode ? "text-[#c4b9ae] bg-[#2d2722]" : "text-slate-600 bg-slate-200/75"
                  }`}>MONTHLY</span>
                  <span className="text-[9px] font-mono text-[#128a5e] bg-[#128a5e]/15 px-2 py-0.5 rounded font-bold uppercase">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW SECTION: READY TO USE EXCEL DOWNLOAD WORKSPACE */}
      <section id="excel-download-section" className={`scroll-mt-24 max-w-7xl mx-auto px-6 sm:px-8 py-24 border-t transition-colors ${
        darkMode ? "border-[#2d2722]/35" : "border-slate-200"
      }`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-widest text-[#128a5e] bg-[#128a5e]/10 px-3 py-1 rounded-full">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel Workspace Integration
            </span>
            <h2 className={`text-3xl sm:text-4xl font-semibold tracking-tight font-sans leading-tight ${
              darkMode ? "text-white" : "text-slate-900"
            }`}>
              Ready-to-use Excel download.
            </h2>
            <p className={`text-sm leading-relaxed ${darkMode ? "text-[#c4b9ae]" : "text-slate-600"}`}>
              Stop manual copying and pasting. DataMint consolidates divergent timeseries records from international sources directly into pristine, formula-aligned, and cleanly formatted download-ready files.
            </p>

            <div className="space-y-4 font-sans">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded bg-[#128a5e]/15 flex items-center justify-center text-[#128a5e] shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className={`text-xs font-bold leading-tight ${darkMode ? "text-white" : "text-slate-800"}`}>Pristine Table Alignment</h4>
                  <p className={`text-[11px] mt-0.5 leading-relaxed ${darkMode ? "text-[#8e857c]" : "text-slate-500"}`}>
                    Perfect side-by-side matrices aligned down to equivalent calendar dates natively.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded bg-[#128a5e]/15 flex items-center justify-center text-[#128a5e] shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className={`text-xs font-bold leading-tight ${darkMode ? "text-white" : "text-slate-800"}`}>Formula & Charts-Ready Columns</h4>
                  <p className={`text-[11px] mt-0.5 leading-relaxed ${darkMode ? "text-[#8e857c]" : "text-slate-500"}`}>
                    Units sorted and numerical variables pre-normalized for custom charts, Excel analysis, or database ingestion.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <button 
                onClick={downloadSampleExcel}
                className="w-full sm:w-auto px-6 py-3 bg-[#128a5e] hover:bg-[#159e6c] text-white text-xs font-bold rounded-lg shadow-lg shadow-[#128a5e]/20 transition-all cursor-pointer flex items-center justify-center gap-2 border-none"
              >
                <Download className="w-4 h-4" />
                <span>Test Download Sample Aligned Catalog (.csv)</span>
              </button>
              <div className={`text-[10px] font-mono leading-none ${darkMode ? "text-[#8e857c]" : "text-slate-400"}`}>
                *Exports instant structured schema compatible with Microsoft Excel, Google Sheets, or Numbers.
              </div>
            </div>
          </div>

          {/* Visual Interactive Excel Mockup Container */}
          <div className="lg:col-span-7">
            <div className={`border rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden transition-colors ${
              darkMode ? "bg-[#151311] border-[#2c2621]" : "bg-white border-slate-200"
            }`}>
              {/* Title Bar simulating Windows Excel Header */}
              <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-lg bg-[#128a5e] flex items-center justify-center text-white font-bold text-[8px]">X</div>
                  <span className={`text-[11px] font-semibold ${darkMode ? "text-[#faf9f6]" : "text-slate-700"}`}>
                    Microsoft Excel - DataMint_Macro_Aligned.csv [Read-Only]
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#128a5e] font-bold text-right">AUTO ALIGNED</span>
              </div>

              {/* Excel Grid headers */}
              <div className="grid grid-cols-12 font-mono text-[9px] uppercase font-bold text-slate-400 tracking-wider text-center border-b pb-2 border-slate-200/40 mb-2">
                <div className="col-span-2 text-left">A (YEAR)</div>
                <div className="col-span-3 text-left">B (COUNTRY)</div>
                <div className="col-span-4 text-left">C (INDICATOR)</div>
                <div className="col-span-3 text-right">D (VALUE)</div>
              </div>

              {/* Excel Rows matching standard data structures inside the terminal */}
              <div className="space-y-1 font-mono text-[11px]">
                {[
                  { yr: "2020", co: "United Kingdom", ind: "IMF Inflation Rate", val: "2.5%", isEven: true },
                  { yr: "2021", co: "United Kingdom", ind: "IMF Inflation Rate", val: "3.2%", isEven: false },
                  { yr: "2022", co: "United Kingdom", ind: "IMF Inflation Rate", val: "7.9%", isEven: true, highlight: true },
                  { yr: "2023", co: "United Kingdom", ind: "IMF Inflation Rate", val: "6.8%", isEven: false },
                  { yr: "2024", co: "United Kingdom", ind: "IMF Inflation Rate", val: "3.0%", isEven: true },
                  { yr: "2020", co: "Indonesia", ind: "BI-Rate Reference", val: "3.75%", isEven: false },
                  { yr: "2024", co: "Indonesia", ind: "BI-Rate Reference", val: "6.25%", isEven: true }
                ].map((row, idx) => (
                  <div 
                    key={idx} 
                    className={`grid grid-cols-12 py-1.5 px-3 rounded-md transition-colors border ${
                      row.highlight 
                        ? `bg-[#128a5e]/15 border-[#128a5e]/25 text-[#128a5e] font-semibold font-sans` 
                        : `border-transparent ${
                            row.isEven
                              ? (darkMode ? "bg-[#1d1916] text-[#c4b9ae]" : "bg-slate-50 text-slate-700")
                              : (darkMode ? "bg-transparent text-[#faf9f6]/80" : "bg-transparent text-slate-800")
                          }`
                    }`}
                  >
                    <div className="col-span-2 font-bold">{row.yr}</div>
                    <div className="col-span-3 font-sans truncate">{row.co}</div>
                    <div className="col-span-4 pl-1 font-sans truncate text-slate-400">{row.ind}</div>
                    <div className={`col-span-3 text-right font-semibold ${row.highlight ? "text-[#128a5e]" : "text-emerald-600"}`}>
                      {row.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status Line */}
              <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between text-[10px] font-sans">
                <span className="text-slate-400 font-mono">10 Normalized Rows Processed</span>
                <span className="text-[#128a5e] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#128a5e] rounded-full" />
                  Excel Workbook Friendly
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sources Index Panel - beautiful visual board */}
      <section id="sources-index" className={`scroll-mt-24 max-w-7xl mx-auto px-6 sm:px-8 py-20 border-t transition-colors ${
        darkMode ? "border-[#2d2722]/30" : "border-slate-200"
      }`}>
        <div className="max-w-xl mb-12">
          <span className="text-[#128a5e] text-xs font-mono font-bold uppercase tracking-wider bg-[#128a5e]/10 px-3 py-1 rounded">
            DATA MINT REGISTRIES
          </span>
          <h2 className={`text-3xl sm:text-5xl font-semibold tracking-tight mt-4 leading-tight ${
            darkMode ? "text-white" : "text-slate-900"
          }`}>
            Comprehensive indices. Built to expand.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {institutionalSources.map((source, idx) => {
            const Icon = source.icon;
            return (
              <div 
                key={idx}
                className={`p-6 border transition-all duration-300 flex flex-col justify-between min-h-[180px] group relative rounded-xl ${
                  darkMode 
                    ? "bg-[#161412] border-[#2c2621] hover:border-[#128a5e]/40" 
                    : "bg-white border-[#e5ded4] hover:border-[#128a5e]/40 shadow-sm"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors border ${
                  darkMode 
                    ? "bg-[#201b17] group-hover:bg-[#128a5e]/10 border-[#2c2621]/80 group-hover:border-[#128a5e]/20" 
                    : "bg-slate-50 group-hover:bg-[#128a5e]/5 border-slate-200 group-hover:border-[#128a5e]/20"
                }`}>
                  <Icon className="w-4 h-4 text-[#128a5e]" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold mt-4 ${darkMode ? "text-white" : "text-slate-900"}`}>{source.name}</h4>
                  <p className={`text-[10px] font-mono mt-1 ${darkMode ? "text-[#8a7f75]" : "text-slate-400"}`}>{source.category}</p>
                  <p className={`text-[11px] mt-2 leading-relaxed ${darkMode ? "text-[#c4b9ae]" : "text-slate-500"}`}>{source.desc}</p>
                </div>
              </div>
            );
          })}

          {/* Static counter card */}
          <div className={`p-6 border flex flex-col items-center justify-center text-center rounded-xl ${
            darkMode ? "bg-[#1a1714] border-[#2c2621]" : "bg-[#f4efe5] border-[#dcd6c9]"
          }`}>
            <span className="w-2 h-2 rounded-full bg-[#128a5e] animate-ping mb-3" />
            <div className={`text-3xl font-serif font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>2,500+</div>
            <div className={`text-[10px] font-mono uppercase mt-1 ${darkMode ? "text-[#8a7f75]" : "text-slate-500"}`}>Macro Indicators</div>
            <button 
              onClick={() => onGetStarted("register")}
              className="mt-4 text-[11px] font-bold text-[#128a5e] tracking-wider hover:underline flex items-center gap-1 border-none bg-transparent cursor-pointer"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Structured CTA Bottom Container */}
      <section id="get-started-cta" className="max-w-4xl mx-auto px-6 py-28 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#128a5e]/10 rounded-full blur-3xl -z-10" />

        <div className={`border rounded-3xl p-8 sm:p-14 shadow-2xl space-y-6 transition-colors ${
          darkMode ? "bg-[#181512] border-[#2c2621]/80" : "bg-white border-[#e5ded4]"
        }`}>
          <Database className="w-10 h-10 text-[#128a5e] mx-auto" />
          
          <h2 className={`text-3xl sm:text-5xl font-semibold tracking-tight font-sans ${
            darkMode ? "text-white" : "text-slate-900"
          }`}>
            Ready to synthesize economic datasets?
          </h2>
          
          <p className={`text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed ${
            darkMode ? "text-[#c4b9ae]" : "text-slate-600"
          }`}>
            Enter queries, check indicators in real time, lock active schedules, and download beautiful aligned Excel tables for your institution workflows.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => onGetStarted("register")}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#128a5e] hover:bg-[#159e6c] text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer border-none flex items-center justify-center gap-2 group"
            >
              <span>Launch DataMint</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button 
              onClick={() => onGetStarted("login")}
              className={`w-full sm:w-auto px-8 py-3.5 border text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                darkMode 
                  ? "bg-[#1a1714] border-[#2c2621] hover:border-[#8a7f75]/30 text-white hover:bg-[#25201c]" 
                  : "bg-slate-50 border-slate-200 hover:border-slate-400 text-slate-800 hover:bg-slate-100"
              }`}
            >
            </button>
          </div>
        </div>
      </section>

      {/* Clean Traditional Footer */}
      <footer className="border-t border-[#2d2722]/15 py-12 text-center text-[#8e857c] text-xs max-w-7xl mx-auto px-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px]">
          <span>&copy; 2026 DataMint Corp. Pre-Stage Research Sandbox Facility.</span>
          <div className="flex items-center gap-4">
            <a href="#about-target" className={`transition-colors ${darkMode ? "hover:text-white" : "hover:text-slate-900"}`}>How It Works</a>
            <a href="#sources-index" className={`transition-colors ${darkMode ? "hover:text-white" : "hover:text-slate-900"}`}>Indicators Index</a>
            <span>•</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
