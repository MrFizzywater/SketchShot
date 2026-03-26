import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, Camera, FileText, ChevronRight, Layout, 
  CheckCircle2, AlertCircle, Wand2, Printer, Sparkles, 
  BrainCircuit, Loader2, Quote, Zap, ArrowLeft, ImageIcon, 
  X, Download, Upload, Save, Maximize2, Map, ScrollText, 
  VenetianMask, ChevronUp, ChevronDown, Clapperboard, 
  UserPlus, ArrowUp, ArrowDown, Cloud, CloudOff, GitBranch, LogOut, Lock
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, signInWithPopup, 
  GoogleAuthProvider, GithubAuthProvider, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot 
} from 'firebase/firestore';

// --- ENVIRONMENT INITIALIZATION & SAFE KEY EXTRACTION ---
let firebaseConfig = {};
let globalGeminiKey = "";

if (typeof __firebase_config !== 'undefined') {
  firebaseConfig = JSON.parse(__firebase_config);
} else {
  try {
    firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
    // Extract the Gemini key securely here to bypass Vite compiler warnings
    globalGeminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  } catch (e) { /* Ignore in strict environments */ }
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'sketchshot-app';

const SHOT_TYPES = ['Wide', 'Medium', 'Close Up', 'POV', 'Over the Shoulder', 'Insert', 'Drone', 'Tracking'];
const SCENE_TYPES = ['Interior', 'Exterior', 'Studio', 'Green Screen', 'Vehicle', 'Found Footage'];
const TONES = ['Absurdist', 'Disruptive / Cringe', 'Deadpan', 'Slapstick', 'Satire', 'Surreal', 'Mockumentary', 'Cinematic'];

const App = () => {
  // --- AUTH STATE ---
  const [user, setUser] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  
  // A "Real User" is explicitly someone logged in via Google/GitHub, not a lingering anonymous session
  const isRealUser = user && !user.isAnonymous;

  const [sketches, setSketches] = useState([
    { 
      id: '1', title: 'The Hot Dog Suit Incident', sceneType: 'Interior', tone: 'Disruptive / Cringe', characters: 'Greg, The Hot Dog Man, Mourners', props: 'Casket, Mustard, Industrial Zipper, Floral Arrangement',
      hook: 'Main character arrives at a somber funeral wearing a full-body hot dog costume.', escalation: 'He claims he can\'t take it off because of a "zipper tragedy" and starts getting defensive about the mustard stains.', ending: 'The pallbearers realize the casket is also shaped like a giant bun.', script: ''
    }
  ]);
  const [activeSketchId, setActiveSketchId] = useState('1');
  const [shots, setShots] = useState([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState('storyboard'); 
  const [shootPlan, setShootPlan] = useState([]);
  const [loadingStates, setLoadingStates] = useState({});
  const [zoomedImage, setZoomedImage] = useState(null);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const fileInputRef = useRef(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Connect the securely extracted key to the component
  const apiKey = globalGeminiKey; 

  // --- AUTHENTICATION LISTENER ---
  useEffect(() => {
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
      signInWithCustomToken(auth, __initial_auth_token).catch(console.error);
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthResolved(true);
    });
    return () => unsubscribe();
  }, []);

  // --- FIRESTORE DATA SYNC (READ) ---
  useEffect(() => {
    if (!isRealUser) return;
    
    const sketchesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'sketches');
    const unsubSketches = onSnapshot(sketchesRef, (snap) => {
      if (!snap.empty && !dataLoaded) {
        setSketches(snap.docs.map(d => ({id: d.id, ...d.data()})));
      }
    }, (err) => console.error("Sketches sync error:", err));

    const shotsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'shots');
    const unsubShots = onSnapshot(shotsRef, (snap) => {
      if (!snap.empty && !dataLoaded) {
        setShots(snap.docs.map(d => ({id: d.id, ...d.data()})));
        setDataLoaded(true); 
      }
    }, (err) => console.error("Shots sync error:", err));

    return () => { unsubSketches(); unsubShots(); };
  }, [isRealUser, user, dataLoaded]);

  const loginWithProvider = async (providerName) => {
    const provider = providerName === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
    try { await signInWithPopup(auth, provider); } 
    catch (err) { console.error("Login failed:", err); }
  };

  // ==========================================
  // AUTH GUARD: REQUIRE LOGIN OR GUEST MODE
  // ==========================================
  if (!authResolved) {
    return <div className="h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={32} /></div>;
  }

  if (!isRealUser && !isGuest) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-100 font-sans selection:bg-orange-500/30 p-6">
        <div className="max-w-sm w-full p-10 bg-zinc-900/50 border border-zinc-800 rounded-[3rem] text-center space-y-10 backdrop-blur-xl shadow-2xl">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto border-4 border-zinc-900 shadow-inner">
              <Camera className="text-orange-500" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">SKETCHSHOT</h1>
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-1">Production Rig</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <button onClick={() => loginWithProvider('google')} className="w-full flex justify-center items-center gap-3 px-4 py-4 text-xs font-black bg-zinc-100 hover:bg-white text-zinc-900 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              CONTINUE WITH GOOGLE
            </button>
            <button onClick={() => loginWithProvider('github')} className="w-full flex justify-center items-center gap-3 px-4 py-4 text-xs font-black bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl transition-all border border-zinc-700 hover:border-zinc-500 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              <GitBranch size={16} /> CONTINUE WITH GITHUB
            </button>
            <button onClick={() => setIsGuest(true)} className="w-full flex justify-center items-center gap-3 px-4 py-4 text-xs font-black bg-transparent hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 rounded-2xl transition-all mt-2">
              CONTINUE AS GUEST (Manual Mode)
            </button>
          </div>
          
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">AI Features Require Login</p>
        </div>
      </div>
    );
  }
  // ==========================================

  const activeSketch = sketches.find(s => s.id === activeSketchId) || sketches[0];
  const activeShots = shots.filter(s => s.sketchId === activeSketchId).sort((a, b) => a.number - b.number);
  const currentDisplayList = viewMode === 'shoot-plan' && shootPlan.length > 0 ? shootPlan : activeShots;
  const availableCharacters = activeSketch?.characters ? activeSketch.characters.split(',').map(c => c.trim()).filter(Boolean) : [];

  // --- FIRESTORE DATA SYNC (WRITE) ---
  const pushToCloud = async () => {
    if (!isRealUser) return;
    setIsSyncing(true);
    try {
      for (const s of sketches) {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sketches', s.id), s, { merge: true });
      }
      for (const s of shots) {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'shots', s.id), s, { merge: true });
      }
    } catch (err) { console.error("Cloud push failed:", err); }
    setTimeout(() => setIsSyncing(false), 1000);
  };

  // --- CRUD OPERATIONS ---
  const toggleShotCharacter = (shotId, charName) => {
    setShots(shots.map(s => {
      if (s.id !== shotId) return s;
      const currentChars = s.shotCharacters || [];
      return currentChars.includes(charName) 
        ? { ...s, shotCharacters: currentChars.filter(c => c !== charName) }
        : { ...s, shotCharacters: [...currentChars, charName] };
    }));
  };

  const updateSketch = (id, field, value) => setSketches(sketches.map(s => s.id === id ? { ...s, [field]: value } : s));
  const updateShot = (id, field, value) => setShots(shots.map(s => s.id === id ? { ...s, [field]: value } : s));
  
  const addShot = () => {
    const nextNumber = activeShots.length > 0 ? Math.max(...activeShots.map(s => s.number)) + 1 : 1;
    setShots([...shots, { id: Date.now().toString(), sketchId: activeSketchId, number: nextNumber, type: 'Medium', subject: '', action: '', notes: '', dialogue: '', fx: false, image: null, locationCaveat: '', shotCharacters: [] }]);
  };
  
  const moveShot = (currentIndex, direction) => {
    if (viewMode !== 'storyboard') return;
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= activeShots.length) return;
    const currentShot = activeShots[currentIndex];
    const targetShot = activeShots[newIndex];
    const currentNumber = currentShot.number;
    currentShot.number = targetShot.number;
    targetShot.number = currentNumber;
    setShots(shots.map(s => {
      if (s.id === currentShot.id) return { ...s, number: currentShot.number };
      if (s.id === targetShot.id) return { ...s, number: targetShot.number };
      return s;
    }));
  };

  // --- EXPORT ENGINES ---
  const exportSnapshot = () => {
    const data = { version: "1.2", timestamp: new Date().toISOString(), sketches, shots };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `SketchShot_Backup_${new Date().getTime()}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleImportClick = () => {
    if(fileInputRef.current) fileInputRef.current.click();
  };

  const importSnapshot = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result);
        if (content.sketches && content.shots) {
          setSketches(content.sketches); setShots(content.shots);
          if (content.sketches.length > 0) setActiveSketchId(content.sketches[0].id);
        }
      } catch (err) { console.error("Failed to import snapshot", err); }
    };
    reader.readAsText(file);
  };

  const downloadShootPlan = () => {
    if (!shootPlan || shootPlan.length === 0) return;
    const safeTitle = activeSketch?.title?.toUpperCase() || 'UNTITLED';
    let planText = `SHOOT PLAN: ${safeTitle}\n=========================================\n\nSCENE: ${activeSketch?.sceneType || 'N/A'}\nCHARACTERS: ${activeSketch?.characters || 'N/A'}\nPROPS: ${activeSketch?.props || 'N/A'}\n\n=========================================\n\n`;
    shootPlan.forEach((shot, index) => {
      planText += `${index + 1}. [${shot.type.toUpperCase()}] ${shot.subject.toUpperCase()}\n`;
      if (shot.locationCaveat) planText += `   Location: ${shot.locationCaveat}\n`;
      if (shot.shotCharacters?.length > 0) planText += `   Characters: ${shot.shotCharacters.join(', ')}\n`;
      if (shot.action) planText += `   Action: ${shot.action}\n`;
      if (shot.dialogue) planText += `   Dialogue: "${shot.dialogue}"\n`;
      if (shot.notes) planText += `   Notes: ${shot.notes}\n`;
      if (shot.fx) planText += `   *** FX REQUIRED ***\n`;
      if (shot.optimizationReason) planText += `   AD Note: ${shot.optimizationReason}\n`;
      planText += `\n-----------------------------------------\n\n`;
    });
    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `SketchShot_ShootPlan.txt`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const downloadScript = () => {
    if (!activeSketch?.script) return;
    const blob = new Blob([activeSketch.script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `SketchShot_Script.txt`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const downloadImage = (imageUrl, shotNumber) => {
    const link = document.createElement('a');
    link.href = imageUrl; link.download = `SketchShot_Storyboard_Shot_${shotNumber}.png`; link.click();
  };

  // --- GEMINI HELPERS ---
  const callGemini = async (prompt, systemPrompt = "", isJson = false) => {
    if (!apiKey) throw new Error("API Key is missing. Ensure VITE_GEMINI_API_KEY is set in your Coolify environment variables.");
    
    const maxRetries = 5; let delay = 1000;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
        if (isJson) payload.generationConfig = { responseMimeType: "application/json" };
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        
        // Safety net to catch 403s before they crash the JSON parser
        if (!response.ok) {
          throw new Error(`Google API threw a ${response.status}. Your API key might be missing, invalid, or lacking permissions.`);
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        return isJson ? JSON.parse(text) : text;
      } catch (error) {
        if (i === maxRetries - 1) {
          alert(`AI Engine Error: ${error.message}`);
          throw error;
        }
        await new Promise(r => setTimeout(r, delay)); delay *= 2;
      }
    }
  };

  const generateAISHots = async () => {
    setLoadingStates(prev => ({ ...prev, genShots: true }));
    try {
      const systemPrompt = `Expert comedy director. Generate JSON array of 8 shots: "type", "subject", "action", "notes", "dialogue", "shotCharacters" (array of strings selected from the provided sketch characters).`;
      const prompt = `TONE: ${activeSketch.tone}\nCHARACTERS AVAILABLE: ${activeSketch.characters}\nHOOK: ${activeSketch.hook}\nESCALATION: ${activeSketch.escalation}\nENDING: ${activeSketch.ending}`;
      const newShotsData = await callGemini(prompt, systemPrompt, true);
      if (newShotsData) {
        setShots([...shots, ...newShotsData.map((s, idx) => ({ 
          ...s, id: `ai-${Date.now()}-${idx}`, sketchId: activeSketchId, number: activeShots.length + idx + 1, 
          fx: false, image: null, locationCaveat: '', shotCharacters: Array.isArray(s.shotCharacters) ? s.shotCharacters : [] 
        }))]);
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, genShots: false })); }
  };

  const optimizeShootOrder = async () => {
    setLoadingStates(prev => ({ ...prev, optimizing: true }));
    try {
      const systemPrompt = `Expert 1st AD. Reorder shots into most efficient SHOOT ORDER. Group by Location Caveats, Shot Types, and active Characters. Return JSON array of objects with 'id' and 'reason'.`;
      const prompt = `Scene: ${activeSketch.title}\nShots: ${activeShots.map(s => `ID: ${s.id}, Type: ${s.type}, Subject: ${s.subject}, Location: ${s.locationCaveat || 'Base'}, Chars: ${(s.shotCharacters||[]).join(',')}`).join('\n')}`;
      const optimizedIds = await callGemini(prompt, systemPrompt, true);
      if (optimizedIds) {
        setShootPlan(optimizedIds.map((item, idx) => ({ ...activeShots.find(s => s.id === item.id), shootOrderNumber: idx + 1, optimizationReason: item.reason })));
        setViewMode('shoot-plan');
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, optimizing: false })); }
  };

  const generateStoryboardFrame = async (shotId) => {
    if (!apiKey) {
      alert("API Key is missing. Please set VITE_GEMINI_API_KEY.");
      return;
    }
    
    setLoadingStates(prev => ({ ...prev, [shotId]: true }));
    const shot = shots.find(s => s.id === shotId);
    const charsContext = shot.shotCharacters?.length > 0 ? shot.shotCharacters.join(', ') : activeSketch.characters;
    const promptText = `A rough black and white pencil sketch storyboard frame for a comedy sketch titled "${activeSketch.title}". Context: ${shot.locationCaveat || activeSketch.sceneType}. Characters in frame: ${charsContext}. Action/Subject: A ${shot.type} shot of ${shot.subject}. Action: ${shot.action}. Notes: ${shot.notes}. Style: Traditional hand-drawn graphite pencil storyboard, rough sketch, cinematic framing.`;
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: [{ prompt: promptText }], parameters: { sampleCount: 1 } })
      });
      
      if (!response.ok) {
        throw new Error(`Google API threw a ${response.status}. The Imagen model might be locked for your account/region, or your key is missing.`);
      }

      const result = await response.json();
      updateShot(shotId, 'image', `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`);
    } catch (err) { 
      console.error(err);
      alert(`Storyboard Failed: ${err.message}`); 
    } finally { 
      setLoadingStates(prev => ({ ...prev, [shotId]: false })); 
    }
  };

  const generateScript = async () => {
    setLoadingStates(prev => ({ ...prev, script: true }));
    try {
      const systemPrompt = `You are an expert comedy writer specializing in ${activeSketch.tone} humor. Turn this shot list and outline into a formatted script. Use standard screenplay format. Make it funny, coherent, and match the specified tone perfectly.`;
      const prompt = `Title: ${activeSketch.title}\nTone: ${activeSketch.tone}\nCharacters: ${activeSketch.characters}\nProps: ${activeSketch.props}\nHook: ${activeSketch.hook}\nEscalation: ${activeSketch.escalation}\nEnding: ${activeSketch.ending}\n\nShot List:\n${activeShots.map(s => `Shot ${s.number} (${s.type}): ${s.subject}\nAction: ${s.action}\nNotes: ${s.notes}\nDialogue: ${s.dialogue}`).join('\n\n')}`;
      const scriptContent = await callGemini(prompt, systemPrompt, false);
      if (scriptContent) {
        updateSketch(activeSketchId, 'script', scriptContent);
        setViewMode('script');
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, script: false })); }
  };

  const generateTextAssist = async (shotId, field, rolePrompt, contextPrompt) => {
    setLoadingStates(prev => ({ ...prev, [`${field}-${shotId}`]: true }));
    const shot = shots.find(s => s.id === shotId);
    try {
      const prompt = `${contextPrompt}\nCharacters in shot: ${(shot.shotCharacters||[]).join(', ')}\nCurrent text: ${shot[field] || '[Empty]'}`;
      const newText = await callGemini(prompt, `${rolePrompt} Keep it under 2 sentences. Punch it up if text exists.`, false);
      if (newText) updateShot(shotId, field, newText.trim());
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, [`${field}-${shotId}`]: false })); }
  };

  const generateNarrativeBeat = async (beatType) => {
    setLoadingStates(prev => ({ ...prev, [beatType]: true }));
    try {
      const systemPrompt = `Brilliant comedy writer (${activeSketch.tone || 'comedic'} humor). Provide a punchy, creative ${beatType} for the sketch. Keep it under 3 sentences. Punch it up if text exists.`;
      const prompt = `Title: ${activeSketch.title}\nCharacters: ${activeSketch.characters}\nCurrent Hook: ${activeSketch.hook}\nCurrent Escalation: ${activeSketch.escalation}\nCurrent Ending: ${activeSketch.ending}\nTask: Write/Improve the ${beatType.toUpperCase()}.`;
      const newBeat = await callGemini(prompt, systemPrompt, false);
      if (newBeat) updateSketch(activeSketchId, beatType, newBeat.trim());
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, [beatType]: false })); }
  };

  if (viewMode === 'print') {
    return (
      <div className="min-h-screen bg-white text-black p-12 font-serif">
        <button onClick={() => setViewMode('storyboard')} className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-xs font-bold print:hidden">
          <ArrowLeft size={14} /> BACK
        </button>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="border-b-4 border-black pb-4 flex justify-between items-end">
            <h1 className="text-4xl font-black uppercase tracking-tighter">{activeSketch.title}</h1>
            <div className="text-right text-[10px] font-bold uppercase">{new Date().toLocaleDateString()}</div>
          </div>
          <div className="grid grid-cols-2 gap-8 border-b border-black pb-4 text-sm">
            <p><strong>TYPE:</strong> {activeSketch.sceneType}</p>
            <p><strong>CHARACTERS:</strong> {activeSketch.characters || 'N/A'}</p>
            <p className="col-span-2"><strong>PROPS:</strong> {activeSketch.props || 'None'}</p>
          </div>
          <div className="space-y-2 text-sm">
            <p><strong>HOOK:</strong> {activeSketch.hook}</p>
            <p><strong>ESCALATION:</strong> {activeSketch.escalation}</p>
            <p><strong>ENDING:</strong> {activeSketch.ending}</p>
          </div>
          <div className="space-y-4">
            <table className="w-full text-left border-collapse">
              <thead><tr className="border-b-2 border-black text-[10px] font-black uppercase tracking-widest"><th className="py-2 w-12">#</th><th className="py-2 w-24">Type</th><th className="py-2">Details & Action</th><th className="py-2 w-16">FX</th></tr></thead>
              <tbody>
                {currentDisplayList.map((shot, idx) => (
                  <tr key={shot.id} className="border-b border-zinc-200 align-top">
                    <td className="py-4 font-bold">{idx + 1}</td>
                    <td className="py-4 font-bold text-[10px] uppercase">
                      {shot.type}
                      {shot.shotCharacters?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {shot.shotCharacters.map(c => <span key={c} className="block text-[8px] bg-zinc-100 px-1 py-0.5 rounded border border-zinc-300 w-fit">{c}</span>)}
                        </div>
                      )}
                    </td>
                    <td className="py-4 space-y-1">
                      <p className="font-bold">{shot.subject}</p>
                      {shot.action && <p className="text-sm">{shot.action}</p>}
                      {shot.dialogue && <p className="text-xs italic">"{shot.dialogue}"</p>}
                      {shot.notes && <p className="text-[10px] text-zinc-500">Note: {shot.notes}</p>}
                    </td>
                    <td className="py-4 font-black text-xs">{shot.fx ? 'YES' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30">
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden bg-zinc-900 border-r border-zinc-800 flex flex-col`}>
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tighter flex items-center gap-2">
            <Camera className="text-orange-500" size={20} /> SKETCHSHOT
          </h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-3 mb-2">My Sketches</div>
          {sketches.map(sketch => (
            <button key={sketch.id} onClick={() => setActiveSketchId(sketch.id)} className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${activeSketchId === sketch.id ? 'bg-zinc-800 text-orange-400' : 'text-zinc-400'}`}>
              <FileText size={16} /> <span className="truncate flex-1 font-medium">{sketch.title || 'Untitled'}</span>
            </button>
          ))}
          <button onClick={() => { const id = Date.now().toString(); setSketches([...sketches, { id, title: 'New Sketch', sceneType: 'Interior', tone: 'Absurdist', characters: '', props: '', hook: '', escalation: '', ending: '', script: '' }]); setActiveSketchId(id); }} className="w-full mt-4 flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-200"><Plus size={14} /> NEW SKETCH</button>
        </nav>

        {/* CLOUD SYNC & LOGOUT PANEL */}
        <div className="p-4 border-t border-zinc-800 space-y-3 bg-zinc-950/50">
          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Cloud className="text-green-500" size={14} /> Cloud Rig
          </div>
          
          <div className="space-y-2">
            <div className="text-xs text-zinc-400 truncate flex items-center justify-between">
              <span>{isRealUser ? user.email : 'Guest Viewer'}</span>
              {isRealUser ? (
                <button onClick={() => signOut(auth)} className="text-red-400 hover:text-red-300" title="Sign Out"><LogOut size={14} /></button>
              ) : (
                <button onClick={() => { setIsGuest(false); setAuthResolved(true); }} className="text-orange-400 hover:text-orange-300 font-bold" title="Log In">LOG IN</button>
              )}
            </div>
            <button onClick={pushToCloud} disabled={isSyncing || !isRealUser} className="w-full flex justify-center items-center gap-2 px-3 py-2 text-[10px] font-black bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none">
              {isSyncing ? <Loader2 size={12} className="animate-spin" /> : (!isRealUser ? <Lock size={12} /> : <Save size={12} />)}
              SYNC TO CLOUD
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/50">
            <button onClick={exportSnapshot} className="flex justify-center items-center gap-2 px-2 py-2 text-[9px] font-black text-zinc-500 hover:text-orange-400 border border-zinc-800 rounded-lg transition-all"><Download size={10} /> BACKUP</button>
            <button onClick={handleImportClick} className="flex justify-center items-center gap-2 px-2 py-2 text-[9px] font-black text-zinc-500 hover:text-purple-400 border border-zinc-800 rounded-lg transition-all"><Upload size={10} /> IMPORT</button>
          </div>
          <input type="file" ref={fileInputRef} onChange={importSnapshot} accept=".json" className="hidden" />
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="absolute left-0 top-1/2 -translate-y-1/2 bg-zinc-800 p-1 rounded-r-md z-30 transition-all hover:bg-orange-500">
          <ChevronRight className={isSidebarOpen ? 'rotate-180' : ''} size={16} />
        </button>

        <div className="flex-1 overflow-y-auto">
          <header className="p-8 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-20">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <input value={activeSketch?.title} onChange={(e) => updateSketch(activeSketchId, 'title', e.target.value)} className="bg-transparent text-5xl font-black focus:outline-none w-full tracking-tighter" placeholder="Title..." />
                  <div className="flex gap-4 mt-2">
                    <button onClick={() => setViewMode('storyboard')} className={`text-[10px] font-black px-4 py-1.5 rounded-full ${viewMode === 'storyboard' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-500'}`}>STORYBOARD</button>
                    <button onClick={() => shootPlan.length > 0 ? setViewMode('shoot-plan') : optimizeShootOrder()} disabled={!isRealUser && shootPlan.length === 0} className={`text-[10px] font-black px-4 py-1.5 rounded-full flex items-center gap-2 ${viewMode === 'shoot-plan' ? 'bg-orange-500 text-white' : 'text-zinc-500'} disabled:opacity-50`}>
                      {loadingStates.optimizing ? <Loader2 size={10} className="animate-spin" /> : (!isRealUser && shootPlan.length === 0 ? <Lock size={10} /> : <Zap size={10} />)} SHOOT PLAN
                    </button>
                    <button onClick={() => setViewMode('script')} className={`text-[10px] font-black px-4 py-1.5 rounded-full ${viewMode === 'script' ? 'bg-blue-500 text-white' : 'text-zinc-500'}`}>
                      SCRIPT
                    </button>
                    <button onClick={() => setViewMode('print')} className="text-[10px] font-black px-4 py-1.5 rounded-full text-zinc-500 border border-zinc-800"><Printer size={10} /> PRINT</button>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={generateAISHots} disabled={loadingStates.genShots || !isRealUser} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-full text-xs font-black shadow-lg shadow-purple-900/20">
                    {loadingStates.genShots ? <Loader2 size={14} className="animate-spin" /> : (!isRealUser ? <Lock size={14} /> : <Sparkles size={14} />)} BUILD LIST
                  </button>
                  <button onClick={generateScript} disabled={loadingStates.script || !isRealUser} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-full text-xs font-black shadow-lg shadow-blue-900/20">
                    {loadingStates.script ? <Loader2 size={14} className="animate-spin" /> : (!isRealUser ? <Lock size={14} /> : <ScrollText size={14} />)} WRITE SCRIPT
                  </button>
                  <button onClick={() => setIsDetailsExpanded(!isDetailsExpanded)} className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 transition-colors border border-zinc-700">
                    {isDetailsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {!isDetailsExpanded && (
                <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 mt-6 border-t border-zinc-800/50 pt-4">
                  <span className="text-orange-500 flex items-center gap-1"><Map size={12}/> {activeSketch?.sceneType || 'No Location'}</span>
                  <span className="text-purple-400 flex items-center gap-1"><VenetianMask size={12}/> {activeSketch?.tone || 'No Tone'}</span>
                  <span className="text-green-400 truncate max-w-sm flex items-center gap-1"><UserPlus size={12}/> {activeSketch?.characters || 'No Characters'}</span>
                </div>
              )}

              {isDetailsExpanded && (
                <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300 mt-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-zinc-800/50">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center justify-between">
                        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> The Hook</span>
                        <button onClick={() => generateNarrativeBeat('hook')} disabled={!isRealUser} className="p-1 hover:bg-orange-500/20 rounded transition-colors disabled:opacity-50">{!isRealUser ? <Lock size={12} className="text-orange-500" /> : <Sparkles size={12} className="text-orange-500" />}</button>
                      </label>
                      <textarea value={activeSketch?.hook} onChange={(e) => updateSketch(activeSketchId, 'hook', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none min-h-[80px] resize-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center justify-between">
                        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full" /> The Escalation</span>
                        <button onClick={() => generateNarrativeBeat('escalation')} disabled={!isRealUser} className="p-1 hover:bg-purple-500/20 rounded transition-colors disabled:opacity-50">{!isRealUser ? <Lock size={12} className="text-purple-500" /> : <Sparkles size={12} className="text-purple-500" />}</button>
                      </label>
                      <textarea value={activeSketch?.escalation} onChange={(e) => updateSketch(activeSketchId, 'escalation', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none min-h-[80px] resize-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center justify-between">
                        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> The Ending</span>
                        <button onClick={() => generateNarrativeBeat('ending')} disabled={!isRealUser} className="p-1 hover:bg-green-500/20 rounded transition-colors disabled:opacity-50">{!isRealUser ? <Lock size={12} className="text-green-500" /> : <Sparkles size={12} className="text-green-500" />}</button>
                      </label>
                      <textarea value={activeSketch?.ending} onChange={(e) => updateSketch(activeSketchId, 'ending', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none min-h-[80px] resize-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-900/20 p-4 rounded-2xl border border-zinc-800">
                    <div className="space-y-1"><span className="text-[9px] font-black text-zinc-600 uppercase">Scene Type</span><input value={activeSketch?.sceneType} onChange={(e) => updateSketch(activeSketchId, 'sceneType', e.target.value)} className="w-full bg-transparent text-sm focus:outline-none font-bold" /></div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-zinc-600 uppercase flex items-center gap-1"><VenetianMask size={10}/> Tone</span>
                      <select value={activeSketch?.tone} onChange={(e) => updateSketch(activeSketchId, 'tone', e.target.value)} className="w-full bg-transparent text-sm focus:outline-none font-bold cursor-pointer [&>option]:bg-zinc-900">
                        {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><span className="text-[9px] font-black text-zinc-600 uppercase flex items-center gap-1"><UserPlus size={10}/> Characters</span><input value={activeSketch?.characters} onChange={(e) => updateSketch(activeSketchId, 'characters', e.target.value)} className="w-full bg-transparent text-sm focus:outline-none font-bold" /></div>
                    <div className="space-y-1"><span className="text-[9px] font-black text-zinc-600 uppercase">Key Props</span><input value={activeSketch?.props} onChange={(e) => updateSketch(activeSketchId, 'props', e.target.value)} className="w-full bg-transparent text-sm focus:outline-none font-bold italic" /></div>
                  </div>
                </div>
              )}
            </div>
          </header>

          <div className="p-8 space-y-8 max-w-6xl mx-auto w-full">
            {viewMode === 'script' ? (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-[3rem] p-10 relative">
                <div className="flex justify-between items-center mb-6">
                  <div><h2 className="text-2xl font-black uppercase tracking-tighter text-blue-400">Generated Script</h2></div>
                  <button onClick={downloadScript} disabled={!activeSketch?.script} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 rounded-full text-xs font-black transition-all"><Download size={14} /> SAVE SCRIPT</button>
                </div>
                <textarea value={activeSketch?.script || ''} onChange={(e) => updateSketch(activeSketchId, 'script', e.target.value)} className="w-full bg-zinc-950/80 rounded-2xl p-8 text-sm font-mono text-zinc-300 min-h-[60vh] focus:outline-none border border-zinc-800/50 resize-y leading-relaxed whitespace-pre-wrap shadow-inner" />
              </div>
            ) : (
              <>
                {viewMode === 'shoot-plan' && shootPlan.length > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-[2rem] p-8 mb-8 flex justify-between items-center">
                    <div><h2 className="text-2xl font-black uppercase tracking-tighter text-orange-500">Optimized Shoot Plan</h2></div>
                    <button onClick={downloadShootPlan} className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/30 rounded-full text-xs font-black"><Download size={14} /> SAVE PLAN</button>
                  </div>
                )}
                {currentDisplayList.map((shot, index) => (
                  <div key={shot.id} className={`group bg-zinc-900/40 border ${shot.fx ? 'border-orange-500/40' : 'border-zinc-800'} rounded-[3rem] p-10 hover:bg-zinc-900/60 transition-all relative overflow-hidden mb-8`}>
                    <div className="absolute top-0 right-0 p-6 text-9xl text-zinc-800/10 font-black pointer-events-none select-none">{viewMode === 'shoot-plan' ? shot.shootOrderNumber : index + 1}</div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
                      <div className="lg:col-span-4 space-y-4">
                        <div className="aspect-video bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden relative group/img flex items-center justify-center">
                          {shot.image ? (
                            <><img src={shot.image} alt="Storyboard" className="w-full h-full object-cover" />
                              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <button onClick={() => setZoomedImage(shot.image)} className="p-2 bg-black/60 hover:bg-black/80 rounded-full text-white"><Maximize2 size={14} /></button>
                                <button onClick={() => downloadImage(shot.image, shot.number)} className="p-2 bg-black/60 hover:bg-black/80 rounded-full text-white"><Download size={14} /></button>
                                <button onClick={() => updateShot(shot.id, 'image', null)} className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white"><X size={14} /></button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-6">
                              {loadingStates[shot.id] ? <Loader2 className="animate-spin text-purple-500 mx-auto" size={32} /> : (
                                <><ImageIcon className="text-zinc-800 mx-auto mb-3" size={40} />
                                <button onClick={() => generateStoryboardFrame(shot.id)} disabled={!isRealUser} className="text-[10px] font-black text-zinc-500 hover:text-purple-400 border border-zinc-800 px-4 py-2 rounded-full flex items-center gap-2 disabled:opacity-50 disabled:hover:text-zinc-500">{!isRealUser ? <Lock size={10} /> : <Sparkles size={10} />} VISUAL</button></>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <select value={shot.type} onChange={(e) => updateShot(shot.id, 'type', e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-xs font-bold focus:ring-1 ring-orange-500">{SHOT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select>
                            <button onClick={() => setShots(shots.map(s => s.id === shot.id ? {...s, fx: !s.fx} : s))} className={`px-4 py-2 rounded-xl text-[10px] font-black border ${shot.fx ? 'bg-orange-600 text-white border-orange-400' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>FX</button>
                          </div>
                          <div className="flex items-center bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-3 py-2"><Map size={12} className="text-zinc-500 mr-2 shrink-0" /><input value={shot.locationCaveat || ''} onChange={(e) => updateShot(shot.id, 'locationCaveat', e.target.value)} placeholder="Location caveat..." className="w-full bg-transparent text-[10px] font-bold text-zinc-400 focus:outline-none" /></div>
                        </div>
                      </div>

                      <div className="lg:col-span-8 space-y-6">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 space-y-3">
                            <input value={shot.subject} onChange={(e) => updateShot(shot.id, 'subject', e.target.value)} placeholder="Subject..." className="w-full bg-transparent text-2xl font-black border-b border-zinc-800 focus:border-orange-500 p-1 focus:outline-none" />
                            {availableCharacters.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                <span className="text-[9px] font-black text-zinc-600 uppercase flex items-center h-6 mr-1">In Shot:</span>
                                {availableCharacters.map(char => {
                                  const isActive = (shot.shotCharacters || []).includes(char);
                                  return (<button key={char} onClick={() => toggleShotCharacter(shot.id, char)} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${isActive ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>{char}</button>);
                                })}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <button onClick={() => setShots(shots.filter(s => s.id !== shot.id))} className="p-2 text-zinc-800 hover:text-red-400 mt-1"><Trash2 size={20} /></button>
                            {viewMode === 'storyboard' && (
                              <div className="flex gap-1 bg-zinc-950/50 rounded-lg p-1 border border-zinc-800/50 mt-2">
                                <button onClick={() => moveShot(index, -1)} disabled={index === 0} className="p-1.5 text-zinc-600 hover:text-white disabled:opacity-20"><ArrowUp size={14} /></button>
                                <button onClick={() => moveShot(index, 1)} disabled={index === activeShots.length - 1} className="p-1.5 text-zinc-600 hover:text-white disabled:opacity-20"><ArrowDown size={14} /></button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                            <button onClick={() => generateTextAssist(shot.id, 'action', 'Director blocking physical comedy.', `Shot Subject: ${shot.subject}`)} disabled={!isRealUser} className="p-1 hover:bg-orange-500/20 rounded disabled:opacity-50">{!isRealUser ? <Lock size={12} className="text-orange-500" /> : <Clapperboard size={12} className="text-orange-500" />}</button> Action / Blocking
                          </div>
                          <textarea value={shot.action || ''} onChange={(e) => updateShot(shot.id, 'action', e.target.value)} className="w-full bg-zinc-950/50 rounded-2xl p-4 text-xs text-zinc-300 min-h-[60px] focus:outline-none border border-zinc-800/50 focus:border-orange-500/50 resize-y" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                              <button onClick={() => generateTextAssist(shot.id, 'dialogue', 'Writer drafting dialogue.', `Subject: ${shot.subject}, Action: ${shot.action}`)} disabled={!isRealUser} className="p-1 hover:bg-purple-500/20 rounded disabled:opacity-50">{!isRealUser ? <Lock size={12} className="text-purple-500" /> : <Quote size={12} className="text-purple-500" />}</button> Dialogue / Improv
                            </div>
                            <textarea value={shot.dialogue || ''} onChange={(e) => updateShot(shot.id, 'dialogue', e.target.value)} className="w-full bg-zinc-950/50 rounded-2xl p-4 text-xs text-zinc-200 min-h-[100px] focus:outline-none border border-zinc-800/50 focus:border-purple-500/50 resize-y" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                              <button onClick={() => generateTextAssist(shot.id, 'notes', 'DP advising on camera/light.', `Type: ${shot.type}, Subject: ${shot.subject}`)} disabled={!isRealUser} className="p-1 hover:bg-blue-500/20 rounded disabled:opacity-50">{!isRealUser ? <Lock size={12} className="text-blue-500" /> : <Wand2 size={12} className="text-blue-500" />}</button> Director Notes
                            </div>
                            <textarea value={shot.notes || ''} onChange={(e) => updateShot(shot.id, 'notes', e.target.value)} className="w-full bg-zinc-950/50 rounded-2xl p-4 text-xs text-zinc-400 min-h-[100px] focus:outline-none border border-zinc-800/50 focus:border-blue-500/50 resize-y italic" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {viewMode === 'storyboard' && (
              <button onClick={addShot} className="w-full py-10 border-2 border-dashed border-zinc-800 rounded-[3rem] text-zinc-600 hover:text-orange-500 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all flex flex-col items-center justify-center gap-3 font-black tracking-widest group mt-8">
                <div className="bg-zinc-900 group-hover:bg-orange-500/20 p-4 rounded-full"><Plus size={24} className="text-zinc-500 group-hover:text-orange-500" /></div> ADD NEW SHOT
              </button>
            )}
            <div className="h-32" />
          </div>
        </div>
      </main>

      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-7xl max-h-screen">
            <img src={zoomedImage} alt="Zoomed Storyboard" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-zinc-800" />
            <button onClick={() => setZoomedImage(null)} className="absolute -top-4 -right-4 p-3 bg-zinc-900 border border-zinc-700 rounded-full text-white hover:bg-zinc-800 shadow-xl"><X size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;