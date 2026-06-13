import { useState, useEffect, FormEvent } from "react";
import * as XLSX from "xlsx";
import { supabase, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from "./lib/supabase";
import { CustomSVGChart } from "./components/SVGCharts";
import { Dataset, SavedQuery, DownloadItem, DataSource } from "./types";
import LandingPage from "./components/LandingPage";
import logo from "./components/assets/logo.png";
import loading from "./components/assets/loading.png";
import { askDataMintAgent } from "./lib/appwrite";
import { 
  Search, 
  Database, 
  Home, 
  Globe, 
  CheckSquare, 
  Download, 
  Terminal, 
  Settings, 
  HelpCircle, 
  ArrowRight, 
  Save, 
  Copy, 
  Check, 
  Filter, 
  Calendar, 
  Activity, 
  Cpu, 
  RefreshCw, 
  PlusCircle, 
  ExternalLink, 
  User, 
  Sliders, 
  Sun,
  Moon,
  Menu, 
  X, 
  Trash2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  SearchCode,
  FileCheck2,
  AlertCircle,
  Play,
  Maximize2,
  Minimize2,
  LogOut,
  LogIn,
  UserPlus,
  BookOpen,
  Video,
  MessageSquare,
  FileText,
  Mail,
} from "lucide-react";

export default function App() {
   // Landing Page toggle state
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [launchProgress, setLaunchProgress] = useState<number>(0);
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      if (
        hash === "#terminal" ||
        hash === "#app" ||
        hash === "#dashboard"
      ) {
        setShowLanding(false);
      } else {
        setShowLanding(true);
      }
    };

    handleHashChange();

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  const triggerLaunchTerminal = (mode: "login" | "register") => {
    setAuthMode(mode);
    setIsLaunching(true);
    setLaunchProgress(0);

    let current = 0;

    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 3) + 2;

      if (current >= 100) {
        current = 100;

        clearInterval(interval);

        setTimeout(() => {
          setIsLaunching(false);
          window.location.hash = "#terminal";
          setShowLanding(false);
        }, 200);
      }

      setLaunchProgress(current);
    }, 100);
  };
  // Navigation tabs state
  const [currentTab, setCurrentTab] = useState<string>("home");
  
  // App-wide data states (persisting in-memory from backend)
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  
  // Dynamic Data Sources states
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const onlineSources = dataSources.filter(
    s => s.status === "Healthy"
  ).length;

  const onlinePercentage =
    dataSources.length > 0
      ? ((onlineSources / dataSources.length) * 100).toFixed(1)
      : "0";
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [newSourceName, setNewSourceName] = useState<string>("");
  const [newSourceCode, setNewSourceCode] = useState<string>("");
  const [newSourceUrl, setNewSourceUrl] = useState<string>("");
  const [newSourceType, setNewSourceType] = useState<string>("JSON");
  const [newSourceCategory, setNewSourceCategory] = useState<string>("National");
  const [newSourceDesc, setNewSourceDesc] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null);
  
  // Query input and search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeQueryData, setActiveQueryData] = useState<Dataset | null>(null);
  const [isQueryRunning, setIsQueryRunning] = useState<boolean>(false);
  const [queryProgressStep, setQueryProgressStep] = useState<number>(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<"line" | "bar" | "dual">("line");

  // Fullscreen & Pagination States for high fidelity preview
  const [isFullscreenData, setIsFullscreenData] = useState<boolean>(false);
  const [inlinePage, setInlinePage] = useState<number>(1);
  const [inlineLimit, setInlineLimit] = useState<number>(20); // Default to 20!
  const [fullscreenPage, setFullscreenPage] = useState<number>(1);
  const [fullscreenLimit, setFullscreenLimit] = useState<number>(20); // Default to 20!

  // Sorting, Table Filter and Theme state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [tableFilter, setTableFilter] = useState<string>("");
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(true);
  const [obscuredApiKey, setObscuredApiKey] = useState<string>("");
  const [newApiKey, setNewApiKey] = useState<string>("");
  const [savingApiKey, setSavingApiKey] = useState<boolean>(false);
  const [apiSaveSuccess, setApiSaveSuccess] = useState<boolean>(false);
  const [apiSaveError, setApiSaveError] = useState<string | null>(null);

  // Sync dark mode class with root document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Interactive feedback triggers (toasts/copy success states)
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [profileSuccess, setProfileSuccess] = useState<boolean>(false);

  // Supabase Authentication state variables
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [signUpFirstName, setSignUpFirstName] = useState<string>("");
  const [signUpLastName, setSignUpLastName] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authDriver, setAuthDriver] = useState<string>(() => localStorage.getItem("auth_driver") || "supabase");
  const [authShowFallback, setAuthShowFallback] = useState<boolean>(false);

  // Settings state variables
  const [firstName, setFirstName] = useState<string>("Fikri");
  const [lastName, setLastName] = useState<string>("Afandi");
  const [researcherEmail, setResearcherEmail] = useState<string>("researcher@institution.edu");
  const [researcherOrg, setResearcherOrg] = useState<string>("Economic Research Institute");
  const [researcherName, setResearcherName] = useState<string>("Fikri Afandi");
  const [researcherRole, setResearcherRole] = useState<string>("Lead Economist");

  // New Preferences and Export Default states to match user's settings screenshot
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [autoSaveQueries, setAutoSaveQueries] = useState<boolean>(true);
  const [weeklyReports, setWeeklyReports] = useState<boolean>(false);
  const [defaultExportFormat, setDefaultExportFormat] = useState<string>("Excel (.xlsx)");
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);

  // API Playground states
  const [apiConsoleOutput, setApiConsoleOutput] = useState<string>("{\n  \"status\": \"idle\",\n  \"instructions\": \"Click 'Execute API Request' to synthesize historical indicators.\"\n}");
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);
  const [apiActiveTab, setApiActiveTab] = useState<"rest" | "python" | "response">("rest");

  // Help hub search state
  const [docSearchQuery, setDocSearchQuery] = useState<string>("");
  const [activeHelpArticle, setActiveHelpArticle] = useState<any | null>(null);
  const [isFullscreenArticle, setIsFullscreenArticle] = useState<boolean>(false);

  // Authenticate session on startup
  const checkSession = async () => {
    try {
      setAuthLoading(true);
      const savedDriver = "supabase";
      setAuthDriver("supabase");

      // Supabase Mode
      if (!isSupabaseConfigured()) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }

      const { data: { session }, error } = await supabase!.auth.getSession();
      if (error) throw error;

      if (session && session.user) {
        const user = session.user;
        setCurrentUser(user);
        
        setResearcherEmail(user.email || "");
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "Fikri Afandi";
        setResearcherName(fullName);
        const parts = fullName.split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
        
        setResearcherOrg(user.user_metadata?.organization || "Economic Research Institute");
        setResearcherRole(user.user_metadata?.role || "Lead Economist");
        setEmailNotifications(user.user_metadata?.emailNotifications !== false);
        setAutoSaveQueries(user.user_metadata?.autoSaveQueries !== false);
        setWeeklyReports(!!user.user_metadata?.weeklyReports);
        setDefaultExportFormat(user.user_metadata?.defaultExportFormat || "Excel (.xlsx)");
        setIncludeMetadata(user.user_metadata?.includeMetadata !== false);
      } else {
        setCurrentUser(null);
      }
    } catch (e: any) {
      console.log("No active Supabase session detected or connection error:", e);
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Initial Fetching of Saved Datasets and Queries from Backend
  useEffect(() => {
    fetchDatasets();
    fetchSavedQueries();
    fetchDownloads();
    fetchDataSources();
    fetchConfig();

    // Automatically log Supabase configuration state if active
    if (isSupabaseConfigured()) {
      console.log("Supabase is active at:", supabaseUrl);
    }
  }, []);

  const fetchDataSources = async () => {
    try {
      const res = await fetch("/api/data-sources");
      const data = await res.json();
      setDataSources(data);
    } catch (e) {
      console.error("Error loaded data sources", e);
    }
  };

  const handleRegisterSource = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSourceName || !newSourceCode || !newSourceUrl) {
      setFormError("Please fill out all required fields.");
      return;
    }
    setIsRegistering(true);
    setFormSuccess(null);
    setFormError(null);

    try {
      // 1. Validation check: Ping host via HEAD and perform GET API calling test in backend to bypass browser CORS constraints
      const validateRes = await fetch("/api/data-sources/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newSourceUrl })
      });

      if (!validateRes.ok) {
        const errData = await validateRes.json();
        setFormError(errData.error || "Pemeriksaan tautan gagal. Silakan verifikasi kembali URL institusi Anda.");
        setIsRegistering(false);
        return;
      }

      const valResult = await validateRes.json();

      // 2. Propose registration
      const res = await fetch("/api/data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSourceName,
          code: newSourceCode,
          type: newSourceType,
          url: newSourceUrl,
          category: newSourceCategory,
          description: newSourceDesc
        })
      });

      if (res.ok) {
        const result = await res.json();
        setFormSuccess(`Koneksi teruji sukses! ${newSourceName} berhasil diverifikasi & terdaftar.`);
        // reset fields
        setNewSourceName("");
        setNewSourceCode("");
        setNewSourceUrl("");
        setNewSourceDesc("");
        // refresh list
        fetchDataSources();
      } else {
        const errData = await res.json();
        setFormError(errData.error || "Gagal menyimpan sumber data baru.");
      }
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan jaringan atau validasi server. Coba beberapa saat lagi.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingSourceId(id);
    try {
      const res = await fetch(`/api/data-sources/${id}/test`, {
        method: "POST"
      });
      if (res.ok) {
        // Refresh sources to show updated pings
        fetchDataSources();
      }
    } catch (err) {
      console.error(err);
    } finally {
      // Small visual delay for nice presentation
      setTimeout(() => setTestingSourceId(null), 600);
    }
  };

  const handleDeleteDataSource = async (id: string) => {
    try {
      const res = await fetch(`/api/data-sources/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchDataSources();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setHasGeminiKey(!!data.hasGeminiKey);
      if (data.apiKey) {
        setObscuredApiKey(data.apiKey);
      } else {
        setObscuredApiKey("");
      }
    } catch (e) {
      console.error("Error loaded config", e);
    }
  };

  const handleSaveApiKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!newApiKey.trim()) {
      setApiSaveError("API Key cannot be empty.");
      return;
    }
    setSavingApiKey(true);
    setApiSaveSuccess(false);
    setApiSaveError(null);

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ apiKey: newApiKey })
      });

      if (res.ok) {
        setApiSaveSuccess(true);
        setNewApiKey("");
        await fetchConfig();
        setTimeout(() => setApiSaveSuccess(false), 3000);
      } else {
        const data = await res.json();
        setApiSaveError(data.error || "Failed to update Gemini API key.");
      }
    } catch (err: any) {
      setApiSaveError(err.message || "Network error. Please try again.");
    } finally {
      setSavingApiKey(false);
    }
  };

  const fetchDatasets = async () => {
    try {
      if (!supabase) return;

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("datasets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedDatasets = (data || []).map((row: any) => ({
        id: String(row.id),
        ...row.dataset
      }));

      setDatasets(mappedDatasets);

    } catch (e) {
      console.error("Error loaded datasets", e);
    }
  };

  const fetchSavedQueries = async () => {
    try {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("query_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedQueries = (data || []).map((row: any) => ({
        id: String(row.id),
        title: row.prompt,
        description: "Economic research query",
        timeAgo: new Date(row.created_at).toLocaleDateString(),
        frequency: "Manual",
        rawQuery: row.prompt
      }));

      setSavedQueries(mappedQueries);

    } catch (e) {
      console.error("Error loaded saved queries", e);
    }
  };

  const fetchDownloads = async () => {
    try {
      const res = await fetch("/api/downloads");
      const data = await res.json();
      setDownloads(data);
    } catch (e) {
      console.error("Error loaded downloads logs", e);
    }
  };

  // Run Economic dataset synthesis query
  // Run Economic dataset synthesis query
  // Run Economic dataset synthesis query
  // Run Economic dataset synthesis query
  const executeQuery = async (queryText?: string) => {
    // 🔥 TRICK MAUT: Cari element input di layar secara paksa berdasarkan placeholder/atributnya!
    let finalQuery = queryText?.trim();
    
    if (!finalQuery) {
      // 1. Coba cari pakai querySelector ke element input text DataMint lu
      const inputEl = document.querySelector('input[placeholder*="Describe the dataset"]') as HTMLInputElement;
      if (inputEl) {
        finalQuery = inputEl.value?.trim();
      }
    }
    
    if (!finalQuery && searchQuery) {
      finalQuery = searchQuery.trim();
    }
    
    console.log("🚀 CHECKPOINT 1 UTAMA: executeQuery dipicu! Teks Kueri:", finalQuery);
    
    if (!finalQuery) {
      console.warn("⚠️ Kueri bener-bener kosong, eksekusi dibatalkan.");
      return;
    }

    // Paksa set state biar UI tersinkronisasi sempurna sebelum nembak Appwrite
    setSearchQuery(finalQuery);
    setIsQueryRunning(true);
    setQueryProgressStep(0);
    setActiveQueryData(null);
    setQueryError(null);

    const stepInterval = setInterval(() => {
      setQueryProgressStep((prev) => (prev >= 4 ? 4 : prev + 1));
    }, 900);

    try {
      console.log("📡 CHECKPOINT 2: Terbang nembak Appwrite Functions Cloud dengan kueri:", finalQuery);
      
      // Kirim kueri yang berhasil ketodong tadi ke Appwrite SDK lu
      const data = await askDataMintAgent(finalQuery);
      
      console.log("✅ CHECKPOINT 3: Appwrite Merespons Sukses! Balikan data:", data);
      
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("query_history").insert({
            user_id: user.id,
            prompt: finalQuery,
            response: JSON.stringify(data)
          });
        }
      }
      
      clearInterval(stepInterval);
      setQueryProgressStep(4);
      
      setTimeout(() => {
        setActiveQueryData(data as Dataset);
        setInlinePage(1);
        setFullscreenPage(1);
        if (data.metadata) {
          addDownloadLog(data as Dataset);
        }
        setIsQueryRunning(false);
        setCurrentTab("home");
        console.log("🏁 FINISH: Data ter-render di bento grid!");
      }, 500);

    } catch (err: any) {
      console.error("❌ ERROR DI SEKTOR NETWORK/SDK:", err);
      clearInterval(stepInterval);
      setQueryError(err.message || "Gagal memproses kueri.");
      setIsQueryRunning(false);
    }
  };

  // Helper to add dynamic Excel history item
  const addDownloadLog = async (dataset: Dataset) => {
    try {
      const filename = `${dataset.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.xlsx`;
      await fetch("/api/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: filename,
          size: `${(dataset.data?.length * 0.4 + 2.5).toFixed(1)} KB`,
          format: "Excel"
        })
      });
      fetchDownloads();
    } catch (e) {
      console.error(e);
    }
  };

  // Real-world client-side physically triggered Excel (.xlsx) exporter
  // This produces a native Excel spreadsheet where numeric strings are converted
  // to native double-precision floats, allowing MS Excel (and other spreadsheet tools)
  // to render values perfectly (including commas/periods) customized to any regional setting (e.g. Indonesia).
  const triggerExcelDownload = (dataset: Dataset) => {
    if (!dataset || !dataset.data || dataset.data.length === 0) return;
    
    const worksheetData = dataset.data.map((row) => {
      const orderedRow: Record<string, any> = {};
      dataset.columns.forEach((col) => {
        const val = row[col];
        if (typeof val === "string") {
          // Remove potential thousands separators and trim
          const cleaned = val.replace(/,/g, "").trim();
          // Check if it's purely a formatted number, e.g. "1245.5" or "1058423"
          if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
            orderedRow[col] = parseFloat(cleaned);
            return;
          }
          // Also handle simple percentages, e.g. "5.3%" or "2.5%"
          if (/^-?\d+(\.\d+)?%$/.test(cleaned)) {
            const pctVal = parseFloat(cleaned.replace("%", "")) / 100;
            orderedRow[col] = pctVal;
            return;
          }
        }
        orderedRow[col] = val !== undefined ? val : "";
      });
      return orderedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData, { header: dataset.columns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DataMint Export");
    
    const targetFilename = `${dataset.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_export.xlsx`;
    XLSX.writeFile(workbook, targetFilename);
  };

  // Real-world copy dataset JSON values helper
  const triggerCopyJSON = (dataset: Dataset, idKey: string) => {
    navigator.clipboard.writeText(JSON.stringify(dataset, null, 2));
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const triggerCopyText = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Persists synthesized result dataset into custom sets
  const saveDatasetToCatalog = async (dataset: Dataset) => {
    try {
      if (!supabase) return;

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("User not logged in");
        return;
      }

      const { error } = await supabase
        .from("datasets")
        .insert([
          {
            user_id: user.id,
            title: dataset.title,
            dataset: dataset
          }
        ]);

      if (error) {
        console.error("INSERT ERROR:", error);
        return;
      }

      setSaveSuccess(true);

      fetchDatasets();

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

    } catch (e) {
      console.error("Save error:", e);
    }
  };

  // Deletes dataset
  const deleteDataset = async (id: string) => {
    try {
      const res = await fetch(`/api/datasets/${id}`, { method: "DELETE" });
      if (res.ok) fetchDatasets();
    } catch (e) {
      console.error(e);
    }
  };

  // Save new saved query benchmark
  const saveQueryBenchmark = async (title: string, rawQuery: string) => {
    try {
      await fetch("/api/saved-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, rawQuery, frequency: "Monthly" })
      });
      fetchSavedQueries();
    } catch (e) {
      console.error(e);
    }
  };

  // Delete saved query
 const deleteSavedQuery = async (id: string) => {
    try {
      const res = await fetch(`/api/saved-queries/${id}`, { method: "DELETE" });
      if (res.ok) fetchSavedQueries();
    } catch (e) {
      console.error(e);
    }
  };

  // Delete downloads log entry
  const deleteDownloadLog = async (id: string) => {
    try {
      const res = await fetch(`/api/downloads/${id}`, { method: "DELETE" });
      if (res.ok) fetchDownloads();
    } catch (e) {
      console.error(e);
    }
  };

  // Submits setting changes (Updates profile data/preferences in Supabase)
  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const combinedName = `${firstName} ${lastName}`.trim();
      setResearcherName(combinedName);
      
      if (currentUser) {
        // Supabase metadata update
        if (!isSupabaseConfigured()) {
          throw new Error("Supabase belum dikonfigurasi.");
        }

        const { data, error } = await supabase!.auth.updateUser({
          data: {
            full_name: combinedName,
            organization: researcherOrg,
            role: researcherRole,
            emailNotifications,
            autoSaveQueries,
            weeklyReports,
            defaultExportFormat,
            includeMetadata
          }
        });
        if (error) throw error;
        if (data.user) {
          setCurrentUser(data.user);
        }
      }
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to update user details", err);
      // Fallback update in state if update fails
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  };

  // Sign up/Register using Supabase
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword || !signUpFirstName || !signUpLastName) {
      setAuthError("Harap isi semua kolom pendaftaran.");
      return;
    }
    if (authPassword.length < 8) {
      setAuthError("Kata sandi harus minimal 8 karakter.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError(null);
      setAuthSuccess(null);
      
      const fullName = `${signUpFirstName} ${signUpLastName}`.trim();
      
      // Supabase Mode
      try {
        if (!isSupabaseConfigured()) {
          setAuthError("Supabase belum dikonfigurasi. Silakan hubungkan database Supabase Anda melalui formulir di bawah ini!");
          setAuthShowFallback(true);
          return;
        }

        const { data, error } = await supabase!.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: fullName,
              organization: "Economic Research Institute",
              role: "Researcher",
              emailNotifications: true,
              autoSaveQueries: true,
              weeklyReports: false,
              defaultExportFormat: "Excel (.xlsx)",
              includeMetadata: true
            }
          }
        });

        if (error) {
          throw error;
        }

        const user = data.user;
        // Note: Depending on project settings, user might require email confirmation, or be logged in directly.
        if (user) {
          setCurrentUser(user);
          setResearcherEmail(user.email || authEmail);
          setResearcherName(fullName);
          setFirstName(signUpFirstName);
          setLastName(signUpLastName);
          setAuthSuccess("Pendaftaran berhasil! Akun Anda telah terdaftar.");
          setAuthPassword("");
        } else {
          setAuthSuccess("Silakan periksa email Anda untuk mengonfirmasi pendaftaran akun.");
        }
      } catch (err: any) {
        console.error("Supabase registration failed", err);
        setAuthError(err.message || "Gagal membuat akun Supabase. Pastikan email unik dan format kata sandi terisi dengan benar.");
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setAuthError(err.message || "Gagal membuat akun.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign In/Login using Supabase
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError("Harap masukkan email dan kata sandi.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError(null);
      setAuthSuccess(null);
      
      // Supabase Mode
      try {
        if (!isSupabaseConfigured()) {
          setAuthError("Supabase belum dikonfigurasi. Silakan hubungkan database Supabase Anda melalui formulir di bawah ini!");
          setAuthShowFallback(true);
          return;
        }

        const { data, error } = await supabase!.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (error) {
          throw error;
        }

        const user = data.user;
        if (user) {
          setCurrentUser(user);
          
          setResearcherEmail(user.email || authEmail);
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "Fikri Afandi";
          setResearcherName(fullName);
          const parts = fullName.split(" ");
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
          
          setResearcherOrg(user.user_metadata?.organization || "Economic Research Institute");
          setResearcherRole(user.user_metadata?.role || "Lead Economist");
          setEmailNotifications(user.user_metadata?.emailNotifications !== false);
          setAutoSaveQueries(user.user_metadata?.autoSaveQueries !== false);
          setWeeklyReports(!!user.user_metadata?.weeklyReports);
          setDefaultExportFormat(user.user_metadata?.defaultExportFormat || "Excel (.xlsx)");
          setIncludeMetadata(user.user_metadata?.includeMetadata !== false);

          setAuthSuccess("Login Berhasil! Selamat datang.");
          setAuthPassword("");
        }
      } catch (err: any) {
        console.error("Supabase login error", err);
        setAuthError(err.message || "Email atau kata sandi tidak valid.");
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setAuthError(err.message || "Email atau kata sandi tidak valid.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout current session
  const handleLogout = async () => {
    try {
      setAuthLoading(true);
      if (supabase) {
        await supabase.auth.signOut();
      }
      
      // Clear react states
      setCurrentUser(null);
      setSearchQuery("");
      setActiveQueryData(null);
      setCurrentTab("home");
      
      // Set to default fields
      setFirstName("Fikri");
      setLastName("Afandi");
      setResearcherEmail("researcher@institution.edu");
      setResearcherName("Fikri Afandi");
      setResearcherOrg("Economic Research Institute");
    } catch (err: any) {
      console.error("Logout error:", err);
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Live Execute API simulation in API playground
  const executePlaygroundRequest = async () => {
    setIsApiLoading(true);
    setApiActiveTab("response");
    setApiConsoleOutput("/* Executing Appwrite Function... */");

    const targetQuery = searchQuery || "Indonesia GDP Growth 2000-2025";

    try {
      const data = await askDataMintAgent(targetQuery);
      setApiConsoleOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiConsoleOutput(
        `// API Integration Exception:\n${err.message || "Network Timeout"}`
      );
    } finally {
      setIsApiLoading(false);
    }
  };

  // Sort Table function
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedRows = (rows: Record<string, string>[]) => {
    if (!sortConfig) return rows;
    const sorted = [...rows].sort((a, b) => {
      const valA = a[sortConfig.key] || "";
      const valB = b[sortConfig.key] || "";
      
      const numA = parseFloat(valA.replace(/[^0-9.-]/g, ""));
      const numB = parseFloat(valB.replace(/[^0-9.-]/g, ""));

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortConfig.direction === "asc" ? numA - numB : numB - numA;
      }
      return sortConfig.direction === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    return sorted;
  };

  const getFilteredRows = (rows: Record<string, string>[]) => {
    return getSortedRows(rows).filter((row) => {
      if (!tableFilter.trim()) return true;
      return Object.values(row).some((val) => 
        String(val).toLowerCase().includes(tableFilter.toLowerCase())
      );
    });
  };

  const activeRows = activeQueryData?.data || [];
  const filteredRows = getFilteredRows(activeRows);
  const totalFilteredRows = filteredRows.length;

  const inlineStartIndex = (inlinePage - 1) * inlineLimit;
  const inlineEndIndex = Math.min(inlineStartIndex + inlineLimit, totalFilteredRows);
  const paginatedInlineRows = filteredRows.slice(inlineStartIndex, inlineStartIndex + inlineLimit);
  const totalInlinePages = Math.ceil(totalFilteredRows / inlineLimit) || 1;

  const fullscreenStartIndex = (fullscreenPage - 1) * fullscreenLimit;
  const fullscreenEndIndex = Math.min(fullscreenStartIndex + fullscreenLimit, totalFilteredRows);
  const paginatedFullscreenRows = filteredRows.slice(fullscreenStartIndex, fullscreenStartIndex + fullscreenLimit);
  const totalFullscreenPages = Math.ceil(totalFilteredRows / fullscreenLimit) || 1;

  const currentQueryText = searchQuery || "Indonesia GDP Growth 2000-2025";

  if (isLaunching) {
    return (
      <div id="terminal-launch-screen" className={`min-h-screen flex flex-col items-center justify-center font-sans transition-colors duration-300 ${darkMode ? "bg-[#110f0e] text-[#faf9f6]/95" : "bg-[#faf9f6] text-slate-800"}`}>
        <div className="flex flex-col items-center gap-6 text-center p-8 max-w-sm w-full">
          <div className="relative flex h-16 w-16 shrink-0 justify-center items-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-20"></span>
            <div className="relative inline-flex items-center justify-center">
            <img
              src={loading}
              alt="DataMint"
              className="h-16 w-auto"
            />
          </div>
          </div>
          <div className="space-y-4 w-full">
            <h3 className="font-serif italic font-semibold text-2xl tracking-normal text-[#128a5e]">Data<span className={darkMode ? "text-white" : "text-slate-900"}>Mint</span></h3>
            
            <div className="space-y-2 col-span-1">
              <p className={`text-xs font-mono font-bold uppercase tracking-wider ${darkMode ? "text-[#8e857c]" : "text-slate-500"}`}>
                Initializing Sandbox Terminal...
              </p>
              
              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-[#128a5e] transition-all duration-150 rounded-full" 
                  style={{ width: `${launchProgress}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between font-mono text-[9px] text-[#8e857c]">
                <span>{launchProgress < 30 ? "Verifying API endpoints..." : launchProgress < 70 ? "Unlocking Supabase gateway..." : "Mounting indicators cache..."}</span>
                <span>{launchProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Jika pengguna berada dalam sesi landing, tampilkan Landing Page terlebih dahulu
  if (showLanding) {
    return (
      <LandingPage
        onGetStarted={(mode) => {
          triggerLaunchTerminal(mode);
        }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  if (authLoading) {
    return (
      <div id="auth-loading-screen" className={`min-h-screen flex flex-col items-center justify-center font-sans ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
        <div className="flex flex-col items-center gap-4 text-center p-8 max-w-sm">
          <div className="relative flex h-10 w-10 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-duration-1000"></span>
            <span className="relative inline-flex rounded-full h-10 w-10 bg-emerald-500 items-center justify-center text-white">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </span>
          </div>
          <div className="space-y-1.5 mt-2">
            <h3 className="font-display font-medium text-base tracking-tight">Verifying Portal Access</h3>
            <p className="text-xs text-slate-450 dark:text-slate-550 font-mono">Connecting with Supabase security gateway...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div id="auth-portal-screen" className={`min-h-screen flex items-center justify-center px-4 py-8 font-sans transition-colors duration-300 relative ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
        <div className="absolute top-4 right-4">
          <button
            id="theme-toggle-auth"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Light Mode" : "Dark Mode"}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>

        <div className="w-full max-w-md space-y-6">
          <div className="text-center select-none animate-fade-in">
            <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-4">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
              Data<span className="text-emerald-500">Mint</span> Intelligence
            </h2>
            <p className="text-xs text-slate-450 dark:text-slate-500 font-mono uppercase tracking-widest mt-1.5">
              Secure Research Portal Gateway
            </p>
          </div>

          {/* Always using Supabase Mode */}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex border-b border-slate-150 dark:border-slate-800 pb-3 gap-4">
              <button
                id="tab-auth-login"
                type="button"
                className={`text-sm font-semibold pb-1.5 border-b-2 transition-all cursor-pointer ${
                  authMode === "login"
                    ? "border-emerald-500 text-slate-900 dark:text-white"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
              >
                Sign In
              </button>
              <button
                id="tab-auth-register"
                type="button"
                className={`text-sm font-semibold pb-1.5 border-b-2 transition-all cursor-pointer ${
                  authMode === "register"
                    ? "border-emerald-500 text-slate-900 dark:text-white"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Autentikasi Terhambat</span>
                </div>
                <p className="font-sans leading-relaxed text-[11px] opacity-90">{authError}</p>
              </div>
            )}

            {authSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                <span className="font-sans text-[11px] font-medium">{authSuccess}</span>
              </div>
            )}

            <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="space-y-4">
              {authMode === "register" && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">First Name</label>
                    <input
                      id="txt-auth-first-name"
                      type="text"
                      placeholder="Fikri"
                      className="w-full px-3.5 py-2 text-xs font-sans bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-450"
                      value={signUpFirstName}
                      onChange={(e) => setSignUpFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Last Name</label>
                    <input
                      id="txt-auth-last-name"
                      type="text"
                      placeholder="Afandi"
                      className="w-full px-3.5 py-2 text-xs font-sans bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-450"
                      value={signUpLastName}
                      onChange={(e) => setSignUpLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  id="txt-auth-email"
                  type="email"
                  placeholder="name@institution.org"
                  className="w-full px-3.5 py-2 text-xs font-sans bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-450"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <input
                  id="txt-auth-password"
                  type="password"
                  placeholder="Min. 8 characters"
                  className="w-full px-3.5 py-2 text-xs font-sans bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-450"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                />
              </div>

              <button
                id="btn-auth-submit"
                type="submit"
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-850 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 mt-4 transition-all duration-150"
              >
                {authMode === "login" ? (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="datamint-app" className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      
      {/* 1. Header Banner alerting user of Gemini key parameters if missing */}
      {!hasGeminiKey && (
        <div id="missing-api-warning" className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between gap-2 max-md:flex-col text-center">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Offline-Intelligence Engine Active:</strong> Synthesis matches historic estimations. To enable deep-synthesis real-time internet search, attach your <strong>GEMINI_API_KEY</strong> secrets in the Settings console.
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 flex max-lg:flex-col relative">

        {/* 2. Left Navigation Sidebar */}
        <aside
          id="sidebar-panel"
          className={`w-64 border-r max-lg:hidden flex flex-col shrink-0 ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="p-5 border-b border-current/10 select-none shrink-0">
            <img
              src={logo}
              alt="DataMint"
              className="h-16 w-auto"
            />
          </div>

          <div className="p-4 shrink-0">
            <button
              id="btn-sidebar-new-query"
              onClick={() => {
                setSearchQuery("");
                setActiveQueryData(null);
                setCurrentTab("home");
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-sm transition-all duration-150"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Search Query</span>
            </button>
          </div>

          <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
            {[
              { id: "home", label: "Home", icon: Home },
              { id: "my-datasets", label: "My Datasets", icon: Database, badge: datasets.length },
              { id: "data-sources", label: "Data Sources", icon: Globe },
              { id: "saved-queries", label: "Saved Queries", icon: CheckSquare, badge: savedQueries.length },
              { id: "downloads", label: "Downloads Log", icon: Download, badge: downloads.length },
              { id: "api-playground", label: "API Playground", icon: Terminal },
              { id: "settings", label: "Settings", icon: Settings },
              { id: "help-docs", label: "Help Center", icon: HelpCircle }
            ].map((item) => {
              const IconComp = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  id={`nav-item-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 ${
                    isActive 
                      ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-semibold" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`w-4 h-4 ${isActive ? "text-emerald-500" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-mono text-[10px]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Institutional User profile block */}
          <div id="user-footer-block" className="p-4 border-t border-current/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white border border-slate-700 shadow-sm shrink-0">
                <span className="font-display font-bold text-xs select-none">
                  {researcherName.split(" ").map(n => n[0]).join("")}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">{researcherName}</div>
                <div className="text-[10px] text-slate-400 truncate tracking-wide">{researcherOrg}</div>
              </div>
              <button
                id="btn-sidebar-signout"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all shrink-0 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>INDEX LIVE</span>
              </span>
              <span>VER: 4.8.10</span>
            </div>
          </div>
        </aside>

        {/* Mobile Header Menu bar */}
        <header id="mobile-header" className="lg:hidden flex items-center justify-between p-4 border-b shrink-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center">
            <img
              src={logo}
              alt="DataMint"
              className="h-14 w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              id="theme-toggler-mobile"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              ) : (
                <Moon className="w-4 h-4 text-slate-500 fill-slate-500/10" />
              )}
            </button>
            <button
              id="mobile-menu-toggle"
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Dropdown list */}
        {isMobileMenuOpen && (
          <div id="mobile-navigation-dropdown" className="lg:hidden absolute top-[57px] left-0 right-0 z-40 p-4 border-b shadow-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col gap-1.5">
            {[
              { id: "home", label: "Home", icon: Home },
              { id: "my-datasets", label: "My Datasets", icon: Database },
              { id: "data-sources", label: "Data Sources", icon: Globe },
              { id: "saved-queries", label: "Saved Queries", icon: CheckSquare },
              { id: "downloads", label: "Downloads Log", icon: Download },
              { id: "api-playground", label: "API Playground", icon: Terminal },
              { id: "settings", label: "Settings", icon: Settings },
              { id: "help-docs", label: "Help Center", icon: HelpCircle }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg ${
                  currentTab === item.id 
                    ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-white" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <item.icon className="w-4 h-4 opacity-70" />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="border-t border-slate-150 dark:border-slate-800 mt-2 pt-2">
              <button
                id="btn-mobile-signout"
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 opacity-80" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Main content frame */}
        <main id="main-content-canvas" className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
          
          {/* Top Header Controls row */}
          <div id="top-internal-navbar" className="flex justify-between items-center gap-4 mb-6 border-b pb-4 border-current/5 max-sm:flex-col max-sm:items-start shrink-0">
            <div>
              <h4 id="greeting-banner" className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">DataMint Intelligence Terminal</h4>
              <h2 className="text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
                {currentTab === "home" && (() => {
                  const hour = new Date().getHours();
                  let greeting = "Good morning";
                  if (hour >= 12 && hour < 17) {
                    greeting = "Good afternoon";
                  } else if (hour >= 17 || hour < 5) {
                    greeting = "Good evening";
                  }
                  return `${greeting}, ${lastName || "Researcher"}`;
                })()}
                {currentTab === "my-datasets" && "Saved Economic Catalogs"}
                {currentTab === "data-sources" && "Connected Indices Feed status"}
                {currentTab === "saved-queries" && "Active Query Monitors"}
                {currentTab === "downloads" && "Available Data Downloads"}
                {currentTab === "api-playground" && "API Playground & Integrations"}
                {currentTab === "settings" && "Researcher Profile Settings"}
                {currentTab === "help-docs" && "Documentation Hub"}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Center query search if we have result data active but are browsing */}
              {activeQueryData && currentTab !== "home" && (
                <button
                  onClick={() => setCurrentTab("home")}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-semibold rounded-full flex items-center gap-1 transition-all duration-150"
                >
                  <Search className="w-3 h-3" />
                  <span>Return to Active Research</span>
                </button>
              )}

              {/* Theme toggler */}
              <button
                id="btn-theme-switcher"
                onClick={() => setDarkMode(!darkMode)}
                className="p-1.5 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all border-slate-200 dark:border-slate-800 cursor-pointer"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-500 fill-slate-500/10" />
                )}
              </button>

              <div className="flex items-center gap-2 border-l pl-3 dark:border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                <span className="text-[10px] font-mono tracking-wider text-slate-400 font-semibold uppercase">SECURE LINK ({researcherOrg.split(" ")[0]})</span>
              </div>
            </div>
          </div>

          {/* 4. Tab Panels */}
          
          {/* A: Home Tab Page */}
          {currentTab === "home" && (
            <div id="home-dashboard-tab" className="space-y-6 flex-1 flex flex-col justify-between">
              
              {/* Upper Hero query field */}
              <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Activity className="w-32 h-32 text-emerald-500" />
                </div>
                
                <div className="max-w-2xl mx-auto text-center space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-wider uppercase">
                    <Sparkles className="w-3 h-3" />
                    <span>Economic Intelligence Synthesis Engine</span>
                  </div>
                  
                  <h1 className="text-2xl md:text-3xl font-display font-medium tracking-tight">
                    What dataset do you need today, {lastName || "Afandi"}?
                  </h1>

                  {/* High end search bar input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      executeQuery(searchQuery);
                    }}
                    className="relative mt-4 flex items-center max-w-xl mx-auto"
                  >
                    <div className="absolute left-4 top-3.5 text-slate-400">
                      <Search className="w-4.5 h-4.5" />
                    </div>
                    <textarea
                      id="txt-main-economic-search"
                      rows={Math.min(8, Math.max(1, searchQuery.split("\n").length))}
                      className="w-full pl-11 pr-24 py-3 md:py-3.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-900 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm placeholder:text-slate-400 font-sans transition-all shadow-sm resize-none leading-relaxed"
                      placeholder="Describe the dataset you need..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          executeQuery(searchQuery);
                        }
                      }}
                    />
                    <button
                      id="btn-trigger-economic-synthesis"
                      type="submit"
                      disabled={isQueryRunning}
                      className="absolute right-2.5 bottom-2.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {isQueryRunning ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Synthesizing...</span>
                        </>
                      ) : (
                        <>
                          <span>Synthesize</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Suggestion tags pills */}
                  <div className="pt-2 text-center">
                    <span className="text-[10px] font-mono tracking-wide uppercase text-slate-400 font-bold inline-block mr-2.5">Suggestions:</span>
                    <div className="inline-flex flex-wrap justify-center gap-1.5 mt-1">
                      {[
                        "Indonesia GDP Growth 2000-2025",
                        "ASEAN Inflation Rate",
                        "US Interest Rate History",
                        "China Export Data"
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          id={`suggestion-pill-${idx}`}
                          type="button"
                          onClick={() => {
                            setSearchQuery(item);
                            executeQuery(item);
                          }}
                          className="px-2.5 py-1 bg-slate-150 hover:bg-slate-200/60 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-xs border border-slate-200/50 dark:border-slate-800/50 rounded-lg text-slate-600 dark:text-slate-300 font-medium cursor-pointer transition-all duration-150"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {queryError && (
                    <div className="mt-4 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 max-w-xl mx-auto text-xs font-medium animate-fade-in flex items-start gap-2.5 text-left">
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-800 dark:text-rose-300">Peringatan Kredensial / Sistem</p>
                        <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-sans leading-relaxed">{queryError}</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Progress Terminal display */}
              {isQueryRunning && (
                <div id="processing-progress-terminal" className="bg-slate-900 text-slate-300 rounded-xl p-5 border border-slate-800 shadow-xl max-w-xl mx-auto w-full font-mono text-[11px] space-y-2.5">
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
                    <span className="text-emerald-500 flex items-center gap-1.5 font-bold">
                      <Cpu className="w-4 h-4 animate-spin" />
                      <span>DataMint Index Server #8031</span>
                    </span>
                    <span className="text-slate-400">Run Sequence Active</span>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <p className="flex justify-between">
                      <span className="text-slate-400">1. Synthesizer query parsing:</span>
                      <span className={queryProgressStep >= 0 ? "text-emerald-400" : "text-slate-500 animate-pulse"}>
                        {queryProgressStep >= 0 ? "✓ COMPLETE" : "RUNNING"}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">2. Global indexes sweep (Model, IMF, FRED, World Bank):</span>
                      <span className={queryProgressStep >= 1 ? "text-emerald-400" : queryProgressStep === 0 ? "text-slate-500 animate-pulse" : "text-slate-600"}>
                        {queryProgressStep >= 1 ? "✓ COMPLETE" : queryProgressStep === 0 ? "ACQUIRING" : "QUEUED"}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">3. Timeseries normalization & data cleaning:</span>
                      <span className={queryProgressStep >= 2 ? "text-emerald-400" : queryProgressStep === 1 ? "text-slate-500 animate-pulse" : "text-slate-600"}>
                        {queryProgressStep >= 2 ? "✓ COMPLETE" : queryProgressStep === 1 ? "CLEANING" : "QUEUED"}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">4. Processing table arrays format:</span>
                      <span className={queryProgressStep >= 3 ? "text-emerald-400" : queryProgressStep === 2 ? "text-slate-500 animate-pulse" : "text-slate-600"}>
                        {queryProgressStep >= 3 ? "✓ COMPLETE" : queryProgressStep === 2 ? "FORMATTING" : "QUEUED"}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">5. Excel Sheet build export:</span>
                      <span className={queryProgressStep >= 4 ? "text-emerald-400" : queryProgressStep === 3 ? "text-slate-500 animate-pulse" : "text-slate-600"}>
                        {queryProgressStep >= 4 ? "✓ COMPLETE" : queryProgressStep === 3 ? "COMPILING" : "QUEUED"}
                      </span>
                    </p>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-1.5 transition-all duration-300"
                      style={{ width: `${(queryProgressStep / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Query result interface with dual side layout */}
              {activeQueryData && !isQueryRunning && (
                <div id="query-content-view" className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start animate-fade-in">
                  
                  {/* Left Column containing Table and Charts */}
                  <div className="xl:col-span-3 space-y-6">
                    
                    {/* Results Overview Action Banner */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        {activeQueryData.warning && (
                          <div className="inline-flex items-center gap-1 mb-2 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Preview Mode Indicator Enabled</span>
                          </div>
                        )}
                        <h2 className="text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white">
                          {activeQueryData.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1 font-mono">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            <span>{activeQueryData.sources?.length} Sources found</span>
                          </span>
                          <span>•</span>
                          <span>Processed in {activeQueryData.processingTime}</span>
                        </div>
                      </div>

                      {/* Export physical files utilities */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          id="btn-download-excel"
                          onClick={() => {
                            triggerExcelDownload(activeQueryData);
                            saveQueryBenchmark(activeQueryData.title, currentQueryText);
                          }}
                          className="px-3 py-1.5 border hover:bg-slate-50 dark:hover:bg-slate-805 border-slate-200 dark:border-slate-800 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-all text-slate-700 dark:text-slate-300 cursor-pointer shadow-xs"
                          title="Export Excel (.xlsx) to local directory"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Export Excel</span>
                        </button>
                        
                        <button
                          id="btn-copy-json"
                          onClick={() => triggerCopyJSON(activeQueryData, "active-query")}
                          className="px-3 py-1.5 border hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-all text-slate-700 dark:text-slate-300 cursor-pointer shadow-xs"
                        >
                          {copiedId === "active-query" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500 animate-scale-up" />
                              <span className="text-emerald-500">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>

                        <button
                          id="btn-save-to-catalog"
                          onClick={() => {
                            saveDatasetToCatalog(activeQueryData);
                            saveQueryBenchmark(activeQueryData.title, currentQueryText);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          {saveSuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                              <span>Saved!</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save to My Datasets</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Table Preview Panel */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                      
                      <div className="flex justify-between items-center gap-4 flex-wrap mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                          <h3 className="text-sm font-semibold tracking-tight">Structured Dataset Output</h3>
                        </div>
                        
                        {/* Instant Search filters & Maximize controls */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="relative">
                            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-xs w-44 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800 dark:text-slate-100"
                              placeholder="Filter rows..."
                              value={tableFilter}
                              onChange={(e) => {
                                setTableFilter(e.target.value);
                                setInlinePage(1);
                              }}
                            />
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="text-[11px] hidden sm:inline">Rows:</span>
                            <select
                              value={inlineLimit}
                              onChange={(e) => {
                                setInlineLimit(Number(e.target.value));
                                setInlinePage(1);
                              }}
                              className="px-2 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs rounded-lg focus:outline-none text-slate-705 dark:text-slate-300"
                            >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                              <option value={99999}>All</option>
                            </select>
                          </div>

                          <button
                            id="btn-fullscreen-data"
                            type="button"
                            onClick={() => setIsFullscreenData(true)}
                            className="px-2.5 py-1.5 border hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-all text-slate-700 dark:text-slate-300 cursor-pointer shadow-xs"
                            title="Toggle Full Screen view to display more records"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="hidden sm:inline">Fullscreen</span>
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800/80">
                        <table className="w-full text-xs font-sans text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 text-slate-500 font-mono tracking-wider font-bold">
                              {activeQueryData.columns?.map((col) => (
                                <th
                                  key={col}
                                  onClick={() => handleSort(col)}
                                  className="px-4 py-2.5 font-bold uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none text-[10px]"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span>{col}</span>
                                    {sortConfig?.key === col && (
                                      <span className="text-[9px] text-slate-400">
                                        {sortConfig.direction === "asc" ? "▲" : "▼"}
                                      </span>
                                    )}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {paginatedInlineRows.length > 0 ? (
                              paginatedInlineRows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 font-mono">
                                  {activeQueryData.columns?.map((col) => {
                                    const value = row[col];
                                    const isYear = col.toLowerCase() === "year" || col.toLowerCase() === "period" || col.toLowerCase() === "date";
                                    return (
                                      <td 
                                        key={col} 
                                        className={`px-4 py-2 ${
                                          isYear 
                                            ? "font-semibold text-slate-900 dark:text-white" 
                                            : "text-slate-600 dark:text-slate-300"
                                        }`}
                                      >
                                        {value}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={activeQueryData.columns?.length || 1} className="text-center py-6 text-slate-400 font-medium">
                                  No records found matching current criteria.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Paginated Footer */}
                      <div className="mt-3 flex justify-between items-center text-[11px] text-slate-400 font-medium border-t border-slate-100 dark:border-slate-800/40 pt-3 flex-wrap gap-2">
                        <span>
                          Showing <strong className="text-slate-700 dark:text-slate-200">{totalFilteredRows > 0 ? inlineStartIndex + 1 : 0}</strong>-
                          <strong className="text-slate-700 dark:text-slate-200">{inlineEndIndex}</strong> of{" "}
                          <strong className="text-slate-700 dark:text-slate-200">{totalFilteredRows}</strong> records
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={inlinePage <= 1}
                            onClick={() => setInlinePage((p) => Math.max(1, p - 1))}
                            className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          >
                            Previous
                          </button>
                          <span className="px-2 text-slate-500 font-mono">
                            Page {inlinePage} / {totalInlinePages}
                          </span>
                          <button
                            type="button"
                            disabled={inlinePage >= totalInlinePages}
                            onClick={() => setInlinePage((p) => Math.min(totalInlinePages, p + 1))}
                            className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          >
                            Next
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Visualisation Card - Single Centered Custom Chart with Style Selection */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col space-y-4">
                      {/* Segmented controls header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-850">
                        <div>
                          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-50 flex items-center gap-1.5 font-display">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            <span>Visualisasi Pivot Multivariat</span>
                          </h3>
                        </div>
                        
                        {/* Modern segmented control pill list */}
                        <div className="flex items-center bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200/80 dark:border-slate-850 shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)]">
                          <button
                            type="button"
                            onClick={() => setSelectedChartType("line")}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                              selectedChartType === "line"
                                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-800"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                          >
                            Line Chart
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedChartType("bar")}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                              selectedChartType === "bar"
                                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-800"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                          >
                            Bar Chart
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedChartType("dual")}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                              selectedChartType === "dual"
                                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-800"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                          >
                            Kombinasi (Dual)
                          </button>
                        </div>
                      </div>

                      {/* Display Selected Custom Design on a pristine h-[340px] visual stage */}
                      <div className="h-[340px] w-full pt-1.5">
                        <CustomSVGChart 
                          data={activeQueryData.chartData} 
                          series={activeQueryData.chartSeries} 
                          title={
                            selectedChartType === "line" 
                              ? "Normalized Time-Series Index" 
                              : selectedChartType === "bar" 
                                ? "Bar Volume Comparison" 
                                : "Multi-Series Combined Index"
                          } 
                          type={selectedChartType}
                        />
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Key Details & Audit timeline */}
                  <div id="right-audit-sidebar" className="space-y-6">
                    
                    {/* Sources metadata checkcard */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs animate-fade-in animate-duration-300">
                      <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold mb-4 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sources Audited</span>
                      </h3>
                      
                      <div className="space-y-2.5">
                        {activeQueryData.sources && activeQueryData.sources.length > 0 ? (
                          activeQueryData.sources.map((source, idx) => (
                            <div 
                              key={`${source}-${idx}`} 
                              className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 dark:bg-emerald-500/5 text-xs transition-all text-slate-800 dark:text-slate-200 font-semibold"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="relative flex h-2 w-2 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <FileCheck2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="font-sans text-[11px] leading-snug truncate" title={source}>{source}</span>
                              </div>
                              <span className="bg-emerald-100/60 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-md uppercase font-mono shrink-0 ml-2">
                                ACTIVE
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-xs text-slate-400 font-mono">
                            No audited indices connected.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dataset meta identifiers */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                      <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold mb-4 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>Dataset Metadata</span>
                      </h3>
                      
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400">Frequency:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{activeQueryData.metadata?.frequency || "Annual"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400">Unit:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]" title={activeQueryData.metadata?.unit}>{activeQueryData.metadata?.unit}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400">Last Updated:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{activeQueryData.metadata?.lastUpdated}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400">Observations:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{activeQueryData.data?.length} periods</span>
                        </div>
                        
                        {activeQueryData.metadata?.sourceUrl && (
                          <div className="pt-2 text-center text-[10px]">
                            <a 
                              href={activeQueryData.metadata.sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-emerald-500 hover:underline inline-flex items-center gap-1"
                            >
                              <span>Official Regional Registry Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline computation breakdown */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                      <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold mb-4 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-slate-400" />
                        <span>Execution Pipeline</span>
                      </h3>
                      
                      <div className="space-y-4">
                        {[
                          { title: "Query understanding", status: "Lexer parsed", time: "18ms" },
                          { title: "Source discovery", status: "World Bank, IMF matched", time: "112ms" },
                          { title: "Data retrieval & mapping", status: "Observations loaded", time: "248ms" },
                          { title: "Cleaning and normalization", status: "Inflation & Currencies balanced", time: "89ms" },
                          { title: "Export generation", status: "Secure download ready", time: "12ms" }
                        ].map((step, idx) => (
                          <div key={idx} className="relative pl-5 border-l-2 border-slate-150 dark:border-slate-800 last:border-transparent">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -left-[5px] top-1" />
                            <div className="flex justify-between text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                              <span>{step.title}</span>
                              <span className="font-mono text-[10px] text-slate-400 font-normal">{step.time}</span>
                            </div>
                            <p className="text-[10px] text-slate-400">{step.status}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* Bottom indicators static list when on home page dashboard */}
              <div id="home-indicators-panel" className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                
                {/* Visual block: Recent Benchmarks queries */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs">
                  <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <CheckSquare className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-slate-500">Popular Economic Indices</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { query: "US CPI Inflation index 10 years", title: "US CPI Policy" },
                      { query: "ASEAN trade balances last 5 years", title: "ASEAN Trade Balances" },
                      { query: "Japan export statistics trends", title: "Japan Policy Rates" }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchQuery(item.query);
                          executeQuery(item.query);
                        }}
                        className="w-full text-left p-2 rounded-lg border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-all flex items-center justify-between text-xs"
                      >
                        <span className="truncate max-w-[160px] font-medium font-sans text-slate-700 dark:text-slate-300">{item.title}</span>
                        <span className="text-[9px] font-mono text-emerald-500 hover:underline flex items-center gap-0.5">
                          <span>Verify</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Popular Datasets Quick lookup */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs">
                  <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-slate-500">Recent User Searches</h3>
                  </div>
                  <div className="space-y-2">
                    {savedQueries.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSearchQuery(item.rawQuery);
                          executeQuery(item.rawQuery);
                        }}
                        className="w-full text-left p-2 rounded-lg border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-all flex items-center justify-between text-xs"
                      >
                        <span className="truncate max-w-[150px] font-medium text-slate-700 dark:text-slate-300 font-sans">{item.title}</span>
                        <span className="text-[9px] font-mono text-slate-400">{item.timeAgo.replace("Last run ", "")}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Secure synthesis metadata info */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-slate-500">Integration Spec</h3>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Standard JSON response structures are generated over strict Node modules matching the World Bank macroeconomic index. 
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>SECURITY: AES-256</span>
                    <span className="text-emerald-500">READY</span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* B: My Datasets Catalog Panel */}
          {currentTab === "my-datasets" && (
            <div id="my-datasets-tab" className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                <div className="flex justify-between items-center gap-4 flex-wrap mb-6">
                  <p className="text-xs text-slate-500 max-w-md">
                    Explore and manage economic records you have successfully synthesized and saved for institution workflows.
                  </p>
                  <div className="text-xs font-mono text-slate-400">
                    Total Storage: {datasets.length} Active Catalogs
                  </div>
                </div>

                {datasets.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                    <Database className="w-10 h-10 mx-auto opacity-30 mb-3" />
                    <p className="text-sm font-semibold">No Saved Datasets</p>
                    <p className="text-xs text-slate-400/85 mt-1">Run an economic search query on the Home dashboard and click 'Save to My Datasets'.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {datasets.map((ds) => (
                      <div key={ds.id} className="border border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 p-5 rounded-xl flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display uppercase tracking-wide">{ds.title}</h3>
                            <button
                              id={`delete-btn-${ds.id}`}
                              onClick={() => deleteDataset(ds.id!)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                              title="Delete catalog"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5 font-sans leading-relaxed">{ds.description}</p>
                          
                          <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 py-1 border-t border-slate-200/50 dark:border-slate-800/50">
                            <div>Unit: {ds.metadata?.unit || "Metric Unit"}</div>
                            <div>Freq: {ds.metadata?.frequency || "Monthly"}</div>
                            <div>Sources: {ds.sources?.join(", ")}</div>
                            <div>Records: {ds.rowCount} entries</div>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-transparent">
                          <button
                            onClick={() => {
                              setActiveQueryData(ds);
                              setSearchQuery(ds.title);
                              setCurrentTab("home");
                            }}
                            className="text-xs font-semibold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect Data & Charts</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => triggerExcelDownload(ds)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer text-slate-700 dark:text-slate-300"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Download Excel</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* C: Data Sources connected feed directory */}
          {currentTab === "data-sources" && (
            <div id="sources-tab" className="space-y-6">
              
              {/* Telemetry Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Total Feeds Connected</div>
                  <div className="text-xl font-bold mt-1 font-display">{dataSources.length} Verified</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Active Status Integrity</div>
                  <div className="text-xl font-bold mt-1 text-emerald-500 flex items-center gap-1.5 font-display">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span>{onlinePercentage}% Online</span>
                  </div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Avg Response Ping</div>
                  <div className="text-xl font-bold mt-1 font-display">138ms</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Active Region Scope</div>
                  <div className="text-xl font-bold mt-1 font-display">Indonesia & Global</div>
                </div>
              </div>

              {/* Grid with 2 Columns: Directory (Col-span 3) and Register side form (Col-span 1) */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
                
                {/* Connection List Panel */}
                <div className="xl:col-span-3 space-y-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                    
                    {/* Filter and Title */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 mb-5 border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold font-display tracking-tight text-slate-900 dark:text-white">Connected Registries & Databases</h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-sans">Real-time telemetry and indexing state of regional registries, BPS, Bank Indonesia, and global systems.</p>
                      </div>
                      
                      {/* Filter pills */}
                      <div className="flex flex-wrap gap-1">
                        {[
                          { id: "all", label: "All Feeds" },
                          { id: "Global", label: "Global" },
                          { id: "National", label: "Indonesia / Local" },
                          { id: "Financial", label: "Financial / Crypto" },
                          { id: "Trade", label: "Trade" },
                          { id: "Academic", label: "Academic" },
                          { id: "Custom", label: "Custom Entries" }
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            type="button"
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                              selectedCategory === cat.id
                                ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-xs pointer-events-none"
                                : "bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 cursor-pointer"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sources Grid list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dataSources
                        .filter(s => selectedCategory === "all" || s.category === selectedCategory)
                        .map((src) => (
                          <div key={src.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
                            
                            <div>
                              {/* Header info */}
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                                    src.status === "Healthy" 
                                      ? "bg-emerald-500 animate-pulse" 
                                      : src.status === "Degraded" 
                                        ? "bg-amber-500 animate-pulse" 
                                        : src.status === "Coming Soon"
                                          ? "bg-indigo-500 animate-pulse"
                                          : "bg-slate-400"
                                  }`} />
                                  <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-500">{src.code}</span>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-150 dark:bg-slate-850 text-slate-500 dark:text-slate-400">{src.category}</span>
                              </div>

                              {/* Title & description */}
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-2.5">{src.name}</h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{src.description || "No description provided."}</p>
                              
                              <div className="text-[10px] font-mono mt-3.5 bg-slate-100/50 dark:bg-slate-850 p-2 rounded border border-current/5 text-slate-450 select-all truncate">
                                Endpoint: {src.url}
                              </div>
                                                  {/* Ping / Latency check utilities */}
                              <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 text-[10px] font-mono text-slate-400">
                                <div className="flex flex-col text-left">
                                  <span>Format: <strong className="text-slate-600 dark:text-slate-300">{src.type}</strong></span>
                                  <span>Latency: <strong className={src.speed === "Pending" ? "text-amber-500" : src.speed === "Coming Soon" ? "text-indigo-550 dark:text-indigo-400 font-semibold text-xs" : "text-emerald-500"}>{src.speed}</strong></span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {src.lastTested && src.speed !== "Coming Soon" && (
                                    <span className="text-[9px] text-slate-455 max-sm:hidden">Checked: {src.lastTested.split(" ")[0]}</span>
                                  )}
                                  
                                  {src.speed === "Coming Soon" ? (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40 dark:border-indigo-850">
                                      Coming Soon
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleTestConnection(src.id)}
                                      disabled={testingSourceId === src.id}
                                      className="px-2 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 transition-all"
                                    >
                                      {testingSourceId === src.id ? (
                                        <>
                                          <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
                                          <span>Testing...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Play className="w-3 h-3 text-emerald-500" />
                                          <span>Test Latency</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {/* Delete Custom Data Source item */}
                                  {src.id.startsWith("src-") && parseInt(src.id.substring(4)) > 18 ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDataSource(src.id)}
                                      className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                      title="Unregister dynamic source connection"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : src.id.includes("src-") ? null : (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDataSource(src.id)}
                                      className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                      title="Unregister custom connection"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>          </div>
                            </div>

                          </div>
                        ))}
                    </div>

                    {dataSources.filter(s => selectedCategory === "all" || s.category === selectedCategory).length === 0 && (
                      <div className="p-12 text-center text-slate-400">
                        <Globe className="w-10 h-10 mx-auto opacity-30 mb-3" />
                        <p className="text-sm font-semibold text-slate-505">No Connected Feeds Available in This Category</p>
                      </div>
                    )}

                  </div>
                </div>

                {/* Registration Side Panel Form */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 pb-3 border-b mb-4 border-slate-100 dark:border-slate-800">
                    <PlusCircle className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white">Register New Feed</h3>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    Connect an external database REST endpoint, national registry, web service, or secure private CSV link. 
                  </p>

                  {formSuccess && (
                    <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 text-xs font-semibold flex items-start gap-1.5 animate-scale-up">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  {formError && (
                    <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegisterSource} className="space-y-3.5 text-xs text-left">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Source Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bank Indonesia Exchange Feed"
                        value={newSourceName}
                        onChange={(e) => setNewSourceName(e.target.value)}
                        className="w-full px-3 py-1.8 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Source Code *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. BI_EXCHANGE_REST"
                          value={newSourceCode}
                          onChange={(e) => setNewSourceCode(e.target.value)}
                          className="w-full px-3 py-1.8 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Format Type</label>
                        <select
                          value={newSourceType}
                          onChange={(e) => setNewSourceType(e.target.value)}
                          className="w-full px-2.5 py-1.8 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700 dark:text-slate-305"
                        >
                          <option value="JSON">JSON</option>
                          <option value="XML">XML</option>
                          <option value="CSV">CSV</option>
                          <option value="SDMX">SDMX XML</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Federation Category</label>
                      <select
                        value={newSourceCategory}
                        onChange={(e) => setNewSourceCategory(e.target.value)}
                        className="w-full px-2.5 py-1.8 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700 dark:text-slate-305"
                      >
                        <option value="National">National (Indonesia / Local)</option>
                        <option value="Global">Global Registry</option>
                        <option value="Regional">Regional Directory</option>
                        <option value="Financial">Financial / Crypto Broker</option>
                        <option value="Trade">Trade Statistics</option>
                        <option value="Custom">Custom Entry</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">API Endpoint URL *</label>
                      <input
                        type="url"
                        required
                        placeholder="e.g. https://api.bi.go.id/seki/v1"
                        value={newSourceUrl}
                        onChange={(e) => setNewSourceUrl(e.target.value)}
                        className="w-full px-3 py-1.8 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Indices Scope & Description</label>
                      <textarea
                        rows={2}
                        placeholder="What indices does this dataset provide?"
                        value={newSourceDesc}
                        onChange={(e) => setNewSourceDesc(e.target.value)}
                        className="w-full px-3 py-1.8 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-505 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      {isRegistering ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Establishing Connection...</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Register Connection</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* D: Saved Queries Alert Management */}
          {currentTab === "saved-queries" && (
            <div id="queries-tab" className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs">
                <p className="text-xs text-slate-500 max-w-md mb-6">
                  Catalog queries to run with automated interval scanning reports.
                </p>

                {savedQueries.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                    <CheckSquare className="w-10 h-10 mx-auto opacity-30 mb-3" />
                    <p className="text-sm font-semibold">No Saved Queries</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-150 dark:border-slate-800">
                    <table className="w-full text-xs font-sans text-left">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-850 font-mono tracking-wider border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                          <th className="px-5 py-3 font-semibold">Query Label & Description</th>
                          <th className="px-5 py-3 font-semibold">Raw Query String</th>
                          <th className="px-5 py-3 font-semibold">Report Period</th>
                          <th className="px-5 py-3 font-semibold">Last Execution</th>
                          <th className="px-5 py-3 font-semibold text-right">Utility</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {savedQueries.map((q) => (
                          <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 font-sans">
                            <td className="px-5 py-3">
                              <div className="font-bold text-slate-900 dark:text-white text-xs">{q.title}</div>
                              <div className="text-[10px] text-slate-400">{q.description}</div>
                            </td>
                            <td className="px-5 py-3 font-mono text-[10px] text-slate-600 dark:text-slate-300">"{q.rawQuery}"</td>
                            <td className="px-5 py-3">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                {q.frequency}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-slate-500 text-[11px]">{q.timeAgo}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSearchQuery(q.rawQuery);
                                    executeQuery(q.rawQuery);
                                  }}
                                  className="text-xs text-emerald-500 hover:underline font-semibold cursor-pointer"
                                >
                                  Re-run Query
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  id={`delete-query-btn-${q.id}`}
                                  onClick={() => deleteSavedQuery(q.id)}
                                  className="text-xs text-red-500 hover:underline cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* E: Downloads Log Panel */}
          {currentTab === "downloads" && (
            <div id="downloads-tab" className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs">
                <p className="text-xs text-slate-500 max-w-md mb-6">
                  Every query run automatically compiles an accessible offline Excel spreadsheet log (.xlsx) for direct analysis.
                </p>

                {downloads.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                    <Download className="w-10 h-10 mx-auto opacity-30 mb-3" />
                    <p className="text-sm font-semibold">No Download Logs Available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {downloads.map((dl) => (
                      <div key={dl.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex justify-between items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-500 shrink-0">
                            <FileSpreadsheet className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold font-mono text-slate-900 dark:text-white uppercase">{dl.filename}</span>
                            <div className="text-[10px] text-slate-400 mt-0.5">{dl.date} • {dl.size} • Format: {dl.format}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            id={`delete-dl-btn-${dl.id}`}
                            onClick={() => deleteDownloadLog(dl.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-150 dark:hover:bg-slate-800 cursor-pointer"
                            title="Clear records download"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* F: API Playground Terminal Area */}
          {currentTab === "api-playground" && (
            <div id="api-playground-tab" className="space-y-6 max-w-5xl animate-fade-in">
              <div>
                <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">API Playground</h1>
                <p className="text-xs text-slate-500 mt-1">Test and integrate DataMint API into your applications</p>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-display">10,000</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">API Calls / Month</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-display">2,847</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Used This Month</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-display">98.5%</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Uptime</div>
                </div>
              </div>

              {/* Main Playground Card Container */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">API Examples</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Choose your preferred integration method and copy the code</p>
                </div>

                {/* Sub-tabs Selection Group */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
                  <button
                    type="button"
                    onClick={() => setApiActiveTab("rest")}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      apiActiveTab === "rest"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    REST API
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiActiveTab("python")}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      apiActiveTab === "python"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Python SDK
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiActiveTab("response")}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      apiActiveTab === "response"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Response
                  </button>
                </div>

                {/* Interactive Code / Output Block */}
                <div className="relative group text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 font-mono text-[11px] leading-relaxed">
                  
                  {/* Absolute Top Right Copy Button */}
                  <div className="absolute right-4 top-4 z-10">
                    <button
                      type="button"
                      onClick={() => {
                        const code = apiActiveTab === "rest" 
                          ? `curl -X POST https://api.datamint.io/v1/query \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "query": "Indonesia GDP Growth 2000-2025",\n    "format": "json",\n    "sources": ["worldbank", "imf"]\n  }'`
                          : apiActiveTab === "python"
                          ? `import datamint\n\nclient = datamint.Client(api_key="YOUR_API_KEY")\n\ndataset = client.query(\n    query="Indonesia GDP Growth 2000-2025",\n    format="json",\n    sources=["worldbank", "imf"]\n)\n\nprint(dataset.data)`
                          : apiConsoleOutput;
                        triggerCopyText(code, "api-playground-code");
                      }}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedId === "api-playground-code" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500 animate-scale-up" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Code contents according to chosen tab */}
                  <div className="overflow-x-auto min-h-[160px] pt-4">
                    {apiActiveTab === "rest" && (
                      <pre className="whitespace-pre">
{`curl -X POST https://api.datamint.io/v1/query \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Indonesia GDP Growth 2000-2025",
    "format": "json",
    "sources": ["worldbank", "imf"]
  }'`}
                      </pre>
                    )}

                    {apiActiveTab === "python" && (
                      <pre className="whitespace-pre">
{`import datamint

client = datamint.Client(api_key="YOUR_API_KEY")

dataset = client.query(
    query="Indonesia GDP Growth 2000-2025",
    format="json",
    sources=["worldbank", "imf"]
)

print(dataset.data)`}
                      </pre>
                    )}

                    {apiActiveTab === "response" && (
                      <pre className="whitespace-pre-wrap text-emerald-600 dark:text-emerald-400">
                        {isApiLoading ? "/* Executed query request is compiling... */" : apiConsoleOutput}
                      </pre>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    id="btn-trigger-api-playground"
                    onClick={executePlaygroundRequest}
                    disabled={isApiLoading}
                    className="py-2 px-4 bg-[#1A365D] hover:bg-[#122542] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    {isApiLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Communicating...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Try It Now</span>
                      </>
                    )}
                  </button>

                  <a
                    href="#help-docs"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentTab("help-docs");
                    }}
                    className="py-2 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs rounded-lg transition-all text-center cursor-pointer shadow-xs border-solid"
                  >
                    View Full Documentation
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* G: Settings Panel Profile info with Preferences and Data Defaults */}
          {currentTab === "settings" && (
            <div id="settings-tab" className="space-y-6 max-w-3xl animate-fade-in">
              <div>
                <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">Settings</h1>
                <p className="text-xs text-slate-500 mt-1">Manage your account and preferences</p>
              </div>

              {/* Card 1: Profile Information */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">Profile Information</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Update your personal details</p>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">First Name</label>
                      <input
                        id="txt-settings-firstname"
                        type="text"
                        className="w-full px-3.5 py-2 text-xs font-sans bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Last Name</label>
                      <input
                        id="txt-settings-lastname"
                        type="text"
                        className="w-full px-3.5 py-2 text-xs font-sans bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email</label>
                    <input
                      id="txt-settings-email"
                      type="email"
                      className="w-full px-3.5 py-2 text-xs font-sans bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                      value={researcherEmail}
                      onChange={(e) => setResearcherEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Organization</label>
                    <input
                      id="txt-settings-org"
                      type="text"
                      className="w-full px-3.5 py-2 text-xs font-sans bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                      value={researcherOrg}
                      onChange={(e) => setResearcherOrg(e.target.value)}
                      required
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      id="btn-settings-save-profile"
                      type="submit"
                      className="px-4 py-2 bg-[#1A365D] hover:bg-[#122542] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
                    >
                      Save Changes
                    </button>
                    {profileSuccess && (
                      <span className="text-xs text-emerald-500 font-semibold animate-fade-in inline-block">
                        ✓ Profile updated successfully
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* Card 2: Preferences */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">Preferences</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Customize your DataMint experience</p>
                </div>

                <div className="space-y-4">
                  {/* Email Notifications */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-850 pb-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-sans">Email Notifications</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Receive updates about your queries and datasets</div>
                    </div>
                    <button
                      id="toggle-email-notif"
                      type="button"
                      onClick={() => setEmailNotifications(!emailNotifications)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        emailNotifications ? "bg-[#1A365D] dark:bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          emailNotifications ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Auto-save Queries */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-850 pb-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-sans">Auto-save Queries</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Automatically save all executed queries</div>
                    </div>
                    <button
                      id="toggle-auto-save"
                      type="button"
                      onClick={() => setAutoSaveQueries(!autoSaveQueries)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoSaveQueries ? "bg-[#1A365D] dark:bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          autoSaveQueries ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Weekly Reports */}
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-sans">Weekly Reports</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Get weekly summaries of your research activity</div>
                    </div>
                    <button
                      id="toggle-weekly-reports"
                      type="button"
                      onClick={() => setWeeklyReports(!weeklyReports)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        weeklyReports ? "bg-[#1A365D] dark:bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          weeklyReports ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 3: Data Export Defaults */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">Data Export Defaults</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Set default formats for data exports</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-850">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-sans">Default Export Format</label>
                    <select
                      id="dropdown-export-format"
                      value={defaultExportFormat}
                      onChange={(e) => setDefaultExportFormat(e.target.value)}
                      className="block w-full max-w-xs px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1A365D] dark:focus:ring-emerald-500"
                    >
                      <option>Excel (.xlsx)</option>
                      <option>CSV (.csv)</option>
                      <option>JSON (.json)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-sans">Include Metadata</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Add source and processing information to exports</div>
                    </div>
                    <button
                      id="toggle-include-metadata"
                      type="button"
                      onClick={() => setIncludeMetadata(!includeMetadata)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        includeMetadata ? "bg-[#1A365D] dark:bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          includeMetadata ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>


            </div>
          )}

          {currentTab === "help-docs" && (
            <div id="help-tab" className="space-y-8 w-full max-w-5xl animate-fade-in pb-12">
              
              {/* Header */}
              <div className="space-y-1">
                <h1 className="text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
                  Help & Documentation
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-450">
                  Find answers and learn how to use DataMint effectively
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-1 flex items-center">
                <div className="pl-3.5 pr-2 flex items-center justify-center text-slate-450 shrink-0">
                  <Search className="w-4.5 h-4.5" />
                </div>
                <input
                  type="text"
                  placeholder="Search documentation..."
                  className="flex-1 px-2 py-2.5 text-sm bg-transparent border-none text-slate-805 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                />
                {docSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDocSearchQuery("")}
                    className="p-1 px-2 mr-1 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-md transition-all cursor-pointer border-none"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Top Three Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Documentation Card */}
                <div 
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:shadow-lg dark:hover:shadow-emerald-950/20 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center group cursor-pointer"
                  onClick={() => setDocSearchQuery("")}
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-center justify-center text-slate-700 dark:text-slate-300 mb-4 group-hover:scale-105 group-hover:text-emerald-500 group-hover:bg-emerald-500/5 group-hover:border-emerald-500/20 transition-all duration-300">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                    Documentation
                  </h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-500 leading-relaxed mt-1.5 max-w-[200px]">
                    Comprehensive guides and API reference
                  </p>
                </div>

                {/* Video Tutorials Card */}
                <div 
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:shadow-lg dark:hover:shadow-emerald-950/20 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center group cursor-pointer"
                  onClick={() => setDocSearchQuery("watch")}
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-center justify-center text-slate-700 dark:text-slate-300 mb-4 group-hover:scale-105 group-hover:text-emerald-500 group-hover:bg-emerald-500/5 group-hover:border-emerald-500/20 transition-all duration-300">
                    <Video className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                    Video Tutorials
                  </h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-550 leading-relaxed mt-1.5 max-w-[200px]">
                    Step-by-step video guides
                  </p>
                </div>

                {/* Contact Support Card with direct mail trigger and click-to-copy */}
                <div 
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:shadow-lg dark:hover:shadow-rose-950/20 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center group relative cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText("afandiahmadfikri@datamintai.tech");
                    setCopiedId("contact-support-email");
                    setTimeout(() => setCopiedId(null), 3000);
                    // trigger mailto in background
                    window.location.href = "mailto:afandiahmadfikri@datamintai.tech";
                  }}
                  title="Click to copy & open email client"
                >
                  {copiedId === "contact-support-email" && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-mono px-2 py-0.5 rounded-md animate-bounce">
                      Copied!
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-center justify-center text-slate-700 dark:text-slate-300 mb-4 group-hover:scale-105 group-hover:text-emerald-500 group-hover:bg-emerald-500/5 group-hover:border-emerald-500/20 transition-all duration-300">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                    Contact Support
                  </h3>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium truncate leading-relaxed mt-1.5 max-w-[220px]">
                    afandiahmadfikri@datamintai.tech
                  </p>
                </div>

              </div>

              {/* Grid of Two Columns (Popular Articles & Videos) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Column 1: Popular Articles */}
                <div className="bg-white dark:bg-slate-905 border border-slate-250/50 dark:border-slate-800/85 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                      Popular Articles
                    </h2>
                    <p className="text-[11px] text-slate-450 dark:text-slate-550 mt-0.5">
                      Most viewed help articles
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {[
                      {
                        title: "Getting Started with DataMint",
                        category: "Quick Start",
                        desc: "Welcome to DataMint console! First, navigate to the Home tab and compose your query in natural language (e.g., 'Gross Domestic Product of Indonesia vs inflation rate last decade'). The engine compiles indices, aligns years, resolves commas, and synthesizes download-ready tables in seconds. Use parameters in the search query to focus output precisely."
                      },
                      {
                        title: "Understanding Data Sources",
                        category: "Data Quality",
                        desc: "Data sources connect real-time or snapshot portals securely with the platform. Registered endpoints (e.g. IMF, World Bank, regional authorities) must accept headless validated REST requests. To add an indicator, configure variables, test ping latency limits, and secure headers dynamically without CORS blocks."
                      },
                      {
                        title: "Understanding Institutional Data Coverage",
                        category: "Data Registry",
                        desc: "Each international and domestic institution hosted on DataMint specializes in a distinct class of macroeconomic & financial research datasets:\n\n" +
                          "• International Monetary Fund (IMF):\n" +
                          "Delivers bilateral exchange rates, international reserves, balance of payments (BOP), financial soundness indicators (FSIs), global debt tracking, and sovereign credit/macro-financial vulnerabilities.\n\n" +
                          "• The World Bank (WB):\n" +
                          "Hosts broad world development indicators (WDI), structural variables, national poverty levels, micro-development trackers, global educational statistics (EduStats), health registers, and long-term infrastructure indices.\n\n" +
                          "• Central Banks (e.g., Federal Reserve FRED, Bank Indonesia):\n" +
                          "Provides regulatory monetary updates, reference interest rates (Fed Funds Rate, BI-Rate), domestic money supply aggregates (M1, M2, M3), composite interest spreads, commercial paper rate charts, and national treasury yield curves.\n\n" +
                          "• National Statistics Offices (e.g., BPS, USA BLS, Eurostat):\n" +
                          "Direct sources for localized micro-indicators. Best for monthly Consumer Price Index (CPI), Producer Price Index (PPI), labor market trackers, employment numbers, regional sub-provincial Gross Domestic Product (GDP), and custom export/import ledgers.\n\n" +
                          "• OECD Database:\n" +
                          "Aggregates highly normalized indicators for developed economies, containing leading indicators (CLI), tax ratios, composite societal developments, and foreign direct investment registers.\n\n" +
                          "Choose your source carefully depending on the scale and resolution of your economics model. For global cross-country studies, prioritize WB/IMF. For high-frequency domestic monetary tracking, pair Central Bank inputs with Bureau indices."
                      },
                      {
                        title: "API Integration Guide",
                        category: "Development",
                        desc: "With client-side or server-side API integration, fetch raw indicators dynamically with a custom API authorization wrapper. Open the API Playground tab to interact with REST curls or download python configurations. Add custom security headers in the options menu to map JSON parameters seamlessly."
                      }
                    ].filter(art => {
                      if (!docSearchQuery) return true;
                      const q = docSearchQuery.toLowerCase();
                      return art.title.toLowerCase().includes(q) || art.category.toLowerCase().includes(q) || art.desc.toLowerCase().includes(q);
                    }).map((art, idx) => {
                      return (
                        <div 
                          key={idx}
                          className="p-3.5 bg-slate-50/50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 shadow-xs hover:shadow-md hover:bg-white dark:hover:bg-slate-850 transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 group"
                          onClick={() => {
                            setActiveHelpArticle(art);
                            setIsFullscreenArticle(true);
                          }}
                          title="Click to read in fullscreen mode"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all duration-300">
                              <FileText className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-semibold text-slate-805 dark:text-slate-205 group-hover:text-emerald-500 transition-colors truncate">
                                {art.title}
                              </h4>
                              <span className="text-[9.5px] font-mono text-slate-400 dark:text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                {art.category}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-[10px] text-emerald-500 font-bold group-hover:underline flex items-center gap-1 shrink-0 font-mono">
                            <span>Read</span>
                            <Maximize2 className="w-3 h-3" />
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty State Articles if search mismatch */}
                    {[
                      {
                        title: "Getting Started with DataMint",
                        category: "Quick Start",
                        desc: ""
                      },
                      {
                        title: "Understanding Data Sources",
                        category: "Data Quality",
                        desc: ""
                      },
                      {
                        title: "Understanding Institutional Data Coverage",
                        category: "Data Registry",
                        desc: ""
                      },
                      {
                        title: "API Integration Guide",
                        category: "Development",
                        desc: ""
                      }
                    ].filter(art => {
                      if (!docSearchQuery) return true;
                      const q = docSearchQuery.toLowerCase();
                      return art.title.toLowerCase().includes(q) || art.category.toLowerCase().includes(q);
                    }).length === 0 && (
                      <p className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-mono">
                        No articles match "{docSearchQuery}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 2: Video Tutorials */}
                <div className="bg-white dark:bg-slate-905 border border-slate-250/50 dark:border-slate-800/85 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                      Video Tutorials
                    </h2>
                    <p className="text-[11px] text-slate-450 dark:text-slate-550 mt-0.5">
                      Learn with video guides
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {[
                      {
                        title: "Introduction to DataMint Platform",
                        duration: "5-10 min watch",
                        videoUrl: "Introducing DataMint Dashboard and Query Builder"
                      },
                      {
                        title: "Advanced Query Techniques",
                        duration: "5-10 min watch",
                        videoUrl: "Parsing multi-faceted econometric syntheses with Gemini"
                      },
                      {
                        title: "Working with Large Datasets",
                        duration: "5-10 min watch",
                        videoUrl: "Resolving Excel calculations, floating points, and formatting structures"
                      }
                    ].filter(vid => {
                      if (!docSearchQuery) return true;
                      const q = docSearchQuery.toLowerCase();
                      return vid.title.toLowerCase().includes(q) || vid.duration.toLowerCase().includes(q);
                    }).map((vid, idx) => {
                      const tutorialKey = `tutorial-${idx}`;
                      const isPlaying = activeQueryData?.id === tutorialKey;
                      return (
                        <div 
                          key={idx}
                          className="p-3 bg-slate-50/50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-850 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 hover:scale-[1.02] hover:-translate-y-0.5 shadow-xs hover:shadow-md hover:bg-white dark:hover:bg-slate-850 transition-all duration-300 cursor-pointer group"
                          onClick={() => {
                            // use query modal state dynamically for simulating video play trigger to keep UX beautiful!
                            // we'll pass simulated dataset to trigger video placeholder view in modal
                            const simulatedVidDataset = {
                              id: tutorialKey,
                              title: vid.title,
                              columns: ["Category", "Overview", "Link"],
                              data: [
                                {
                                  Category: "Video Tutorial",
                                  Overview: vid.videoUrl,
                                  Link: "https://datamintai.tech"
                                }
                              ],
                              metadata: {
                                frequency: "HD Stream 1080p",
                                unit: "Video Lesson",
                                observations: "Ready",
                                sourceUrl: "https://datamintai.tech"
                              }
                            };
                            // open fullscreen preview
                            setActiveQueryData(simulatedVidDataset as any);
                            setIsFullscreenData(true);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/10 transition-transform">
                              <Video className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-semibold text-slate-805 dark:text-slate-205 group-hover:text-emerald-500 transition-colors truncate">
                                {vid.title}
                              </h4>
                              <span className="text-[9.5px] font-mono text-slate-400 dark:text-slate-500 font-medium">
                                {vid.duration}
                              </span>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-slate-200/50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-400 group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                              <Play className="w-2.5 h-2.5 fill-current" />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {[
                      {
                        title: "Introduction to DataMint Platform",
                        duration: "5-10 min watch"
                      },
                      {
                        title: "Advanced Query Techniques",
                        duration: "5-10 min watch"
                      },
                      {
                        title: "Working with Large Datasets",
                        duration: "5-10 min watch"
                      }
                    ].filter(vid => {
                      if (!docSearchQuery) return true;
                      const q = docSearchQuery.toLowerCase();
                      return vid.title.toLowerCase().includes(q) || vid.duration.toLowerCase().includes(q);
                    }).length === 0 && (
                      <p className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-mono">
                        No videos match "{docSearchQuery}"
                      </p>
                    )}
                  </div>
                </div>

              </div>

              {/* Enhanced Interactive Contact Us section explicitly requested */}
              <div className="bg-slate-900/5 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-5 mt-4">
                <div className="space-y-1.5 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-600 dark:text-emerald-400">
                    <Mail className="w-4 h-4" />
                    <span className="text-[11px] font-bold font-mono tracking-wider uppercase">Direct Communication channel</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Need Custom Econometric Models?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-450 max-w-lg leading-relaxed">
                    Our economics team is live to configure bespoke enterprise filters, schedule complex data-source pipelines, and attach tailored indices to your portal.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("afandiahmadfikri@datamintai.tech");
                      setCopiedId("footer-copy-email");
                      setTimeout(() => setCopiedId(null), 3000);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-250 font-semibold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-emerald-500 cursor-pointer shadow-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedId === "footer-copy-email" ? "Copied!" : "afandiahmadfikri@datamintai.tech"}</span>
                  </button>
                  <a 
                    href="mailto:afandiahmadfikri@datamintai.tech"
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
                  >
                    <span>Contact Us Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Immersive Fullscreen Data Explorer Modal */}
      {isFullscreenData && activeQueryData && (
        <div 
          id="fullscreen-viewer-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-md animate-fade-in"
        >
          <div 
            id="fullscreen-viewer-box"
            className="w-full max-w-6xl h-full max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-500 text-xs font-mono font-bold tracking-wider uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Full Screen Analytical Viewer</span>
                </div>
                <h3 className="text-xl font-bold font-display text-slate-900 dark:text-white mt-1 font-sans">
                  {activeQueryData.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                  <span>Frequency: {activeQueryData.metadata?.frequency}</span>
                  <span>•</span>
                  <span>Unit: {activeQueryData.metadata?.unit}</span>
                  <span>•</span>
                  <span>Observations: {activeQueryData.metadata?.observations}</span>
                  <span>•</span>
                  <span>Source URL: <a href={activeQueryData.metadata?.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-505 hover:text-emerald-500 transition-colors select-all">{activeQueryData.metadata?.sourceUrl}</a></span>
                </div>
              </div>

              <button
                id="btn-close-fullscreen"
                type="button"
                onClick={() => setIsFullscreenData(false)}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-150 transition-all cursor-pointer shadow-xs"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>

            {/* Controls Sub-Bar */}
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    className="pl-9 pr-4 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs w-64 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                    placeholder="Search complete query rows..."
                    value={tableFilter}
                    onChange={(e) => {
                      setTableFilter(e.target.value);
                      setFullscreenPage(1);
                    }}
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Records per view:</span>
                  <select
                    value={fullscreenLimit}
                    onChange={(e) => {
                      setFullscreenLimit(Number(e.target.value));
                      setFullscreenPage(1);
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs rounded-xl focus:outline-none text-slate-705 dark:text-slate-300 font-medium cursor-pointer"
                  >
                    <option value={10}>10 records</option>
                    <option value={20}>20 records</option>
                    <option value={50}>50 records</option>
                    <option value={100}>100 records</option>
                    <option value={99999}>Show All</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-fs-excel"
                  onClick={() => {
                    triggerExcelDownload(activeQueryData);
                    saveQueryBenchmark(activeQueryData.title, currentQueryText);
                  }}
                  className="px-4 py-1.8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 dark:bg-[#10B981] dark:hover:bg-[#34D399] text-white rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Excel</span>
                </button>
                <button
                  id="btn-fs-close"
                  onClick={() => setIsFullscreenData(false)}
                  className="px-4 py-1.8 text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>

            {/* Table Display Body */}
            <div className="flex-1 overflow-auto p-6">
              <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900/55 shadow-xs animate-fade-in">
                <table className="w-full text-xs font-sans text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono tracking-wider font-bold">
                      {activeQueryData.columns?.map((col) => (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          className="px-5 py-3.5 font-bold uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none text-[11px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col}</span>
                            {sortConfig?.key === col && (
                              <span className="text-[10px] text-slate-400">
                                {sortConfig.direction === "asc" ? "▲" : "▼"}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-mono">
                    {paginatedFullscreenRows.length > 0 ? (
                      paginatedFullscreenRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          {activeQueryData.columns?.map((col) => {
                            const value = row[col];
                            const isYear = col.toLowerCase() === "year" || col.toLowerCase() === "period" || col.toLowerCase() === "date";
                            return (
                              <td 
                                key={col} 
                                className={`px-5 py-3 text-[12px] ${
                                  isYear 
                                    ? "font-bold text-slate-900 dark:text-white" 
                                    : "text-slate-600 dark:text-slate-300"
                                }`}
                              >
                                {value}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={activeQueryData.columns?.length || 1} className="text-center py-12 text-slate-400 text-sm">
                          No rows match your query filtering criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/35 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center flex-wrap gap-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-3 font-sans">
                <span>
                  Showing <strong className="text-slate-705 dark:text-slate-200">{totalFilteredRows > 0 ? fullscreenStartIndex + 1 : 0}</strong> to{" "}
                  <strong className="text-slate-705 dark:text-slate-200">{fullscreenEndIndex}</strong> of{" "}
                  <strong className="text-slate-705 dark:text-slate-200">{totalFilteredRows}</strong> records found
                </span>
                {totalFilteredRows !== activeQueryData.data?.length && (
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800/50 text-slate-400 px-2.5 py-0.5 rounded-full font-sans">
                    Filtered reference from {activeQueryData.data?.length} row units
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 font-sans">
                <button
                  type="button"
                  disabled={fullscreenPage <= 1}
                  onClick={() => setFullscreenPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-1.8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed transition-all text-slate-700 dark:text-slate-300 font-semibold cursor-pointer shadow-xs text-xs"
                >
                  Previous
                </button>
                <span className="font-mono text-xs">
                  Page <strong className="text-slate-755 dark:text-slate-200">{fullscreenPage}</strong> of {totalFullscreenPages}
                </span>
                <button
                  type="button"
                  disabled={fullscreenPage >= totalFullscreenPages}
                  onClick={() => setFullscreenPage((p) => Math.min(totalFullscreenPages, p + 1))}
                  className="px-3.5 py-1.8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed transition-all text-slate-700 dark:text-slate-300 font-semibold cursor-pointer shadow-xs text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
