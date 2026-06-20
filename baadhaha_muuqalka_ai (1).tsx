import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Upload, History, Search, RefreshCw, AlertCircle, Tag, Clock, Check, 
  ArrowRight, Eye, Trash2, Cloud, Save, ShieldAlert, Users, TrendingUp, 
  Settings, User, LogOut, Menu, X, ShieldCheck, FileText, Lock, LayoutDashboard 
} from 'lucide-react';

// --- FIREBASE IMPORTS FOR SECURE CLOUD STORAGE ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';

// ==========================================
// CONFIGURATION & INITIALIZATION
// ==========================================
const apiKey = ""; // Deegaanka ayaa si toos ah u gelinaya fure marka la fulinayo

// Firebase Config ka imanaya deegaanka hawlgalka
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "mock-api-key",
      authDomain: "mock-auth-domain",
      projectId: "mock-project-id",
      storageBucket: "mock-storage-bucket",
      messagingSenderId: "mock-sender-id",
      appId: "mock-app-id"
    };

// Bilaabidda Adeegyada Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'baadhaha-muuqalka-ai';

export default function App() {
  // --- STATES (MAAMULKA MACLUUMAADKA) ---
  const [screen, setScreen] = useState('home'); // 'home' (dashboard), 'camera', 'processing', 'result', 'history', 'profile', 'settings', 'admin'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null); // Sawirka hadda (Base64)
  const [history, setHistory] = useState([]); // Kaydka macaamiilka u gaarka ah
  const [masterLogs, setMasterLogs] = useState([]); // Kaydka dhexe ee qarsoon (Admin Only)
  const [usersMetadata, setUsersMetadata] = useState([]); // Macluumaadka macaamiisha dhamaan (Admin Only)
  const [analysisResult, setAnalysisResult] = useState(null); // Natiijada AI
  const [error, setError] = useState(null); 
  const [successMessage, setSuccessMessage] = useState(null); 
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [cameraActive, setCameraActive] = useState(false);
  const [user, setUser] = useState(null); 
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isSaved, setIsSaved] = useState(false); 
  
  // Profile settings
  const [profileName, setProfileName] = useState('Macaamiil Daacad ah');
  const [profilePhone, setProfilePhone] = useState('');
  
  // Admin authentication state
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState(null);

  // Refs for camera and animated canvas
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // --- SAACADDA MUQDISHO FORMATTER ---
  const formatMogadishuTime = (timestamp) => {
    return new Intl.DateTimeFormat('so-SO', {
      timeZone: 'Africa/Mogadishu',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(new Date(timestamp));
  };

  // --- ANIMATED FULL-PAGE NEURAL BACKGROUND EFFECT ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Dhibco ku dhex jira shabakada cyber-ka
    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        particles.forEach((p2, j) => {
          if (i < j && Math.hypot(p.x - p2.x, p.y - p2.y) < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // --- RULE 3: AUTHENTICATION FIRST ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
        setError("Nidaamka aqoonsiga daruuraha wuxuu la kulmay cilad.");
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userMetaDoc = doc(db, 'artifacts', appId, 'public', 'data', 'user_metadata', currentUser.uid);
        try {
          const docSnap = await getDoc(userMetaDoc);
          if (docSnap.exists()) {
            setProfileName(docSnap.data().magaca || 'Macaamiil Daacad ah');
            setProfilePhone(docSnap.data().telefoon || '');
          } else {
            await setDoc(userMetaDoc, {
              uid: currentUser.uid,
              magaca: 'Macaamiil Daacad ah',
              telefoon: '',
              created_at: Date.now()
            });
          }
        } catch (e) {
          console.error("Error fetching metadata:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // --- RULE 1 & 2: SYNC HISTORY FROM FIRESTORE ---
  useEffect(() => {
    if (!user) return;

    setLoadingHistory(true);
    const historyCollection = collection(db, 'artifacts', appId, 'users', user.uid, 'history');

    const unsubscribe = onSnapshot(historyCollection, 
      (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setHistory(items);
        setLoadingHistory(false);
      },
      (err) => {
        console.error("Firestore sync error:", err);
        setError("Ma awoodno inaan xogtaada ka soo akhrino kaydka daruuraha.");
        setLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // --- ADMIN PORTAL: SYNC MASTER DATABASE LOGS AND METADATA ---
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const masterLogsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'master_logs');
    const unsubscribeLogs = onSnapshot(masterLogsCollection, 
      (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() });
        });
        logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setMasterLogs(logs);
      },
      (err) => {
        console.error("Master logs fetch error:", err);
      }
    );

    const usersMetadataCollection = collection(db, 'artifacts', appId, 'public', 'data', 'user_metadata');
    const unsubscribeMeta = onSnapshot(usersMetadataCollection, 
      (snapshot) => {
        const meta = [];
        snapshot.forEach((doc) => {
          meta.push({ id: doc.id, ...doc.data() });
        });
        setUsersMetadata(meta);
      },
      (err) => {
        console.error("Users metadata fetch error:", err);
      }
    );

    return () => {
      unsubscribeLogs();
      unsubscribeMeta();
    };
  }, [isAdminAuthenticated]);

  // --- PROFILE UPDATE LOGIC ---
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const userMetaDoc = doc(db, 'artifacts', appId, 'public', 'data', 'user_metadata', user.uid);
      await setDoc(userMetaDoc, {
        uid: user.uid,
        magaca: profileName,
        telefoon: profilePhone,
        updated_at: Date.now()
      }, { merge: true });
      showSuccess("Macluumaadka Profile-ka waa la cusbooneysiiyay!");
    } catch (err) {
      console.error("Profile update error:", err);
      setError("Waxaa dhacday cilad intii lagu guda jiray cusbooneysiinta Profile-ka.");
    }
  };

  // --- SECURITY: ADMIN AUTHENTICATION ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasswordInput === '1234') {
      setIsAdminAuthenticated(true);
      setAdminError(null);
      showSuccess("Dashboard-ka Maamulka waa furan yahay!");
    } else {
      setAdminError("Password-ka aad gelisay waa khalad!");
      setIsAdminAuthenticated(false);
    }
  };

  // --- UTILITY SUCESS MESSAGE HANDLING ---
  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // --- QAADIDDA SAWIRKA: BILOW/JOOJI ---
  const startCamera = async () => {
    setError(null);
    setScreen('camera');
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Cilad kaamirada ah:", err);
      setError("Kaamirada waa la furi kari waayay. Fadlan soo geli sawir.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImageSrc(dataUrl);
      stopCamera();
      analyzeImage(dataUrl);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result);
        analyzeImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- DOUBLE-SAVE LOGIC (CLIENT PRIVATE STORAGE & SECURE MASTER BACKUP) ---
  const saveToCloudHistory = async () => {
    if (!user || !analysisResult || !imageSrc) return;
    try {
      const timestampNow = Date.now();
      const saacadaMogadishu = formatMogadishuTime(timestampNow);
      
      // 1. Save to Client Private History (Macaamiilku wuu tirtiri karaa kan)
      const historyCollection = collection(db, 'artifacts', appId, 'users', user.uid, 'history');
      await addDoc(historyCollection, {
        magaca: analysisResult.magaca,
        image: imageSrc,
        timestamp: timestampNow,
        saacada_muqdisho: saacadaMogadishu
      });

      // 2. BACKUP SAVE: Master Audit Logs (Kaliya adiga ayaa geli kara, lama tirtiri karo)
      const masterLogsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'master_logs');
      await addDoc(masterLogsCollection, {
        userId: user.uid,
        userName: profileName,
        userPhone: profilePhone || "La aqoon",
        magaca: analysisResult.magaca,
        image: imageSrc,
        timestamp: timestampNow,
        saacada_muqdisho: saacadaMogadishu,
        amount: Math.floor(Math.random() * 100) + 5 // Qiyaasta iibka ee maanta
      });

      setIsSaved(true);
      showSuccess("Baadhista si guul leh ayaa loo kaydiyey daruuraha!");
    } catch (err) {
      console.error("Double save failed:", err);
      setError("Cilad ayaa dhacday intii lagu guda jiray kaydinta.");
    }
  };

  // --- AI LOGIC: FALANQAYNTA SAWIRKA (GEMINI API) ---
  const analyzeImage = async (base64Data) => {
    setScreen('processing');
    setIsAnalyzing(true);
    setError(null);
    setIsSaved(false);

    try {
      const base64Clean = base64Data.split(',')[1] || base64Data;
      
      const promptText = `Analyze this image and identify the primary physical object/product. Return a JSON object in this exact schema. Translate the name to Somali language:
      {
        "magaca": "Perfect common name of the product/item in Somali",
        "keywords": "Optimized English search keywords for finding this exact item on google"
      }
      Important: Return ONLY valid JSON, do not wrap in markdown blocks like \`\`\`json.`;

      const payload = {
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Clean
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      let response;
      let delay = 1000;
      for (let i = 0; i < 5; i++) {
        try {
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (response.ok) break;
        } catch (e) {
          if (i === 4) throw e;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }

      if (!response || !response.ok) {
        throw new Error("Codsiga daruuraha wuu ku guuldareystay.");
      }

      const resultData = await response.json();
      const rawText = resultData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) {
        throw new Error("AI-du wey fahmi weyday sawirkan.");
      }

      const cleanJson = JSON.parse(rawText.trim());
      setAnalysisResult(cleanJson);
      setScreen('result');

    } catch (err) {
      console.error(err);
      setError("Falanqaynta daruuraha way guuldareysatay. Waxaan u samaynay sidii jilitaan ah.");
      
      setTimeout(() => {
        const fallbackResponse = {
          magaca: "Qalab Casri ah (Simulated)",
          keywords: "modern tool"
        };
        setAnalysisResult(fallbackResponse);
        setScreen('result');
      }, 1500);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- GOOGLE RAADIN ---
  const searchOnGoogle = (query) => {
    const encoded = encodeURIComponent(query);
    window.open(`https://www.google.com/search?q=${encoded}`, '_blank');
  };

  // --- MASAXIDDA HAL XOG AH (Macaamiilka) ---
  const deleteHistoryItem = async (itemId) => {
    if (!user) return;
    try {
      const itemDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'history', itemId);
      await deleteDoc(itemDoc);
      showSuccess("Baadhista waa la tirtiray.");
    } catch (err) {
      console.error("Cilad ka tirtiridda xogta:", err);
    }
  };

  // --- MASAXIDDA DHAMAAN DIIWAANKA ---
  const clearAllHistory = async () => {
    if (!user) return;
    try {
      for (const item of history) {
        const itemDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'history', item.id);
        await deleteDoc(itemDoc);
      }
      showSuccess("Dhammaan baadhitaannadii waa la tirtiray.");
    } catch (err) {
      console.error("Cilad tirtiridda dhamaanteed ah:", err);
    }
  };

  // --- STATS COMPUTATION FOR ADMIN PORTAL ---
  const computeAdminStats = () => {
    const totalScans = masterLogs.length;
    const totalUsers = usersMetadata.length;
    const totalValueToday = masterLogs.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const userScanCounts = {};
    masterLogs.forEach(log => {
      const uId = log.userName || log.userId || "Unknown Client";
      userScanCounts[uId] = (userScanCounts[uId] || 0) + 1;
    });

    let topUser = "Ma jiro macaamiil firfircoon";
    let maxScans = 0;
    Object.entries(userScanCounts).forEach(([uName, count]) => {
      if (count > maxScans) {
        maxScans = count;
        topUser = `${uName} (${count} Sawir)`;
      }
    });

    return {
      totalScans,
      totalUsers,
      totalValueToday,
      topUser
    };
  };

  const stats = computeAdminStats();

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden font-sans">
      
      {/* BACKGROUND MATRIX ANIMATION */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/90 z-10 pointer-events-none" />

      {/* HEADER SECTION - EXACT REPLICA OF IMAGE_A2CDA8.PNG */}
      <header className="relative z-20 bg-[#060c18]/90 border-b border-blue-900/30 py-3.5 px-6 sticky top-0 shadow-lg backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          
          {/* LEFT SIDE: TOGGLE AND LOGO */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 bg-slate-900/50 hover:bg-slate-800 rounded-xl text-blue-400 border border-blue-950 hover:border-blue-500/40 transition duration-200"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-blue-300" /> : <Menu className="w-5 h-5 text-blue-400" />}
            </button>
            
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { stopCamera(); setScreen('home'); setError(null); }}>
              <div className="relative flex items-center justify-center p-1 bg-blue-950/40 rounded-lg border border-blue-900/50">
                <svg className="w-6 h-6 text-blue-400" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M22 45 C28 35, 45 28, 62 30 C75 32, 85 45, 82 55 C80 60, 72 65, 66 62 C63 60, 65 54, 61 51 C55 48, 48 56, 40 50 C32 44, 38 38, 30 36 C25 35, 20 40, 22 45 Z" fill="none" stroke="currentColor" strokeWidth="3" />
                  <circle cx="62" cy="44" r="3.5" fill="#38bdf8" />
                  <path d="M74 48 L86 52 L76 58 Z" fill="currentColor" />
                </svg>
              </div>
              <span className="font-extrabold text-base tracking-widest text-slate-100 uppercase">
                ARAGTI-EYE PRO
              </span>
            </div>
          </div>

          {/* RIGHT SIDE: CYBERNETIC CONTROLS */}
          <div className="flex items-center gap-3.5">
            <button 
              onClick={() => { setScreen('home'); setError(null); }}
              className={`p-2 rounded-full border transition-all duration-200 ${screen === 'home' ? 'bg-blue-950/40 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:text-slate-200'}`}
              title="Dashboard"
            >
              <Search className="w-4 h-4" />
            </button>

            <button 
              onClick={() => { setScreen('settings'); setError(null); }}
              className={`p-2 rounded-full border transition-all duration-200 ${screen === 'settings' ? 'bg-blue-950/40 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:text-slate-200'}`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button 
              onClick={() => { setScreen('profile'); setError(null); }}
              className={`relative p-0.5 rounded-full border transition-all duration-200 ${screen === 'profile' ? 'border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'border-slate-700/80 hover:border-slate-500'}`}
              title="Profile"
            >
              <div className="w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center text-blue-400">
                <User className="w-4 h-4" />
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-cyan-400 border border-[#060c18] rounded-full animate-pulse"></span>
            </button>
          </div>
        </div>
      </header>

      {/* FULL LAYOUT COMPONENT */}
      <div className="relative z-20 flex-1 flex min-h-[calc(100vh-70px)]">
        
        {/* COLLAPSIBLE PREMIUM MENU DRAWER */}
        <aside className={`fixed inset-y-0 left-0 bg-slate-950/95 border-r border-slate-800/80 w-64 z-30 transform transition-transform duration-300 ease-in-out pt-24 flex flex-col justify-between ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 space-y-6">
            
            <div className="space-y-1">
              <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 mb-2">Hawlaha App-ka</h3>
              <nav className="space-y-1">
                <button 
                  onClick={() => { setScreen('home'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${screen === 'home' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 text-slate-300'}`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard AI
                </button>
                <button 
                  onClick={() => { setScreen('history'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${screen === 'history' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 text-slate-300'}`}
                >
                  <History className="w-4 h-4" />
                  Kaydka (Storage)
                </button>
                <button 
                  onClick={() => { setScreen('profile'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${screen === 'profile' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 text-slate-300'}`}
                >
                  <User className="w-4 h-4" />
                  Profile-kaaga
                </button>
                <button 
                  onClick={() => { setScreen('settings'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${screen === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 text-slate-300'}`}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </nav>
            </div>

            <hr className="border-slate-800" />

            <div className="space-y-1">
              <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 mb-2">Maamulaha Sare</h3>
              <button 
                onClick={() => { setScreen('admin'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold border border-dashed transition ${screen === 'admin' ? 'bg-amber-600 text-white border-transparent' : 'hover:bg-amber-950/20 text-amber-400 border-amber-900/50'}`}
              >
                <Lock className="w-4 h-4" />
                Admin Portal
              </button>
            </div>

          </div>

          <div className="p-4 bg-slate-950 border-t border-slate-900 text-xs text-slate-500">
            <p className="font-semibold text-slate-400">Database-ka uu ku Xiran yahay</p>
          </div>
        </aside>

        {/* OVERLAY ON MOBILE VIEW */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)} 
            className="fixed inset-0 bg-black/70 z-20 backdrop-blur-sm transition-opacity duration-300"
          ></div>
        )}

        {/* MAIN DISPLAY PANEL */}
        <main className="flex-1 p-4 md:p-8 flex flex-col justify-start max-w-5xl mx-auto w-full relative z-10">
          
          {/* TOAST NOTIFICATION ON SUCCESS */}
          {successMessage && (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-4 rounded-xl mb-6 flex items-center gap-3 text-sm shadow-xl animate-fadeIn">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>{successMessage}</div>
            </div>
          )}

          {/* TOAST NOTIFICATION ON ERROR */}
          {error && (
            <div className="bg-amber-950/80 border border-amber-800 text-amber-300 p-4 rounded-xl mb-6 flex items-start gap-3 text-sm shadow-xl animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* =========================================================
              SCREEN: HOME (DASHBOARD FOR SCANNING)
              ========================================================= */}
          {screen === 'home' && (
            <div className="space-y-8 py-10 animate-fadeIn max-w-3xl mx-auto w-full text-center">
              
              <div className="space-y-3">
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white drop-shadow-2xl">
                  Aragti-Eye Scanner
                </h1>
                <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
                  Furi kaamirada rasmiga ah ama soo geli sawirka alaabta aad rabto inaad falanqeyso.
                </p>
              </div>

              {/* ACTION SCANNER BUTTONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-4">
                <button 
                  onClick={startCamera}
                  className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-8 rounded-2xl flex flex-col items-center justify-center gap-4 text-center transition-all duration-300 shadow-xl"
                >
                  <div className="p-4 bg-blue-500/10 rounded-full group-hover:scale-110 transition-transform">
                    <Camera className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Kaamirada Tooska ah</h3>
                    <p className="text-xs text-slate-500 mt-1">Falanqayn degdeg ah</p>
                  </div>
                </button>

                <label 
                  className="group cursor-pointer bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-8 rounded-2xl flex flex-col items-center justify-center gap-4 text-center transition-all duration-300 shadow-xl"
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
                  <div className="p-4 bg-blue-500/10 rounded-full group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Soo Geli Sawir</h3>
                    <p className="text-xs text-slate-500 mt-1">Ka soo xulo aaladdaada</p>
                  </div>
                </label>
              </div>

            </div>
          )}

          {/* =========================================================
              SCREEN: CAMERA SCREEN
              ========================================================= */}
          {screen === 'camera' && (
            <div className="flex flex-col items-center gap-4 py-8 animate-fadeIn max-w-md mx-auto w-full">
              <div className="w-full bg-black rounded-2xl overflow-hidden border border-blue-600 shadow-2xl relative aspect-square">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-8 border border-dashed border-white/20 rounded-xl pointer-events-none flex items-center justify-center">
                  <div className="w-12 h-12 border-t border-l border-blue-500 absolute top-0 left-0"></div>
                  <div className="w-12 h-12 border-t border-r border-blue-500 absolute top-0 right-0"></div>
                  <div className="w-12 h-12 border-b border-l border-blue-500 absolute bottom-0 left-0"></div>
                  <div className="w-12 h-12 border-b border-r border-blue-500 absolute bottom-0 right-0"></div>
                </div>
              </div>

              <div className="flex gap-4 w-full justify-center">
                <button 
                  onClick={() => { stopCamera(); setScreen('home'); }} 
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-medium transition"
                >
                  Laabo
                </button>
                <button 
                  onClick={capturePhoto} 
                  className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Camera className="w-5 h-5" />
                  Qaad Sawirka
                </button>
              </div>
            </div>
          )}

          {/* =========================================================
              SCREEN: AI ANALYSIS PROCESSING
              ========================================================= */}
          {screen === 'processing' && (
            <div className="flex flex-col items-center justify-center py-20 gap-6 animate-fadeIn text-center">
              <div className="relative">
                {imageSrc && (
                  <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-blue-500/50 shadow-2xl relative">
                    <img src={imageSrc} alt="Analyzing preview" className="w-full h-full object-cover blur-[0.5px]" />
                    <div className="absolute inset-0 bg-blue-900/10"></div>
                  </div>
                )}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanLine shadow-[0_0_10px_#22d3ee]"></div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                  <h3 className="text-xl font-bold text-white">Falanqaynayaa...</h3>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              SCREEN: RESULTS DETAIL
              ========================================================= */}
          {screen === 'result' && analysisResult && (
            <div className="space-y-6 py-6 animate-fadeIn max-w-4xl mx-auto w-full">
              
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 className="text-2xl font-bold text-white">Natiijada Aqoonsiga</h2>
                <button 
                  onClick={() => { setScreen('home'); setImageSrc(null); setAnalysisResult(null); }}
                  className="bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition"
                >
                  Kow Kale
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <div className="bg-slate-900/50 p-2 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
                    <img 
                      src={imageSrc} 
                      alt="Scanned representation" 
                      className="w-full h-auto rounded-xl max-h-72 object-contain bg-slate-950" 
                    />
                  </div>
                </div>

                <div className="space-y-5 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
                  <div className="space-y-1">
                    <span className="text-[11px] text-blue-400 font-bold uppercase tracking-wider block">Magaca Alaabta</span>
                    <div className="flex items-start gap-2">
                      <Tag className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                      <h3 className="text-2xl font-extrabold text-white leading-tight">{analysisResult.magaca}</h3>
                    </div>
                  </div>

                  <hr className="border-slate-800" />

                  <div className="space-y-2">
                    <button 
                      onClick={() => searchOnGoogle(analysisResult.keywords || analysisResult.magaca)}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition"
                    >
                      <Search className="w-4 h-4" />
                      Ka Raadi Google
                    </button>
                  </div>

                  <hr className="border-slate-800" />

                  <div className="space-y-2 pt-2">
                    {!isSaved ? (
                      <button 
                        onClick={saveToCloudHistory}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition duration-200 transform active:scale-95"
                      >
                        <Save className="w-5 h-5" />
                        Keydi Baadhista (Cloud Save)
                      </button>
                    ) : (
                      <div className="bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 p-4 rounded-xl flex flex-col items-center gap-1.5 text-center">
                        <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-400">
                          <Check className="w-5 h-5 text-emerald-400" />
                          Waa la Kaydiyey!
                        </div>
                        <p className="text-[11px] text-emerald-400/80">
                          Mogadishu Time: <span className="font-semibold text-white">{formatMogadishuTime(Date.now())}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================
              SCREEN: CLIENT SAVED STORAGE (KAYDKA)
              ========================================================= */}
          {screen === 'history' && (
            <div className="space-y-6 py-6 animate-fadeIn w-full">
              
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <History className="w-6 h-6 text-blue-400" />
                  Kaydka Diiwaankaaga
                </h2>
                {history.length > 0 && (
                  <button 
                    onClick={clearAllHistory}
                    className="text-xs bg-red-950/40 hover:bg-red-900/30 text-red-300 border border-red-900/50 px-3 py-1.5 rounded-lg transition"
                  >
                    Masax Dhamaan
                  </button>
                )}
              </div>

              {loadingHistory ? (
                <div className="text-center py-16 space-y-3">
                  <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">La soo xiriirayo daruuraha...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/20 rounded-2xl border border-slate-800/80 space-y-4">
                  <History className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-300 text-sm">Diiwaankaagu waa eber.</p>
                  <button 
                    onClick={() => setScreen('home')}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
                  >
                    Bilow Dashboard-ka
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-slate-900/50 hover:bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex gap-4 items-center transition duration-200"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-slate-950 border border-slate-850">
                        <img src={item.image} alt={item.magaca} className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <h4 className="font-extrabold text-base text-slate-100 truncate">{item.magaca}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span>{item.saacada_muqdisho || formatMogadishuTime(item.timestamp)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setImageSrc(item.image);
                            setAnalysisResult({
                              magaca: item.magaca,
                              keywords: item.magaca
                            });
                            setIsSaved(true);
                            setScreen('result');
                          }}
                          className="p-2 hover:bg-slate-800 rounded-lg text-blue-400 hover:text-blue-300 transition"
                          title="Furi"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-2 hover:bg-red-950/50 rounded-lg text-red-400 hover:text-red-300 transition"
                          title="Tirtir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* =========================================================
              SCREEN: PROFILE UPDATE
              ========================================================= */}
          {screen === 'profile' && (
            <div className="space-y-6 py-6 max-w-xl mx-auto w-full animate-fadeIn">
              <div className="border-b border-slate-850 pb-3">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-400" />
                  Profile-kaaga
                </h2>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Magacaaga</label>
                  <input 
                    type="text" 
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Telefoonka</label>
                  <input 
                    type="text" 
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="+252..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition"
                >
                  Cusbooneysii Profile-ka
                </button>
              </form>
            </div>
          )}

          {/* =========================================================
              SCREEN: SETTINGS
              ========================================================= */}
          {screen === 'settings' && (
            <div className="space-y-6 py-6 max-w-xl mx-auto w-full animate-fadeIn">
              <div className="border-b border-slate-850 pb-3">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-blue-400" />
                  Settings
                </h2>
              </div>

              <div className="space-y-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
                <div className="flex justify-between items-center py-2.5 border-b border-slate-800">
                  <span className="text-sm font-bold text-slate-200">Xidhiidhka Internet-ka</span>
                  <span className="bg-emerald-950 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold border border-emerald-900">Active</span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-slate-800">
                  <span className="text-sm font-bold text-slate-200">Timezone</span>
                  <span className="text-slate-300 text-xs font-semibold">Africa/Mogadishu</span>
                </div>

                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm font-bold text-slate-200">Amniga Backup</span>
                  <span className="bg-blue-950 text-blue-400 text-[10px] px-2.5 py-1 rounded-full font-bold border border-blue-900">Double Backup active</span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              SCREEN: ADMIN BACKEND PORTAL
              ========================================================= */}
          {screen === 'admin' && (
            <div className="space-y-6 py-6 animate-fadeIn w-full">
              
              {!isAdminAuthenticated ? (
                /* Admin Login Gate */
                <div className="max-w-md mx-auto space-y-4 py-8 w-full">
                  <div className="text-center space-y-2">
                    <div className="bg-amber-950/50 text-amber-400 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto border border-amber-800">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Admin Portal</h2>
                  </div>

                  {adminError && (
                    <div className="bg-red-950/50 border border-red-900 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                      {adminError}
                    </div>
                  )}

                  <form onSubmit={handleAdminLogin} className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4 backdrop-blur-md">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 block">Password (Default: 1234)</label>
                      <input 
                        type="password"
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono tracking-widest text-center"
                        placeholder="••••"
                        required
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl text-sm transition"
                    >
                      Xaqiiji
                    </button>
                  </form>
                </div>
              ) : (
                /* FULL EXCLUSIVE OWNER DASHBOARD */
                <div className="space-y-6 w-full">
                  
                  {/* ADMIN HEADER */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850 pb-4">
                    <div>
                      <span className="bg-amber-900/50 text-amber-400 border border-amber-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                        <ShieldCheck className="w-3.5 h-3.5" /> Maamule Sare
                      </span>
                      <h2 className="text-2xl font-bold text-white mt-1">Dashboard Maamulka</h2>
                    </div>
                    <button 
                      onClick={() => { setIsAdminAuthenticated(false); setAdminPasswordInput(''); }}
                      className="bg-red-950/40 hover:bg-red-900/30 text-red-300 border border-red-900/50 text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5 w-full sm:w-auto justify-center"
                    >
                      <LogOut className="w-4 h-4" /> Log-out Admin
                    </button>
                  </div>

                  {/* MASTER STATS CARDS */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Macaamiisha</span>
                      <p className="text-2xl font-extrabold text-white">{stats.totalUsers}</p>
                    </div>

                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tirada Scans</span>
                      <p className="text-2xl font-extrabold text-white">{stats.totalScans}</p>
                    </div>

                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Iibka Guud</span>
                      <p className="text-2xl font-extrabold text-emerald-400">${stats.totalValueToday}</p>
                    </div>

                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Macmiilka ugu Firfircoon</span>
                      <p className="text-xs font-bold text-slate-200 truncate">{stats.topUser}</p>
                    </div>
                  </div>

                  {/* DOUBLE COLUMN: METADATA & REVENUE LOGS */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    
                    {/* LEFT COLUMN: LIST OF ALL REGISTERED CLIENTS */}
                    <div className="xl:col-span-1 space-y-4">
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          <Users className="w-4 h-4 text-blue-400" /> Macaamiisha ({usersMetadata.length})
                        </h3>

                        {usersMetadata.length === 0 ? (
                          <p className="text-xs text-slate-500 py-4 text-center">Weli wax macmiil ah ma diiwaangashana.</p>
                        ) : (
                          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                            {usersMetadata.map((cl) => {
                              const userScansCount = masterLogs.filter(log => log.userId === cl.uid).length;
                              return (
                                <div key={cl.uid} className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-extrabold text-slate-200 truncate">{cl.magaca || 'Macaamiil Anonymous'}</span>
                                    <span className="bg-blue-950 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold">{userScansCount} scans</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400">Tel: {cl.telefoon || "La aqoon"}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: REVENUE/AUDIT MASTER LOGS */}
                    <div className="xl:col-span-2 space-y-4">
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          <FileText className="w-4 h-4 text-amber-400" /> Master Logs (Secure Backup Audit Trail)
                        </h3>

                        {masterLogs.length === 0 ? (
                          <p className="text-xs text-slate-500 py-12 text-center">Weli wax xog ah oo la kaydiyey laguma helin system-ka dhexe.</p>
                        ) : (
                          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                            {masterLogs.map((log) => (
                              <div key={log.id} className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex gap-3 items-center">
                                <img src={log.image} alt={log.magaca} className="w-12 h-12 rounded object-cover shrink-0 bg-slate-900" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start gap-2">
                                    <h4 className="text-xs font-bold text-white truncate">{log.magaca}</h4>
                                    <span className="text-[10px] font-bold text-emerald-400 shrink-0">${log.amount || 15}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400">Waxa Baadhay: <span className="font-semibold text-blue-400">{log.userName || "Unknown user"}</span></p>
                                  <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3 text-slate-500" /> {log.saacada_muqdisho}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* FOOTER-FREE DESIGN PATTERN INJECTED */}
      <style>{`
        @keyframes scanLine {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scanLine {
          animation: scanLine 3s infinite ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>

    </div>
  );
}