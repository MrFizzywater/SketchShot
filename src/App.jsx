import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, Camera, FileText, ChevronRight, Layout, 
  AlertCircle, Wand2, Printer, Sparkles, 
  Loader2, Quote, Zap, ArrowLeft, Image as ImageIcon, 
  X, Download, Upload, Save, Maximize2, Map, 
  ChevronUp, ChevronDown, Clock, ListVideo, Mic,
  UserPlus, ArrowUp, ArrowDown, Cloud, GitBranch, LogOut, Lock, Copy, Menu,
  ScrollText, VenetianMask, Clapperboard, Key, EyeOff, User, Settings2, Users, Settings, Video, RefreshCcw, ArrowDownToLine, ArrowUpFromLine, Undo, Scissors, CheckCircle2, Film, Unlock
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, signInWithPopup, signInAnonymously,
  GoogleAuthProvider, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, writeBatch
} from 'firebase/firestore';

declare global {
  var __firebase_config: string | undefined;
  var __app_id: string | undefined;
  var __initial_auth_token: string | undefined;
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ImportMetaEnv {
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// --- ENVIRONMENT INITIALIZATION ---
let firebaseConfig: any = {};
let globalTextModel = "gemini-flash-latest"; 
let globalImageModel = "imagen-3.0-generate-001"; // Defaulted to 3.0 to prevent 404 preview blocks
let globalFreeImageUrl = "https://image.pollinations.ai/prompt/"; // Default free endpoint

try {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    if ((import.meta as any).env.VITE_GEMINI_TEXT_MODEL) globalTextModel = (import.meta as any).env.VITE_GEMINI_TEXT_MODEL;
    if ((import.meta as any).env.VITE_GEMINI_IMAGE_MODEL) globalImageModel = (import.meta as any).env.VITE_GEMINI_IMAGE_MODEL;
    if ((import.meta as any).env.VITE_FREE_IMAGE_URL) globalFreeImageUrl = (import.meta as any).env.VITE_FREE_IMAGE_URL;
  }
} catch (e) { /* Ignore */ }

if (typeof __firebase_config !== 'undefined') {
  firebaseConfig = JSON.parse(__firebase_config);
} else {
  try {
    firebaseConfig = {
      apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
      authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: (import.meta as any).env.VITE_FIREBASE_SENDER_ID,
      appId: (import.meta as any).env.VITE_FIREBASE_APP_ID
    };
  } catch (e) { /* Ignore in strict environments */ }
}

let app: any;
let auth: any;
let db: any;

try {
  if (firebaseConfig && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.warn("Firebase config is missing projectId. Firebase will not be initialized.");
  }
} catch (e) {
  console.error("Failed to initialize Firebase:", e);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'sketchbeans-app';

const SHOT_TYPES = ['Wide', 'Medium', 'Close Up', 'POV', 'Over the Shoulder', 'Insert', 'Drone', 'Tracking'];
const CAMERA_MOVES = ['Locked Off', 'Handheld / Shaky', 'Slow Creep In', 'Slow Creep Out', 'Crash Zoom', 'Whip Pan', 'Dolly Tracking', 'Dutch Angle', 'Crane Up', 'Crane Down'];
const IMAGE_STYLES = ['Pencil Sketch', 'Stick Figure', 'Photographic', 'Cinematic', 'Comic Book', 'Watercolor', '3D Render', 'Vintage Film', 'Other'];
const ASPECT_RATIOS = [{label: '16:9 (Widescreen)', val: '16:9'}, {label: '1:1 (Square)', val: '1:1'}, {label: '4:3 (Standard)', val: '4:3'}, {label: '9:16 (Vertical)', val: '9:16'}, {label: '3:4 (Portrait)', val: '3:4'}];
const GENRES = ['Comedy', 'Horror', 'Sci-Fi', 'Drama', 'Thriller', 'Action', 'Documentary', 'Commercial', 'Music Video', 'Other'];
const TONES = ['Absurdist', 'Disruptive / Cringe', 'Deadpan', 'Slapstick', 'Satire', 'Surreal', 'Mockumentary', 'Cinematic', 'Dark Comedy', 'Screwball', 'High Concept', 'Mumblecore', 'Gritty', 'Melancholic', 'Uplifting', 'Tense / Thriller', 'Ethereal', 'Noir', 'Whimsical', 'Macabre', 'None', 'Other'];
const COMEDY_ARCHETYPES = ['The Protagonist', 'The Antagonist', 'The Mentor', 'The Sidekick', 'The Innocent', 'The Everyman', 'The Weirdo', 'The Bureaucrat', 'The Straight Man', 'The Wildcard', 'The Neurotic', 'The Himbo / Bimbo', 'The Agent of Chaos', 'The Deadpan', 'The Instigator', 'The Oblivious One', 'The Cynic', 'The Over-Enthusiast', 'The Voice of Reason', 'The Fall Guy', 'None', 'Other'];

const SHOT_COLORS = [
  { name: 'none', bg: 'bg-zinc-900/40', border: 'border-zinc-800', listRow: '', dotBg: 'bg-zinc-800' },
  { name: 'red', bg: 'bg-red-950/30', border: 'border-red-500/30', listRow: 'border-l-[6px] border-l-red-500 bg-red-50/50 print:bg-red-50', dotBg: 'bg-red-500' },
  { name: 'orange', bg: 'bg-orange-950/30', border: 'border-orange-500/30', listRow: 'border-l-[6px] border-l-orange-500 bg-orange-50/50 print:bg-orange-50', dotBg: 'bg-orange-500' },
  { name: 'yellow', bg: 'bg-yellow-950/30', border: 'border-yellow-500/30', listRow: 'border-l-[6px] border-l-yellow-500 bg-yellow-50/50 print:bg-yellow-50', dotBg: 'bg-yellow-500' },
  { name: 'green', bg: 'bg-green-950/30', border: 'border-green-500/30', listRow: 'border-l-[6px] border-l-green-500 bg-green-50/50 print:bg-green-50', dotBg: 'bg-green-500' },
  { name: 'blue', bg: 'bg-blue-950/30', border: 'border-blue-500/30', listRow: 'border-l-[6px] border-l-blue-500 bg-blue-50/50 print:bg-blue-50', dotBg: 'bg-blue-500' },
  { name: 'purple', bg: 'bg-purple-950/30', border: 'border-purple-500/30', listRow: 'border-l-[6px] border-l-purple-500 bg-purple-50/50 print:bg-purple-50', dotBg: 'bg-purple-500' },
];

const getGenderText = (val) => {
  if (val < 35) return "Femme-presenting";
  if (val > 65) return "Masc-presenting";
  return "Androgynous-presenting";
};

const getSkinText = (val) => {
  if (val < 35) return "Light skin";
  if (val > 65) return "Dark skin";
  return "Medium skin";
};

const formatTime = (secs) => {
  const safeSecs = parseInt(secs) || 0;
  const m = Math.floor(safeSecs / 60);
  const s = safeSecs % 60;
  return m > 0 ? (
    <React.Fragment>{m}<span className="opacity-50 lowercase ml-[1px] mr-1">m</span>{s}<span className="opacity-50 lowercase ml-[1px]">s</span></React.Fragment>
  ) : (
    <React.Fragment>{s}<span className="opacity-50 lowercase ml-[1px]">s</span></React.Fragment>
  );
};

const mergeCharacters = (existingProfiles, newAICharacters) => {
  if (!newAICharacters || !Array.isArray(newAICharacters)) return existingProfiles;
  
  let updatedProfiles = [...existingProfiles];
  
  newAICharacters.forEach(aiChar => {
    if (!aiChar.name) return;
    const existingIdx = updatedProfiles.findIndex(p => p.name.toLowerCase() === aiChar.name.toLowerCase());
    
    if (existingIdx >= 0) {
      if (updatedProfiles[existingIdx].isLocked) return; 
      
      updatedProfiles[existingIdx] = {
        ...updatedProfiles[existingIdx],
        sex: aiChar.sex || updatedProfiles[existingIdx].sex,
        age: aiChar.age || updatedProfiles[existingIdx].age,
        archetype: COMEDY_ARCHETYPES.includes(aiChar.archetype) ? aiChar.archetype : updatedProfiles[existingIdx].archetype,
        visualStyle: aiChar.visualStyle || updatedProfiles[existingIdx].visualStyle,
        personality: aiChar.personality || updatedProfiles[existingIdx].personality
      };
    } else {
      updatedProfiles.push({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        name: aiChar.name || 'Unknown', 
        sex: aiChar.sex || 'Male', 
        age: aiChar.age || 30, 
        gender: aiChar.gender || 50, 
        melanin: aiChar.melanin || 50,
        archetype: COMEDY_ARCHETYPES.includes(aiChar.archetype) ? aiChar.archetype : 'Other', 
        visualStyle: aiChar.visualStyle || '', 
        personality: aiChar.personality || '',
        isLocked: false,
        image: null
      });
    }
  });
  
  return updatedProfiles;
};

// HELPER: Robust free image generator using direct Blob fetching with Exponential Backoff
const fetchFreeImage = async (promptText, width, height) => {
  const cleanPrompt = promptText.replace(/[\n\r]/g, ' ').substring(0, 500).trim();
  const safePrompt = encodeURIComponent(cleanPrompt + ", cinematic, highly detailed");
  const baseUrl = globalFreeImageUrl.endsWith('/') ? globalFreeImageUrl : `${globalFreeImageUrl}/`;
  const url = `${baseUrl}${safePrompt}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random()*100000)}`;
  
  let response;
  for (let i = 0; i < 3; i++) {
    try {
      response = await fetch(url);
      if (response.ok) break;
      if ((response.status === 429 || response.status >= 500) && i < 2) {
        await new Promise(r => setTimeout(r, 2500 * (i + 1))); 
        continue;
      }
      if (response.status === 429) throw new Error("The Free Image server is overwhelmed right now (429). Give it a minute to cool down!");
      throw new Error(`Server returned ${response.status}`);
    } catch (e) {
      if (i === 2) throw new Error(`Free image generator failed to connect to ${baseUrl}. Check your Coolify variables.`);
      await new Promise(r => setTimeout(r, 1500)); 
    }
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image blob."));
    reader.readAsDataURL(blob);
  });
};

const fetchFreeAvatar = async (promptText) => {
  const cleanPrompt = promptText.replace(/[\n\r]/g, ' ').substring(0, 500).trim();
  const safePrompt = encodeURIComponent(cleanPrompt);
  const baseUrl = globalFreeImageUrl.endsWith('/') ? globalFreeImageUrl : `${globalFreeImageUrl}/`;
  const url = `${baseUrl}${safePrompt}?width=256&height=256&nologo=true&seed=${Math.floor(Math.random()*100000)}`;
  
  let response;
  for (let i = 0; i < 3; i++) {
    try {
      response = await fetch(url);
      if (response.ok) break;
      if ((response.status === 429 || response.status >= 500) && i < 2) {
        await new Promise(r => setTimeout(r, 2500 * (i + 1))); 
        continue;
      }
      if (response.status === 429) throw new Error("The Free Image server is overwhelmed right now (429). Give it a minute to cool down!");
      throw new Error(`Server returned ${response.status}`);
    } catch (e) {
      if (i === 2) throw new Error(`Free avatar generator failed to connect to ${baseUrl}. Check your Coolify variables.`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image blob."));
    reader.readAsDataURL(blob);
  });
};


const App = () => {
  const [user, setUser] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [isGuest, setIsGuest] = useState(localStorage.getItem('sketchbeans_is_guest') === 'true');
  const isRealUser = user && !user.isAnonymous;

  const [sketches, setSketches] = useState([{ 
    id: '1', seriesTitle: 'SKETCHBEANS', title: 'The Production Rig', 
    seriesPremise: '', premise: 'A director discovers a digital production rig that does the heavy lifting of pre-production, allowing them to visualize their absurd ideas instantly.',
    genre: 'Comedy', tone: 'Cinematic', imageStyle: 'Pencil Sketch', aspectRatio: '16:9', props: ['Coffee cup', 'Mechanical keyboard'],
    characterProfiles: [
      { id: 'c1', name: 'The Director', sex: 'Female', age: 35, gender: 50, melanin: 50, archetype: 'The Neurotic', visualStyle: 'Disheveled, wearing a faded production company hoodie.', personality: 'Perfectionist constantly on the verge of a breakdown.', isLocked: true, image: null },
      { id: 'c2', name: 'The AI', sex: 'Male', age: 1, gender: 50, melanin: 50, archetype: 'The Wildcard', visualStyle: 'A glowing orb of chaotic light.', personality: 'Unpredictable, highly literal, overly enthusiastic.', isLocked: false, image: null },
    ], hook: 'The Director is staring at a blank page.', escalation: 'They open SketchBeans.', ending: 'They get some sleep.', script: '', punchUpNotes: []
  }]);
  const [shots, setShots] = useState([
    { id: 's1', sketchId: '1', number: 1, type: 'Wide', cameraMove: 'Locked Off', duration: 8, subject: 'THE DASHBOARD', action: 'Welcome to SketchBeans! The key details of your sketch live right up there under the title. \n\nClick the "SCENE CONFIG" tab to change your location, comedic tone, and visual style.', notes: 'Keep the premise simple. The AI uses it to build everything else.', dialogue: '', fx: false, image: null, sceneHeading: 'INT. THE EDIT BAY - NIGHT', shotCharacters: [], colorGroup: 'none' }
  ]);

  const [activeSketchId, setActiveSketchId] = useState(localStorage.getItem('sketchbeans_active_sketch') || '1');
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [viewMode, setViewMode] = useState('scene'); 
  const [boardSubTab, setBoardSubTab] = useState('grid'); 
  const [scriptSubTab, setScriptSubTab] = useState('editor'); 
  const [showAdvancedBeats, setShowAdvancedBeats] = useState(false);
  const [newPropInput, setNewPropInput] = useState('');
  
  const [rawImportScript, setRawImportScript] = useState('');
  const [scriptChunks, setScriptChunks] = useState([]);

  const [shootPlanMeta, setShootPlanMeta] = useState([]); 
  const [loadingStates, setLoadingStates] = useState({});
  const [isAIBusy, setIsAIBusy] = useState(false); 
  const [zoomedImage, setZoomedImage] = useState(null);
  const [visiblePromptId, setVisiblePromptId] = useState(null);
  const [sketchToDelete, setSketchToDelete] = useState(null);
  const [activeMicId, setActiveMicId] = useState(null);
  const fileInputRef = useRef(null);
  
  const [fullResImages, setFullResImages] = useState({});
  const [userApiKey, setUserApiKey] = useState(localStorage.getItem('sketchbeans_gemini_key') || '');
  
  // THREE-WAY AI TOGGLE STATE
  const [aiMode, setAiMode] = useState(localStorage.getItem('sketchbeans_ai_mode') || 'manual');
  const [useFreeImageGen, setUseFreeImageGen] = useState(localStorage.getItem('sb_free_img') === 'true');
  const [history, setHistory] = useState({});
  const [showSeriesControls, setShowSeriesControls] = useState(localStorage.getItem('sketchbeans_show_series') === 'true');

  const [isSyncing, setIsSyncing] = useState(false);
  const isInitialLoad = useRef({ sketches: true, shots: true });
  const [hasLoadedCloudData, setHasLoadedCloudData] = useState(false);
  const autosaveTimeout = useRef(null);
  const isDirty = useRef(false); 
  const [boardCols, setBoardCols] = useState(2);
  const [printListMode, setPrintListMode] = useState('sequence'); 
  const [bulkHeadingEdit, setBulkHeadingEdit] = useState({ old: null, value: '' });
  const [bulkCharEdit, setBulkCharEdit] = useState({ id: null, oldName: '', value: '' }); 
  const [selectedPunchUps, setSelectedPunchUps] = useState([]);

  const sortedSketches = [...sketches].sort((a, b) => {
    const titleA = (a.seriesTitle ? `${a.seriesTitle} - ${a.title}` : (a.title || 'Untitled')).toLowerCase();
    const titleB = (b.seriesTitle ? `${b.seriesTitle} - ${b.title}` : (b.title || 'Untitled')).toLowerCase();
    return titleA.localeCompare(titleB);
  });

  const activeSketch = sketches.find(s => s.id === activeSketchId) || sketches[0];
  const activeShots = shots.filter(s => s.sketchId === activeSketchId).sort((a, b) => a.number - b.number);
  
  let currentDisplayList = activeShots;
  if ((boardSubTab === 'shoot-plan' || (boardSubTab === 'print-list' && printListMode === 'shoot-plan')) && shootPlanMeta.length > 0) {
    currentDisplayList = shootPlanMeta.map((meta, idx) => {
      const foundShot = activeShots.find(s => s.id === meta.id);
      return foundShot ? { ...foundShot, shootOrderNumber: idx + 1, optimizationReason: meta.reason } : null;
    }).filter(s => s !== null);
  }
  
  const totalDurationSeconds = activeShots.reduce((acc, shot) => acc + (parseInt(shot.duration) || 0), 0);
  const activePropsList = Array.isArray(activeSketch?.props) ? activeSketch.props : (activeSketch?.props ? String(activeSketch.props).split(',').map(s => s.trim()).filter(s => s) : []);

  const activeProfiles = activeSketch?.characterProfiles || [];
  const availableCharacters = activeProfiles.map(c => c.name);
  const richCharactersContext = activeProfiles.map(c => {
    let details = [];
    if (c.age) details.push(`${c.age}yo`);
    if (c.sex) details.push(c.sex);
    if (c.archetype) details.push(c.archetype);
    if (c.gender !== undefined) details.push(getGenderText(c.gender));
    if (c.melanin !== undefined) details.push(getSkinText(c.melanin));
    return `${c.name}${details.length > 0 ? ` [${details.join(', ')}]` : ''} - Wardrobe/Visuals: ${c.visualStyle || ''} - Personality: ${c.personality || ''}`;
  }).join(' | ');

  const getFullTitle = () => activeSketch?.seriesTitle ? `${activeSketch.seriesTitle} - ${activeSketch.title}` : (activeSketch?.title || 'Untitled Project');

  useEffect(() => {
    if (activeSketchId) localStorage.setItem('sketchbeans_active_sketch', activeSketchId);
    setRawImportScript('');
    setScriptChunks([]);
    setSelectedPunchUps([]); 
  }, [activeSketchId]);

  useEffect(() => {
    let isMounted = true;
    if (!auth) {
      setAuthResolved(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => { 
      if (currentUser) {
        if (isMounted) {
          setUser(currentUser); 
          setAuthResolved(true); 
        }
      } else {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token).catch(console.error);
        } else {
          await signInAnonymously(auth).catch(() => {});
        }
      }
    });
    return () => { isMounted = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || !isRealUser || !db) return;
    const trackPresence = async () => {
      try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
        await setDoc(userRef, { email: user.email, displayName: user.displayName || 'Unknown Crew', lastSeen: new Date().toISOString(), uid: user.uid }, { merge: true });
      } catch (err) {}
    };
    trackPresence();
  }, [isRealUser, user]);

  useEffect(() => {
    if (!user || !isRealUser || !db) return;
    
    const unsubSketches = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'sketches'), (snap) => {
      if (isInitialLoad.current.sketches) {
        if (!snap.empty) setSketches(snap.docs.map(d => ({id: d.id, ...d.data()})));
        isInitialLoad.current.sketches = false;
        setHasLoadedCloudData(true);
      }
    });
    const unsubShots = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'shots'), (snap) => {
      if (isInitialLoad.current.shots) {
        if (!snap.empty) setShots(snap.docs.map(d => ({id: d.id, ...d.data()})));
        isInitialLoad.current.shots = false;
      }
    });
    return () => { unsubSketches(); unsubShots(); };
  }, [isRealUser, user]);

  const loginWithProvider = async () => {
    if (!auth || !firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('your_key_here')) {
      return alert("🚨 FATAL RIG ERROR: Your Firebase API Key or Project ID is missing!");
    }
    const provider = new GoogleAuthProvider();
    try { 
      await signInWithPopup(auth, provider); 
      setIsGuest(false);
      localStorage.setItem('sketchbeans_is_guest', 'false');
    } catch (err) { 
      if (err.code === 'auth/popup-blocked') alert("🛑 POP-UP BLOCKED! Allow pop-ups for this site and try again.");
      else alert(`Login Error: ${err.message}`);
    }
  };

  const handleGuestEntry = () => {
    setIsGuest(true);
    localStorage.setItem('sketchbeans_is_guest', 'true');
  };

  const updateContextState = (stateUpdater, isSketch) => {
    isDirty.current = true;
    if (isSketch) setSketches(stateUpdater); else setShots(stateUpdater);
  };

  const updateSketch = (id, field, value) => updateContextState(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s), true);
  const updateShot = (id, field, value) => updateContextState(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s), false);

  const updateSceneHeadingBulk = (oldHeading, newHeading) => {
    if (!newHeading || !newHeading.trim() || oldHeading === newHeading) return;
    updateContextState(prev => prev.map(s => {
      if (s.sketchId === activeSketchId && s.sceneHeading === oldHeading) return { ...s, sceneHeading: newHeading.toUpperCase() };
      return s;
    }), false);
  };

  const handleVoiceInput = (currentText, onResult, elementId) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Your browser doesn't support voice dictation. Try Chrome or Edge.");
    if (activeMicId === elementId) { setActiveMicId(null); return; }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setActiveMicId(elementId);
    recognition.onend = () => setActiveMicId(null);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const separator = currentText && !currentText.endsWith(' ') && !currentText.endsWith('\n') ? ' ' : '';
      onResult((currentText || '') + separator + transcript);
    };
    try { recognition.start(); } catch(e) { setActiveMicId(null); }
  };

  const handleAddProp = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newProp = e.target.value.trim();
      if (!activePropsList.includes(newProp)) updateSketch(activeSketchId, 'props', [...activePropsList, newProp]);
      e.target.value = '';
    }
  };

  const removeProp = (indexToRemove) => updateSketch(activeSketchId, 'props', activePropsList.filter((_, idx) => idx !== indexToRemove));

  const toggleShotCharacter = (shotId, charName) => {
    updateContextState(prev => prev.map(s => {
      if (s.id !== shotId) return s;
      const currentChars = s.shotCharacters || [];
      return currentChars.includes(charName) ? { ...s, shotCharacters: currentChars.filter(c => c !== charName) } : { ...s, shotCharacters: [...currentChars, charName] };
    }), false);
  };

  const addCharacter = () => updateSketch(activeSketchId, 'characterProfiles', [...activeProfiles, { id: Date.now().toString(), name: 'New Character', sex: 'Male', age: 30, gender: 50, melanin: 50, archetype: 'The Wildcard', visualStyle: '', personality: '', isLocked: false, image: null }]);
  const updateChar = (charId, field, value) => updateSketch(activeSketchId, 'characterProfiles', activeProfiles.map(p => p.id === charId ? { ...p, [field]: value } : p));

  const commitCharRename = () => {
    if (!bulkCharEdit.id || !bulkCharEdit.value.trim() || bulkCharEdit.oldName === bulkCharEdit.value) {
      setBulkCharEdit({ id: null, oldName: '', value: '' });
      return;
    }

    const oldName = bulkCharEdit.oldName;
    const newName = bulkCharEdit.value.trim();
    const charId = bulkCharEdit.id;
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    updateSketch(activeSketchId, 'characterProfiles', activeProfiles.map(p => p.id === charId ? { ...p, name: newName } : p));

    if (oldName && oldName !== 'New Character') {
      updateContextState(prev => prev.map(shot => {
        if (shot.sketchId !== activeSketchId) return shot;
        let changed = false;
        let newShot = { ...shot };

        if (newShot.shotCharacters?.includes(oldName)) {
          newShot.shotCharacters = newShot.shotCharacters.map(c => c === oldName ? newName : c);
          changed = true;
        }

        const regex = new RegExp(`\\b${escapeRegExp(oldName)}\\b`, 'g');
        ['action', 'dialogue', 'notes', 'subject'].forEach(key => {
          if (newShot[key] && typeof newShot[key] === 'string' && newShot[key].match(regex)) {
            newShot[key] = newShot[key].replace(regex, newName);
            changed = true;
          }
        });
        return changed ? newShot : shot;
      }), false);

      const regexGlobal = new RegExp(`\\b${escapeRegExp(oldName)}\\b`, 'g');
      let sketchChanged = false;
      let updatedActiveSketch = { ...activeSketch };
      
      ['seriesPremise', 'premise', 'hook', 'escalation', 'ending', 'script'].forEach(key => {
        if (updatedActiveSketch[key] && typeof updatedActiveSketch[key] === 'string' && updatedActiveSketch[key].match(regexGlobal)) {
          updatedActiveSketch[key] = updatedActiveSketch[key].replace(regexGlobal, newName);
          sketchChanged = true;
        }
      });
      
      if (sketchChanged) updateContextState(prev => prev.map(s => s.id === activeSketchId ? { ...s, ...updatedActiveSketch } : s), true);
    }
    
    setBulkCharEdit({ id: null, oldName: '', value: '' });
  };

  const removeChar = (charId) => updateSketch(activeSketchId, 'characterProfiles', activeProfiles.filter(p => p.id !== charId));

  const addShot = () => {
    const nextNumber = activeShots.length > 0 ? Math.max(...activeShots.map(s => s.number)) + 1 : 1;
    const lastHeading = activeShots.length > 0 ? activeShots[activeShots.length - 1].sceneHeading : 'INT. LOCATION - DAY';
    updateContextState(prev => [...prev, { id: Date.now().toString(), sketchId: activeSketchId, number: nextNumber, type: 'Medium', cameraMove: 'Locked Off', duration: 5, subject: '', action: '', notes: '', dialogue: '', fx: false, image: null, sceneHeading: lastHeading, shotCharacters: [], colorGroup: 'none' }], false);
  };
  
  const insertShotAt = (index, position) => {
    const currentActiveShots = [...activeShots];
    const insertIndex = position === 'before' ? index : index + 1;
    const inheritedHeading = currentActiveShots[index]?.sceneHeading || 'INT. LOCATION - DAY';
    const newShot = { 
      id: Date.now().toString(), sketchId: activeSketchId, type: 'Medium', cameraMove: 'Locked Off', duration: 5,
      subject: '', action: '', notes: '', dialogue: '', fx: false, image: null, sceneHeading: inheritedHeading, shotCharacters: [], colorGroup: 'none' 
    };
    currentActiveShots.splice(insertIndex, 0, newShot);
    currentActiveShots.forEach((s, i) => s.number = i + 1);
    updateContextState(prev => {
      const otherShots = prev.filter(s => s.sketchId !== activeSketchId);
      return [...otherShots, ...currentActiveShots];
    }, false);
  };

  const deleteShot = async (shotId) => {
    updateContextState(prev => prev.filter(s => s.id !== shotId), false);
    if (user && isRealUser && db) try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'shots', shotId)); } catch (e) {}
  };

  const clearAllShots = async () => {
    if (!window.confirm("🚨 WARNING: This will permanently delete EVERY shot on the board. Do you want to nuke the sequence?")) return;
    const shotsToDelete = activeShots.map(s => s.id);
    updateContextState(prev => prev.filter(s => s.sketchId !== activeSketchId), false);
    
    if (user && isRealUser && db) {
      try {
        let batch = writeBatch(db);
        let count = 0;
        for (const id of shotsToDelete) {
          batch.delete(doc(db, 'artifacts', appId, 'users', user.uid, 'shots', id));
          count++;
          if (count >= 400) { await batch.commit(); batch = writeBatch(db); count = 0; }
        }
        if (count > 0) await batch.commit();
      } catch (err) { console.error("Error clearing shots", err); }
    }
  };

  const moveShot = (currentIndex, direction) => {
    if (boardSubTab !== 'grid') return;
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= activeShots.length) return;
    const currentShot = activeShots[currentIndex];
    const targetShot = activeShots[newIndex];
    const currentNumber = currentShot.number;
    currentShot.number = targetShot.number;
    targetShot.number = currentNumber;
    updateContextState(prev => prev.map(s => {
      if (s.id === currentShot.id) return { ...s, number: currentShot.number };
      if (s.id === targetShot.id) return { ...s, number: targetShot.number };
      return s;
    }), false);
  };

  const moveToPosition = (currentIndex, targetIndex) => {
    if (currentIndex === targetIndex) return;
    const currentActiveShots = [...activeShots]; 
    const [movedItem] = currentActiveShots.splice(currentIndex, 1);
    currentActiveShots.splice(targetIndex, 0, movedItem);
    currentActiveShots.forEach((s, i) => { s.number = i + 1; });
    updateContextState(prev => {
      const otherShots = prev.filter(s => s.sketchId !== activeSketchId);
      return [...otherShots, ...currentActiveShots];
    }, false);
  };

  const confirmDeleteSketch = async () => {
    if (!sketchToDelete) return;
    const id = sketchToDelete.id;
    const updatedSketches = sketches.filter(s => s.id !== id);
    if (updatedSketches.length === 0) {
      const newId = Date.now().toString();
      updatedSketches.push({ id: newId, seriesTitle: '', title: 'New Project', genre: 'Comedy', tone: 'Absurdist', imageStyle: 'Pencil Sketch', aspectRatio: '16:9', seriesPremise: '', premise: '', characterProfiles: [], props: [], hook: '', escalation: '', ending: '', script: '', punchUpNotes: [] });
      setActiveSketchId(newId);
    } else if (activeSketchId === id) setActiveSketchId(updatedSketches[0].id);
    
    setSketches(updatedSketches);
    setShots(prev => prev.filter(s => s.sketchId !== id));
    if (user && isRealUser && db) try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sketches', id)); } catch (err) {}
    setSketchToDelete(null);
  };

  const cloneSketchAsEpisode = async (sketchToClone) => {
    const newId = Date.now().toString();
    const clonedSketch = {
      ...sketchToClone,
      id: newId,
      title: `${sketchToClone.title} (Ep 2)`,
      premise: '', hook: '', escalation: '', ending: '', script: '', punchUpNotes: [],
      props: [], // Wipe props explicitly 
      characterProfiles: sketchToClone.characterProfiles.filter(c => c.isLocked) // Retain ONLY locked cast
    };
    
    setSketches(prev => [...prev, clonedSketch]);
    setActiveSketchId(newId);
    if (window.innerWidth < 768) setSidebarOpen(false);

    if (user && isRealUser && db) {
      setIsSyncing(true);
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sketches', newId), clonedSketch);
      } catch (err) { console.error("Failed to clone sketch to cloud", err); } 
      finally { setIsSyncing(false); }
    }
  };

  const pushToCloud = async (silent = false) => {
    if (!user || !isRealUser || !db) return;
    if (!silent) setIsSyncing(true);

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase network timeout. Save aborted.")), 8000));
      const saveTask = async () => {
        const s = sketches.find(sk => sk.id === activeSketchId);
        if (s) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sketches', s.id), s, { merge: true });
        
        const activePrivShots = shots.filter(sh => sh.sketchId === activeSketchId);
        const shotPromises = activePrivShots.map(shot => setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'shots', shot.id), shot, { merge: true }));
        await Promise.all(shotPromises);
      };
      await Promise.race([saveTask(), timeoutPromise]);
    } catch (err) { 
      if (!silent) alert(`Sync Failed: ${err.message}`);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!isRealUser || !authResolved || !hasLoadedCloudData) return;
    if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
    autosaveTimeout.current = setTimeout(() => {
      if (isDirty.current) {
        pushToCloud(true); 
        isDirty.current = false;
      }
    }, 5000);
    return () => clearTimeout(autosaveTimeout.current);
  }, [sketches, shots, activeSketchId, isRealUser, authResolved, hasLoadedCloudData]);

  const handleImageUpload = (shotId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawImageUrl = e.target?.result as string;
      setFullResImages(prev => ({ ...prev, [shotId]: rawImageUrl }));

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        const MAX_WIDTH = 800; 
        if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
        updateShot(shotId, 'image', canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = rawImageUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleCharImageUpload = (charId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        const MAX = 200; 
        if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } } 
        else { if (height > MAX) { width *= MAX / height; height = MAX; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
        updateChar(charId, 'image', canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const copyPrompt = (text) => {
    try { navigator.clipboard.writeText(text); } 
    catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = text; document.body.appendChild(textArea);
      textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);
    }
    setVisiblePromptId(null); 
  };

  const exportSnapshot = () => {
    const data = { version: "9.0", timestamp: new Date().toISOString(), sketches, shots };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `SketchBeans_FullBackup_${new Date().getTime()}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const exportSingleSketch = (sketchId) => {
    const targetSketch = sketches.find(s => s.id === sketchId);
    const targetShots = shots.filter(s => s.sketchId === sketchId);
    if (!targetSketch) return;
    const data = { version: "9.0", timestamp: new Date().toISOString(), sketches: [targetSketch], shots: targetShots };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; 
    link.download = `SketchBeans_${targetSketch.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'project'}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleImportClick = () => { if(fileInputRef.current) fileInputRef.current.click(); };
  
  const importSnapshot = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        if (content.sketches && content.shots) {
          const importId = Date.now().toString();
          
          const newSketches = content.sketches.map(s => ({...s, id: `imp_${importId}_${s.id}`}));
          const newShots = content.shots.map(sh => {
             const matchingSketch = newSketches.find(ns => ns.id.endsWith(`_${sh.sketchId}`));
             const sHeading = sh.sceneHeading || sh.locationCaveat || 'INT. IMPORTED LOCATION - DAY';
             return { ...sh, id: `imp_${importId}_${sh.id}`, sketchId: matchingSketch ? matchingSketch.id : sh.sketchId, sceneHeading: sHeading };
          });

          setSketches(prev => [...prev, ...newSketches]);
          setShots(prev => [...prev, ...newShots]);
          if (newSketches.length > 0) setActiveSketchId(newSketches[0].id);

          if (user && isRealUser && db) {
            setIsSyncing(true);
            try {
              let batch = writeBatch(db);
              let count = 0;
              const commitBatch = async () => { if (count > 0) { await batch.commit(); batch = writeBatch(db); count = 0; } };
              for (const s of newSketches) {
                batch.set(doc(db, 'artifacts', appId, 'users', user.uid, 'sketches', s.id), s, { merge: true });
                count++; if (count >= 400) await commitBatch();
              }
              for (const s of newShots) {
                batch.set(doc(db, 'artifacts', appId, 'users', user.uid, 'shots', s.id), s, { merge: true });
                count++; if (count >= 400) await commitBatch();
              }
              await commitBatch();
            } catch(err) { console.error(err); } finally { setIsSyncing(false); }
          }
        }
      } catch (err) { alert("Failed to import. Corrupted file."); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const downloadShootPlan = () => {
    if (!currentDisplayList || currentDisplayList.length === 0) return;
    const safeTitle = getFullTitle().toUpperCase() || 'UNTITLED';
    let planText = `SHOOT PLAN: ${safeTitle}\n=========================================\n\nCHARACTERS: ${availableCharacters.join(', ') || 'N/A'}\nPROPS: ${activePropsList.join(', ') || 'N/A'}\n\n=========================================\n\n`;
    
    let currentHeading = '';
    currentDisplayList.forEach((shot, index) => {
      const headingText = shot.sceneHeading || 'LOCATION';
      if (headingText !== currentHeading) {
        planText += `\n[ SCENE: ${headingText.toUpperCase()} ]\n-----------------------------------------\n`;
        currentHeading = headingText;
      }
      
      const isNewScene = index === 0 || shot.sceneHeading !== currentDisplayList[index - 1].sceneHeading;
      const isSameSetup = !isNewScene && index > 0 && 
          shot.type === currentDisplayList[index - 1].type && 
          (shot.locationCaveat || '') === (currentDisplayList[index - 1].locationCaveat || '');

      planText += `${index + 1}. [${(shot.type || 'Shot').toUpperCase()}] ${(shot.subject || '').toUpperCase()}${isSameSetup ? ' (↳ SAME SETUP)' : ''}\n`;
      if (!isSameSetup && shot.cameraMove) planText += `   Camera Move: ${shot.cameraMove}\n`;
      if (!isSameSetup && shot.locationCaveat) planText += `   Location Caveat: ${shot.locationCaveat}\n`;
      if (shot.duration) planText += `   Est. Time: ${shot.duration}s\n`;
      if (shot.shotCharacters?.length > 0) planText += `   Characters: ${shot.shotCharacters.join(', ')}\n`;
      if (shot.action) planText += `   Action: ${shot.action}\n`;
      if (shot.dialogue) planText += `   Dialogue: "${shot.dialogue}"\n`;
      if (shot.notes) planText += `   Notes: ${shot.notes}\n`;
      if (shot.fx) planText += `   *** FX REQUIRED ***\n`;
      if (shot.optimizationReason) planText += `   AD Note: ${shot.optimizationReason}\n`;
      planText += `\n`;
    });
    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `SketchBeans_ShootPlan.txt`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const downloadScript = () => {
    if (!activeSketch?.script) return;
    const blob = new Blob([activeSketch.script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `SketchBeans_Script.txt`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const downloadImage = (shotId, shotNumber) => {
    const shot = activeShots.find(s => s.id === shotId);
    const imageUrl = fullResImages[shotId] || shot?.image;
    if (!imageUrl) return;
    if (imageUrl.startsWith('http')) { 
      window.open(imageUrl, '_blank'); 
    } else {
      const link = document.createElement('a'); link.href = imageUrl; link.download = `SketchBeans_Shot_${shotNumber}.png`; link.click();
    }
  };

  const downloadAllImagesZip = async () => {
    if (!activeShots || activeShots.length === 0) return alert("No shots to download.");
    let hasImages = false;
    const zip = new JSZip();
    const safeTitle = getFullTitle().replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'project';
    const folder = zip.folder(safeTitle);

    activeShots.forEach((shot) => {
      const imageUrl = fullResImages[shot.id] || shot.image;
      if (imageUrl && !imageUrl.startsWith('http')) {
        const base64Data = imageUrl.split(',')[1];
        if (base64Data) {
          const shotNum = String(shot.number).padStart(3, '0');
          const safeSubject = (shot.subject || 'shot').replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
          folder.file(`${shotNum}_${safeSubject}.jpg`, base64Data, { base64: true });
          hasImages = true;
        }
      }
    });

    if (!hasImages) return alert("No generated images found to download.");

    setLoadingStates(prev => ({ ...prev, zip: true }));
    try {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${safeTitle}_images.zip`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate ZIP file.");
    } finally {
      setLoadingStates(prev => ({ ...prev, zip: false }));
    }
  };

  // --- LOCAL JS 1ST AD OPTIMIZER (100% OFFLINE) ---
  const optimizeShootOrder = async (isPrintList = false) => {
    const printTrigger = typeof isPrintList === 'boolean' ? isPrintList : false;
    setLoadingStates(prev => ({ ...prev, optimizing: true }));
    
    // Fake a tiny calculation delay so the UI feels responsive
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const sceneOrder = [...new Set(activeShots.map(s => s.sceneHeading))];
      let optimizedIds = [];

      // Group by Scene first
      sceneOrder.forEach(scene => {
        const sceneShots = activeShots.filter(s => s.sceneHeading === scene);
        const setups = [];
        
        // Group by Setup within the scene
        sceneShots.forEach(shot => {
          const setupKey = `${shot.locationCaveat || 'Base'}_${shot.type}`;
          let setupGroup = setups.find(g => g.key === setupKey);
          if (!setupGroup) {
            setupGroup = { key: setupKey, shots: [] };
            setups.push(setupGroup);
          }
          setupGroup.shots.push(shot);
        });

        // Flatten the array while maintaining the grouping
        setups.forEach(setup => {
          setup.shots.forEach((shot, index) => {
            optimizedIds.push({
              id: shot.id,
              reason: index === 0 ? `Setup: ${shot.type} ${shot.locationCaveat ? `(${shot.locationCaveat})` : ''}` : `Continuing setup.`
            });
          });
        });
      });

      // Auto Color Code the new setup blocks
      const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
      let colorIndex = -1;
      let currentScene = '';
      let currentType = '';
      let currentLoc = '';

      const colorMappedIds = optimizedIds.map((item, idx) => {
        const foundShot = activeShots.find(s => s.id === item.id);
        if (!foundShot) return null;

        const isSameSetup = idx > 0 &&
          foundShot.sceneHeading === currentScene &&
          foundShot.type === currentType &&
          (foundShot.locationCaveat || '') === currentLoc;

        if (!isSameSetup) {
           colorIndex = (colorIndex + 1) % colors.length;
        }

        currentScene = foundShot.sceneHeading;
        currentType = foundShot.type;
        currentLoc = foundShot.locationCaveat || '';

        return {
           ...foundShot,
           shootOrderNumber: idx + 1,
           optimizationReason: item.reason,
           colorGroup: colors[colorIndex]
        };
      }).filter(s => s !== null);

      // Batch update all shots so colors persist on the visual grid
      updateContextState(prev => {
        return prev.map(s => {
          if (s.sketchId !== activeSketchId) return s;
          const updated = colorMappedIds.find(mapped => mapped.id === s.id);
          if (updated) {
            return { ...s, colorGroup: updated.colorGroup };
          }
          return s;
        });
      }, false);

      setShootPlanMeta(colorMappedIds);
      
      if (printTrigger) {
        setPrintListMode('shoot-plan');
      } else {
        setBoardSubTab('shoot-plan');
      }
    } catch (err) { console.error(err); } 
    finally { setLoadingStates(prev => ({ ...prev, optimizing: false })); }
  };

  // --- AI ENGINE (API LOGIC) ---
  const callGemini = async (prompt, systemPrompt = "", isJson = false) => {
    const activeKey = userApiKey.trim();
    if (!activeKey) {
      alert("API Key missing! Please enter your personal Gemini API key in the sidebar Settings panel.");
      return null;
    }
    
    setIsAIBusy(true); 
    const maxRetries = 6; let delay = 3000; 
    try {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const payload: any = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
          if (isJson) payload.generationConfig = { responseMimeType: "application/json" };
          
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${globalTextModel}:generateContent?key=${activeKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });
          
          if (response.status === 429) throw new Error("429");
          if (!response.ok) throw new Error(`Google API threw a ${response.status}.`);
          
          const result = await response.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          return isJson ? JSON.parse(text) : text;
          
        } catch (error) {
          if (i === maxRetries - 1) { 
            if (error.message === "429") alert(`Union Break! The AI hit a rate limit. Give it 30 seconds to breathe.`); 
            else alert(`AI Error: ${error.message}`); 
            throw error; 
          }
          await new Promise(r => setTimeout(r, delay)); delay *= 1.5; 
        }
      }
    } finally { setIsAIBusy(false); }
  };

  const getShotPrompt = (shot) => {
    const charContext = shot.shotCharacters?.length > 0 
      ? shot.shotCharacters.map(n => {
          const profile = activeProfiles.find(p => p.name === n);
          if (!profile) return n;
          return `${n} (A ${profile.age} year old ${profile.sex || 'person'}, ${getGenderText(profile.gender || 50)}, ${getSkinText(profile.melanin || 50)}. Visuals: ${profile.visualStyle || profile.desc || ''}. Personality: ${profile.personality || ''})`;
        }).join(', ') 
      : "";

    const location = shot.sceneHeading || 'LOCATION';
    const style = activeSketch?.imageStyle || 'Pencil Sketch';
    
    let stylePrefix = "";
    if (style === 'Photographic') stylePrefix = "High-resolution photograph, photorealistic, 85mm lens, cinematic lighting.";
    else if (style === 'Cinematic') stylePrefix = "Cinematic movie still, anamorphic lens, dramatic lighting, highly detailed, 35mm film.";
    else if (style === 'Comic Book') stylePrefix = "Comic book art panel, vivid colors, graphic novel ink style.";
    else if (style === 'Watercolor') stylePrefix = "Expressive watercolor painting, loose artistic brush strokes.";
    else if (style === '3D Render') stylePrefix = "High-quality 3D render, stylized but detailed, Unreal Engine style.";
    else if (style === 'Vintage Film') stylePrefix = "Vintage 35mm film still, grainy, retro color grading, nostalgic aesthetic.";
    else if (style === 'Stick Figure') stylePrefix = "Very simple, literal hand-drawn stick figure storyboard sketch on white paper. No background details. Just stick figures.";
    else if (style === 'Other') stylePrefix = activeSketch?.customImageStyle || "Concept art";
    else stylePrefix = "Rough storyboard sketch, mixed media graphite and colored pencil.";

    let prompt = `CRITICAL INSTRUCTION: Generate a SINGLE, borderless, full-bleed image. ABSOLUTELY NO TEXT, NO BORDERS, NO ARROWS, NO WATERMARKS, NO STORYBOARD MARKS. Just the pure artwork.\n\n`;
    prompt += `VISUAL STYLE: ${stylePrefix}\n\n`;
    prompt += `SCENE CONTEXT: ${activeSketch?.seriesPremise ? `[Series Formula: ${activeSketch.seriesPremise}] ` : ''}${activeSketch?.premise || activeSketch?.title}\n`;
    prompt += `LOCATION: ${location}\n\n`;
    prompt += `IMAGE TO GENERATE: A ${shot.type || 'Medium'} shot of ${shot.subject || 'subject'}. `;
    if (shot.cameraMove && shot.cameraMove !== 'Locked Off') prompt += `The camera is moving: ${shot.cameraMove}. `;
    if (shot.action) prompt += `Action happening in frame: ${shot.action} `;
    
    if (charContext) prompt += `\n\nSUBJECT DETAILS (Strict Likeness): The characters in this frame must match these descriptions exactly: ${charContext}.`;
    if (shot.notes) prompt += `\n\nDIRECTOR NOTES: ${shot.notes}`;

    return prompt;
  };

  const generateImage = async (shotId) => {
    const activeKey = userApiKey.trim();
    if (!activeKey && !useFreeImageGen) return alert("API Key missing! Please enter your personal Gemini API key in the sidebar Settings panel.");
    
    setLoadingStates(prev => ({ ...prev, [`image-${shotId}`]: true }));
    const shot = activeShots.find(s => s.id === shotId);
    let promptText = getShotPrompt(shot);

    if (useFreeImageGen) {
      try {
        const aspectMap = { '16:9': {w: 800, h: 450}, '1:1': {w: 512, h: 512}, '4:3': {w: 800, h: 600}, '9:16': {w: 450, h: 800}, '3:4': {w: 600, h: 800} };
        const dims = aspectMap[activeSketch?.aspectRatio || '16:9'];
        
        let freeStyle = activeSketch?.imageStyle || 'Storyboard sketch';
        if (freeStyle === 'Stick Figure') freeStyle = 'Simple literal stick figure drawing on white paper, stickman, stick figures';
        const charContext = shot.shotCharacters?.length > 0 ? shot.shotCharacters.map(n => activeProfiles.find(p => p.name === n)?.visualStyle || n).join(', ') : "";
        const freePrompt = `Art style: ${freeStyle}. ${shot.type} shot of ${shot.subject}, ${shot.action}. Location: ${shot.sceneHeading}. ${charContext}`;
        
        const resultUrl = await fetchFreeImage(freePrompt, dims.w, dims.h);
        setFullResImages(prev => ({ ...prev, [shotId]: resultUrl }));
        updateShot(shotId, 'image', resultUrl);
      } catch (err) {
        alert(err.message);
      }
      setLoadingStates(prev => ({ ...prev, [`image-${shotId}`]: false }));
      return;
    }

    const maxRetries = 6; let delay = 3000;
    try {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${globalImageModel}:predict?key=${activeKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instances: { prompt: promptText }, parameters: { sampleCount: 1, aspectRatio: activeSketch?.aspectRatio || '16:9' } })
          });
          
          if (response.status === 404) throw new Error("404_MODEL_NOT_FOUND");
          if (response.status === 403 || response.status === 400) throw new Error("FREE_TIER");
          if (response.status === 429) throw new Error("429");
          if (!response.ok) throw new Error(`Google API threw a ${response.status}.`);

          const result = await response.json();
          const rawImageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
          
          setFullResImages(prev => ({ ...prev, [shotId]: rawImageUrl }));

          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width; let height = img.height;
            const MAX_WIDTH = 800; 
            if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
            updateShot(shotId, 'image', canvas.toDataURL('image/jpeg', 0.7));
          };
          img.src = rawImageUrl;
          break; 
        } catch (error) {
          if (error.message === "404_MODEL_NOT_FOUND") {
             alert(`Google returned a 404 error. Your API key likely doesn't have access to '${globalImageModel}' yet.\n\nFix: I've updated the default to 'imagen-3.0-generate-001'. Check Coolify to ensure VITE_GEMINI_IMAGE_MODEL is set to that, or toggle on the Free Image Generator in the sidebar.`);
             break;
          }
          if (error.message === "FREE_TIER") {
            if (!sessionStorage.getItem('sb_free_warn')) {
              alert("Heads up: Your Gemini API key is on the Free Tier, which Google blocks from their image generator.\n\nTo save the shoot, I am dynamically rerouting your image requests to an open-source indie engine (Pollinations.ai) so you can still build your board! Turn on the 'Free Image Gen' toggle in the sidebar to bypass this warning next time.");
              sessionStorage.setItem('sb_free_warn', 'true');
            }
            const aspectMap = { '16:9': {w: 800, h: 450}, '1:1': {w: 512, h: 512}, '4:3': {w: 800, h: 600}, '9:16': {w: 450, h: 800}, '3:4': {w: 600, h: 800} };
            const dims = aspectMap[activeSketch?.aspectRatio || '16:9'];
            
            let freeStyle = activeSketch?.imageStyle || 'Storyboard sketch';
            if (freeStyle === 'Stick Figure') freeStyle = 'Simple literal stick figure drawing on white paper, stickman, stick figures';
            const charContext = shot.shotCharacters?.length > 0 ? shot.shotCharacters.map(n => activeProfiles.find(p => p.name === n)?.visualStyle || n).join(', ') : "";
            const freePrompt = `Art style: ${freeStyle}. ${shot.type} shot of ${shot.subject}, ${shot.action}. Location: ${shot.sceneHeading}. ${charContext}`;
            
            const resultUrl = await fetchFreeImage(freePrompt, dims.w, dims.h);
            setFullResImages(prev => ({ ...prev, [shotId]: resultUrl }));
            updateShot(shotId, 'image', resultUrl);
            break; 
          }

          if (i === maxRetries - 1) {
            if (error.message === "429") alert(`Union Break! The Image AI hit a rate limit.`); 
            else alert(`Image Error: ${error.message}`); 
            throw error; 
          }
          await new Promise(r => setTimeout(r, delay)); delay *= 1.5; 
        }
      }
    } finally { setLoadingStates(prev => ({ ...prev, [`image-${shotId}`]: false })); }
  };

  const generateCharAvatar = async (charId) => {
    const activeKey = userApiKey.trim();
    if (!activeKey && !useFreeImageGen) return alert("API Key missing! Please enter your personal Gemini API key in the sidebar Settings panel.");
    
    setLoadingStates(prev => ({ ...prev, [`charImg-${charId}`]: true }));
    const char = activeProfiles.find(c => c.id === charId);
    
    const promptText = `A cinematic portrait photograph focusing heavily on WARDROBE: The subject is wearing ${char.visualStyle || 'everyday clothes'}. They are a ${char.age} year old ${char.sex || 'person'}, ${getSkinText(char.melanin)}, ${getGenderText(char.gender)}. Their facial expression shows their personality: ${char.personality || char.archetype}. Plain neutral background. Photorealistic, highly detailed.`;

    if (useFreeImageGen) {
      try {
        const resultUrl = await fetchFreeAvatar(promptText);
        updateChar(charId, 'image', resultUrl);
      } catch (err) {
        alert(err.message);
      }
      setLoadingStates(prev => ({ ...prev, [`charImg-${charId}`]: false }));
      return;
    }

    const maxRetries = 6; let delay = 3000;
    try {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${globalImageModel}:predict?key=${activeKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instances: { prompt: promptText }, parameters: { sampleCount: 1, aspectRatio: '1:1' } })
          });

          if (response.status === 404) throw new Error("404_MODEL_NOT_FOUND");
          if (response.status === 403 || response.status === 400) throw new Error("FREE_TIER");
          if (response.status === 429) throw new Error("429");
          if (!response.ok) throw new Error(`Google API threw a ${response.status}.`);

          const result = await response.json();
          const rawImageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
          
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d'); 
            const size = Math.min(img.width, img.height);
            const x = (img.width - size) / 2;
            const y = (img.height - size) / 2;
            ctx.drawImage(img, x, y, size, size, 0, 0, 256, 256);
            updateChar(charId, 'image', canvas.toDataURL('image/jpeg', 0.8));
          };
          img.src = rawImageUrl;
          break; 
        } catch (error) {
          if (error.message === "404_MODEL_NOT_FOUND") {
             alert(`Google returned a 404 error. Your API key likely doesn't have access to '${globalImageModel}' yet.\n\nFix: I've updated the default to 'imagen-3.0-generate-001'. Check Coolify to ensure VITE_GEMINI_IMAGE_MODEL is set to that, or toggle on the Free Image Generator in the sidebar.`);
             break;
          }
          if (error.message === "FREE_TIER") {
             if (!sessionStorage.getItem('sb_free_warn')) {
               alert("Heads up: Your Gemini API key is on the Free Tier, which Google blocks from their image generator.\n\nTo save the shoot, I am dynamically rerouting your image requests to an open-source indie engine (Pollinations.ai) so you can still build your board! Turn on the 'Free Image Gen' toggle in the sidebar to bypass this warning next time.");
               sessionStorage.setItem('sb_free_warn', 'true');
             }
             const resultUrl = await fetchFreeAvatar(promptText);
             updateChar(charId, 'image', resultUrl);
             break; 
          }

          if (i === maxRetries - 1) {
            if (error.message === "429") alert(`Union Break! The Image AI hit a rate limit.`); 
            else alert(`Image Error: ${error.message}`); 
            throw error; 
          }
          await new Promise(r => setTimeout(r, delay)); delay *= 1.5; 
        }
      }
    } finally { setLoadingStates(prev => ({ ...prev, [`charImg-${charId}`]: false })); }
  };

  const analyzeScriptMetadata = async () => {
    if (!rawImportScript.trim()) return;
    setLoadingStates(prev => ({ ...prev, analyzeScript: true }));
    try {
      const systemPrompt = `You are a script supervisor. Read the following script text.
      Task: Extract the overarching metadata AND identify any characters.
      Return exactly this JSON:
      {
        "premise": "A 1-2 sentence summary of the core concept.",
        "genre": "Must be one of: ${GENRES.join(', ')}",
        "tone": "Must be one of: ${TONES.join(', ')}",
        "props": ["Array", "of", "key", "physical", "props", "mentioned"],
        "newCharacters": [ { "name": "Name", "sex": "Male|Female|Intersex", "age": 30, "gender": 50, "melanin": 50, "archetype": "Must be one of: ${COMEDY_ARCHETYPES.join(', ')}", "visualStyle": "1 brief sentence on wardrobe", "personality": "1 brief sentence on flaw" } ]
      }`;
      const result = await callGemini(`SCRIPT TEXT:\n${rawImportScript}`, systemPrompt, true);
      
      if (result) {
        if (result.premise) updateSketch(activeSketchId, 'premise', result.premise);
        if (result.genre && GENRES.includes(result.genre)) updateSketch(activeSketchId, 'genre', result.genre);
        if (result.tone && TONES.includes(result.tone)) updateSketch(activeSketchId, 'tone', result.tone);
        if (result.props && Array.isArray(result.props)) {
          const uniqueProps = [...new Set([...activePropsList, ...result.props])];
          updateSketch(activeSketchId, 'props', uniqueProps);
        }
        if (result.newCharacters && Array.isArray(result.newCharacters)) {
           const mergedProfiles = mergeCharacters(activeProfiles, result.newCharacters);
           updateSketch(activeSketchId, 'characterProfiles', mergedProfiles);
        }
        alert("Script Metadata & Characters Analyzed and Applied to Config!");
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoadingStates(prev => ({ ...prev, analyzeScript: false }));
    }
  };

  const parseScriptIntoChunks = () => {
    if (!rawImportScript.trim()) return;
    const sceneRegex = /(?:^|\n)(?=(?:INT\.|EXT\.|I\/E\.)\s)/i;
    const parts = rawImportScript.split(sceneRegex).filter(p => p.trim().length > 0);
    
    const newChunks = parts.map((p, i) => {
      const lines = p.trim().split('\n');
      const heading = lines[0].trim();
      return { id: `chunk-${Date.now()}-${i}`, heading: heading, text: p.trim(), status: 'pending' };
    });
    setScriptChunks(newChunks);
  };

  const processScriptChunk = async (chunkIndex) => {
    const chunk = scriptChunks[chunkIndex];
    if (chunk.status === 'done') return;
    
    setScriptChunks(prev => prev.map((c, i) => i === chunkIndex ? {...c, status: 'processing'} : c));
    
    try {
      const typeList = SHOT_TYPES.join(', ');
      const cameraMoveList = CAMERA_MOVES.join(', ');
      const systemPrompt = `You are an expert 1st AD breaking down a script scene. 
      Task 1: Identify any NEW characters in this scene that are NOT in the existing characters list. 
      Task 2: Create a logical shot list for this scene. 
      If the SCENE HEADING is missing or unclear, infer a logical standard scene heading (e.g., INT. LIVING ROOM - DAY) based on the scene text.
      Return a JSON object: 
      {
        "sceneHeading": "INT. LOCATION - DAY",
        "newCharacters": [ { "name": "Name", "sex": "Male|Female|Intersex", "age": 30, "gender": 50, "melanin": 50, "archetype": "Must be one of: ${COMEDY_ARCHETYPES.join(', ')}", "visualStyle": "1 brief sentence", "personality": "1 brief sentence" } ],
        "shots": [ { "type": "(Must be one of: ${typeList})", "cameraMove": "(Must be one of: ${cameraMoveList})", "duration": 5, "subject": "Subject", "action": "Action blocking", "dialogue": "Brief dialogue", "shotCharacters": ["Name1", "Name2"] } ]
      }
      Note: duration is your estimated runtime for that shot in seconds. Make sure to assign a dynamic and appropriate cameraMove from the list provided.`;
      
      const prompt = `SCENE HEADING: ${chunk.heading}\nEXISTING CHARACTERS: ${richCharactersContext}\n\nSCENE TEXT:\n${chunk.text}`;
      
      const result = await callGemini(prompt, systemPrompt, true);
      
      if (result) {
        if (result.newCharacters && Array.isArray(result.newCharacters)) {
           const mergedProfiles = mergeCharacters(activeProfiles, result.newCharacters);
           updateContextState(prev => prev.map(s => s.id === activeSketchId ? { ...s, characterProfiles: mergedProfiles } : s), true);
        }
        
        if (result.shots && Array.isArray(result.shots)) {
          updateContextState(prev => {
            const currentSketchShots = prev.filter(s => s.sketchId === activeSketchId);
            const maxNum = currentSketchShots.length > 0 ? Math.max(...currentSketchShots.map(s => s.number)) : 0;
            
            const newShotsData = result.shots.map((s, idx) => ({ 
              ...s, 
              id: `ai-chunk-${Date.now()}-${idx}`, 
              sketchId: activeSketchId, 
              number: maxNum + idx + 1, 
              fx: false, 
              image: null, 
              sceneHeading: result.sceneHeading || chunk.heading || 'INT. UNKNOWN - DAY', 
              cameraMove: CAMERA_MOVES.includes(s.cameraMove) ? s.cameraMove : 'Locked Off', 
              duration: parseInt(s.duration) || 5,
              shotCharacters: Array.isArray(s.shotCharacters) ? s.shotCharacters : [],
              colorGroup: 'none'
            }));
            
            return [...prev, ...newShotsData];
          }, false);
        }
      }
      
      setScriptChunks(prev => prev.map((c, i) => i === chunkIndex ? {...c, status: 'done'} : c));
    } catch (err) {
      console.error(err);
      setScriptChunks(prev => prev.map((c, i) => i === chunkIndex ? {...c, status: 'error'} : c));
    }
  };

  const autoExtractProps = async () => {
    if (!activeSketch?.script && !activeSketch?.premise) return alert("Add a premise or script first to extract props.");
    setLoadingStates(prev => ({ ...prev, extractProps: true }));
    try {
      const prompt = `Extract a JSON array of strings containing physical props mentioned in this text. Text: ${activeSketch?.script || activeSketch?.premise}`;
      const result = await callGemini(prompt, `You extract physical props. Return exactly this JSON: ["Prop 1", "Prop 2"]`, true);
      if (result && Array.isArray(result)) {
        const uniqueProps = [...new Set([...activePropsList, ...result])];
        updateSketch(activeSketchId, 'props', uniqueProps);
      }
    } catch(e) { console.error(e); } finally { setLoadingStates(prev => ({ ...prev, extractProps: false })); }
  };

  const extractCharacters = async () => {
    setLoadingStates(prev => ({ ...prev, extractChars: true }));
    try {
      const systemPrompt = `Analyze the scene premise, hook, escalation, and ending. Identify distinct characters mentioned. Return a JSON array of objects with keys: "name" (string), "sex" (Male, Female, or Intersex), "age" (number 1-100), "gender" (number 0-100, 0=femme, 100=masc), "melanin" (number 0-100, 0=light, 100=dark), "archetype" (Must be one of: ${COMEDY_ARCHETYPES.join(', ')}), "visualStyle" (1 short sentence on wardrobe/looks), "personality" (1 short sentence on flaws). Do not invent characters not implied by the text.`;
      const prompt = `Series Engine: ${activeSketch.seriesPremise}\nPremise: ${activeSketch.premise}\nHook: ${activeSketch.hook}\nEscalation: ${activeSketch.escalation}\nEnding: ${activeSketch.ending}`;
      const extracted = await callGemini(prompt, systemPrompt, true);
      
      if (extracted && Array.isArray(extracted) && extracted.length > 0) {
         const mergedProfiles = mergeCharacters(activeProfiles, extracted);
         updateSketch(activeSketchId, 'characterProfiles', mergedProfiles);
      } else alert("No clear characters found to extract.");
    } catch(e) { console.error(e); } finally { setLoadingStates(prev => ({ ...prev, extractChars: false })); }
  };

  const generateAISHots = async (count = 8, type = 'sequence') => {
    if (typeof count !== 'number') { count = 8; type = 'sequence'; }
    setLoadingStates(prev => ({ ...prev, genShots: true }));
    try {
      const typeList = SHOT_TYPES.join(', ');
      const cameraMoveList = CAMERA_MOVES.join(', ');
      
      let taskInstruction = `Generate a JSON array containing exactly ${count} shot objects continuing the narrative.`;
      if (type === 'opening') {
        taskInstruction = `Generate a JSON array containing exactly 1 Opening Image / Establishing Shot. CRITICAL: This MUST be a wide establishing shot, an atmospheric cutaway, or a macro detail shot that sets the location, mood, or context BEFORE the main character action begins. Do not jump straight into dialogue.`;
      }
      if (type === 'ending') {
        taskInstruction = `Generate a JSON array containing exactly 1 Final Closing Shot / Outro.`;
      }

      const systemPrompt = `Expert director. ${taskInstruction} YOU MUST RETURN A VALID JSON ARRAY []. Use these EXACT keys for each object: "type" (MUST BE EXACTLY ONE OF: ${typeList}), "subject", "action", "notes", "dialogue", "duration" (estimated seconds, number), "cameraMove" (Must be one of: ${cameraMoveList}), "shotCharacters" (array of strings), "sceneHeading" (Infer a logical master scene heading, e.g. INT. LIVING ROOM - DAY). CRITICAL: Treat every character as a distinctly separate individual. Keep descriptions punchy and direct. Max 1-2 sentences per field. DO NOT write full script pages.`;
      
      let recentShotsContext = "";
      if (activeShots.length > 0 && type !== 'opening') {
        const recent = activeShots.slice(-6).map(s => `Shot ${s.number} (${s.sceneHeading}): [${s.type}] ${s.subject} - ${s.action}`).join('\n');
        recentShotsContext = `\n\nCURRENT SEQUENCE SO FAR (Continue logically from the last shot):\n${recent}`;
      }

      const prompt = `SERIES ENGINE: ${activeSketch?.seriesPremise}\nEPISODE PREMISE: ${activeSketch?.premise}\nTONE: ${activeSketch?.tone}\nCHARACTERS AVAILABLE: ${richCharactersContext}\nHOOK: ${activeSketch?.hook}\nESCALATION: ${activeSketch?.escalation}\nENDING: ${activeSketch?.ending}${recentShotsContext}`;
      
      const newShotsData = await callGemini(prompt, systemPrompt, true);
      
      let normalizedData = newShotsData;
      if (normalizedData && !Array.isArray(normalizedData)) {
        normalizedData = normalizedData.shots ? normalizedData.shots : [normalizedData];
      }

      if (normalizedData && Array.isArray(normalizedData)) {
        updateContextState(prev => {
          const currentSketchShots = prev.filter(s => s.sketchId === activeSketchId);
          const maxNum = currentSketchShots.length > 0 ? Math.max(...currentSketchShots.map(s => s.number)) : 0;
          const lastHeading = currentSketchShots.length > 0 ? currentSketchShots[currentSketchShots.length - 1].sceneHeading : 'INT. LOCATION - DAY';
          
          const newShots = normalizedData.map((s, idx) => ({ 
            ...s, 
            id: `ai-${Date.now()}-${idx}`, 
            sketchId: activeSketchId, 
            number: maxNum + idx + 1, 
            fx: false, 
            image: null, 
            sceneHeading: s.sceneHeading || lastHeading, 
            cameraMove: CAMERA_MOVES.includes(s.cameraMove) ? s.cameraMove : 'Locked Off', 
            duration: parseInt(s.duration) || 5,
            shotCharacters: Array.isArray(s.shotCharacters) ? s.shotCharacters : [],
            colorGroup: 'none'
          }));
          return [...prev, ...newShots];
        }, false);
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, genShots: false })); }
  };

  const generateSingleAIShot = async () => {
    setLoadingStates(prev => ({ ...prev, singleAIShot: true }));
    try {
      const typeList = SHOT_TYPES.join(', ');
      const cameraMoveList = CAMERA_MOVES.join(', ');
      const systemPrompt = `Expert director. Generate exactly ONE new shot to continue the sequence. Return a SINGLE JSON OBJECT with these EXACT keys: "type" (MUST BE EXACTLY ONE OF: ${typeList}), "subject", "action", "notes", "dialogue", "duration" (estimated seconds, number), "cameraMove" (Must be one of: ${cameraMoveList}), "shotCharacters" (array of strings). CRITICAL: Treat every character as a distinctly separate individual. Do not merge their actions or dialogue. Keep all text punchy, direct, and brief.`;
      const recentShots = activeShots.slice(-3).map(s => `Scene: ${s.sceneHeading}, Shot ${s.number}: [${s.type}] ${s.subject} - ${s.action}`).join('\n');
      const prompt = `SERIES ENGINE: ${activeSketch?.seriesPremise}\nEPISODE PREMISE: ${activeSketch?.premise}\nTONE: ${activeSketch?.tone}\nCHARACTERS: ${richCharactersContext}\nHOOK: ${activeSketch?.hook}\nRECENT SHOTS:\n${recentShots}\n\nCreate the NEXT logical shot to build the scene.`;
      const newShotData = await callGemini(prompt, systemPrompt, true);
      if (newShotData) {
        updateContextState(prev => {
          const currentSketchShots = prev.filter(s => s.sketchId === activeSketchId);
          const maxNum = currentSketchShots.length > 0 ? Math.max(...currentSketchShots.map(s => s.number)) : 0;
          const lastHeading = currentSketchShots.length > 0 ? currentSketchShots[currentSketchShots.length - 1].sceneHeading : 'INT. LOCATION - DAY';
          
          const newShot = {
            ...newShotData, 
            id: `ai-single-${Date.now()}`, 
            sketchId: activeSketchId, 
            number: maxNum + 1,
            fx: false, 
            image: null, 
            sceneHeading: newShotData.sceneHeading || lastHeading, 
            cameraMove: CAMERA_MOVES.includes(newShotData.cameraMove) ? newShotData.cameraMove : 'Locked Off',
            duration: parseInt(newShotData.duration) || 5,
            shotCharacters: Array.isArray(newShotData.shotCharacters) ? newShotData.shotCharacters : [],
            colorGroup: 'none'
          };
          return [...prev, newShot];
        }, false);
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, singleAIShot: false })); }
  };

  const generateScriptFromShots = async () => {
    setLoadingStates(prev => ({ ...prev, scriptGen: true }));
    try {
      const systemPrompt = `You are an expert writer specializing in ${activeSketch?.tone} scripts. Turn this shot list and outline into a formatted script. Write in PLAIN TEXT standard screenplay format. CRITICAL: DO NOT use any HTML tags like <center> or <b>. Use ALL CAPS for scene headings and character names. Use standard line breaks and spacing to format action lines and dialogue.`;
      const prompt = `Title: ${getFullTitle()}\nSeries Engine: ${activeSketch?.seriesPremise}\nPremise: ${activeSketch?.premise}\nTone: ${activeSketch?.tone}\nCharacter Profiles: ${richCharactersContext}\nProps: ${activePropsList.join(', ')}\n\nShot List:\n${activeShots.map(s => `SCENE: ${s.sceneHeading}\nShot ${s.number} (${s.type} - ${s.cameraMove}): ${s.subject}\nAction: ${s.action}\nNotes: ${s.notes}\nDialogue: ${s.dialogue}`).join('\n\n')}`;
      const scriptContent = await callGemini(prompt, systemPrompt, false);
      if (scriptContent) {
        updateSketch(activeSketchId, 'script', scriptContent);
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, scriptGen: false })); }
  };

  const draftScriptFromConfig = async () => {
    if (activeSketch?.script && activeSketch.script.trim().length > 0) {
      if (!window.confirm("🚨 This will overwrite your current script draft. Continue?")) return;
    }
    setLoadingStates(prev => ({ ...prev, scriptDraft: true }));
    try {
      const systemPrompt = `You are an expert ${activeSketch?.genre || 'comedy'} writer specializing in a ${activeSketch?.tone} tone. Based on the master project configuration, draft a complete 2-3 page screenplay. Write in PLAIN TEXT standard screenplay format. CRITICAL: DO NOT use any HTML tags. Use ALL CAPS for scene headings and character names. Escalate the premise intelligently and bring the hook to a satisfying ending.`;
      const prompt = `Title: ${getFullTitle()}\nSeries Engine / Formula: ${activeSketch?.seriesPremise || 'N/A'}\nEpisode Premise: ${activeSketch?.premise}\nHook: ${activeSketch?.hook}\nEscalation: ${activeSketch?.escalation}\nEnding: ${activeSketch?.ending}\nCharacter Profiles: ${richCharactersContext}\nProps to feature: ${activePropsList.join(', ')}`;
      const scriptContent = await callGemini(prompt, systemPrompt, false);
      if (scriptContent) {
        updateSketch(activeSketchId, 'script', scriptContent);
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, scriptDraft: false })); }
  };

  const getPunchUpNotes = async () => {
    if (!activeSketch?.script || activeSketch.script.trim().length === 0) return alert("Write or generate a script first to get punch-up notes!");
    setLoadingStates(prev => ({ ...prev, punchUp: true }));
    try {
      const systemPrompt = `You are a seasoned showrunner. Read the following script and provide 3-5 specific, highly actionable 'punch-up' notes. Your goal is to elevate the ${activeSketch?.tone} tone. Suggest alt-lines for dialogue, ways to escalate the physical action, or point out pacing issues. Keep it concise, punchy, and actionable. YOU MUST RETURN EXACTLY A JSON ARRAY OF STRINGS. Example: ["Change Bob's line to be more deadpan", "Add a physical gag with the coffee cup dropping"]`;
      const prompt = `Series Engine: ${activeSketch?.seriesPremise}\nEpisode Premise: ${activeSketch?.premise}\n\nCURRENT SCRIPT DRAFT:\n${activeSketch.script}`;
      const feedback = await callGemini(prompt, systemPrompt, true);
      
      if (feedback && Array.isArray(feedback)) {
        updateSketch(activeSketchId, 'punchUpNotes', feedback);
        setSelectedPunchUps([]); 
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, punchUp: false })); }
  };

  const implementPunchUps = async () => {
    if (selectedPunchUps.length === 0) return;
    setLoadingStates(prev => ({ ...prev, implementNotes: true }));
    
    const safeNotesArray = Array.isArray(activeSketch.punchUpNotes) ? activeSketch.punchUpNotes : [];
    const notesToApply = selectedPunchUps.map(idx => safeNotesArray[idx]);

    try {
      const systemPrompt = `You are an expert script doctor. Rewrite the provided script to implement ONLY the following showrunner notes:\n${notesToApply.map(n => `- ${n}`).join('\n')}\n\nMaintain the exact same formatting (PLAIN TEXT, standard screenplay format, ALL CAPS for scene headings and characters). ONLY change what is necessary to accomplish these specific notes. Return the full rewritten script.`;
      const prompt = `CURRENT SCRIPT:\n${activeSketch.script}`;
      const newScript = await callGemini(prompt, systemPrompt, false);
      
      if (newScript) {
        updateSketch(activeSketchId, 'script', newScript.trim());
        const remainingNotes = safeNotesArray.filter((_, idx) => !selectedPunchUps.includes(idx));
        updateSketch(activeSketchId, 'punchUpNotes', remainingNotes);
        setSelectedPunchUps([]);
      }
    } catch(e) { console.error(e); } finally { setLoadingStates(prev => ({ ...prev, implementNotes: false })); }
  };

  const generateTextAssist = async (shotId, field, rolePrompt, contextPrompt) => {
    setLoadingStates(prev => ({ ...prev, [`${field}-${shotId}`]: true }));
    const shot = activeShots.find(s => s.id === shotId);
    try {
      const charContext = shot.shotCharacters?.length > 0 ? shot.shotCharacters.map(n => activeProfiles.find(p => p.name === n)?.desc || n).join(', ') : richCharactersContext;
      const existing = shot[field] ? `CURRENT TEXT (DO NOT ERASE, ESCALATE THIS): "${shot[field]}"` : `CURRENT TEXT: [Empty]`;
      const prompt = `Scene: ${shot.sceneHeading}\nPremise: ${activeSketch?.premise}\n${contextPrompt}\nCharacters in shot: ${charContext}\nCamera Move: ${shot.cameraMove}\n${existing}`;
      const newText = await callGemini(prompt, `${rolePrompt} Apply the 'Yes, And...' rule. CRITICAL: Treat every character as a distinct individual. Do not merge their actions or dialogue. Keep facts if text exists. Be concise, punchy, and direct. Maximum 1 to 2 sentences. Do not over-write.`, false);
      if (newText) {
        setHistory(prev => ({ ...prev, [`shot-${shotId}-${field}`]: shot[field] || '' }));
        updateShot(shotId, field, newText.trim());
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, [`${field}-${shotId}`]: false })); }
  };

  const revertShotField = (shotId, field) => {
    const key = `shot-${shotId}-${field}`;
    if (history[key] !== undefined) {
      updateShot(shotId, field, history[key]);
      setHistory(prev => { const h = {...prev}; delete h[key]; return h; });
    }
  };

  const generateNarrativeBeat = async (beatType) => {
    setLoadingStates(prev => ({ ...prev, [beatType]: true }));
    try {
      let systemPrompt = `Brilliant writer (${activeSketch?.tone || 'dramatic'} tone). Write in descriptive screenplay outline format. Keep it brief—max 2 sentences.`;
      
      const existingText = activeSketch[beatType] || '';
      let taskDesc = `Task: Write a new ${beatType.toUpperCase()} for the project.`;
      let prompt = "";
      
      if (beatType === 'seriesPremise') {
         taskDesc = `Task: Enhance the existing SERIES ENGINE / RECURRING FORMULA: "${existingText}". CRITICAL: Describe the overarching master formula for a recurring series. Keep it punchy, high-concept, and professional.`;
         prompt = `CURRENT IDEA: "${existingText || 'A new comedy series.'}"\n\n${taskDesc}\nCRITICAL ISOLATION: Do not reference any specific episodic plots. Focus ONLY on what makes this a repeatable television or web series formula.`;
      } else {
         if (beatType === 'premise' && existingText) {
           taskDesc = `Task: Enhance the existing PREMISE: "${existingText}". CRITICAL: KEEP THE ORIGINAL IDEA STRICTLY INTACT. Do NOT invent unnecessary new subplots, characters, or heavy details. Just tighten it into a punchy, professional screenplay logline.`;
         } else if (existingText) {
           taskDesc = `Task: Enhance the existing ${beatType.toUpperCase()}: "${existingText}".`;
         }
         prompt = `Title: ${getFullTitle()}\nSeries Engine: ${activeSketch?.seriesPremise}\nCharacter Profiles: ${richCharactersContext}\n${beatType !== 'premise' ? `Current Premise: ${activeSketch?.premise}\n` : ''}${taskDesc}`;
      }
      
      const newBeat = await callGemini(prompt, systemPrompt, false);
      if (newBeat) {
        setHistory(prev => ({ ...prev, [`sketch-${beatType}`]: activeSketch[beatType] || '' }));
        updateSketch(activeSketchId, beatType, newBeat.trim());
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, [beatType]: false })); }
  };

  const revertSketchField = (field) => {
    const key = `sketch-${field}`;
    if (history[key] !== undefined) {
      updateSketch(activeSketchId, field, history[key]);
      setHistory(prev => { const h = {...prev}; delete h[key]; return h; });
    }
  };

  const generateCharTraits = async (charId) => {
    setLoadingStates(prev => ({ ...prev, [`char-${charId}`]: true }));
    const char = activeProfiles.find(c => c.id === charId);
    try {
      const prompt = `Series Engine: ${activeSketch?.seriesPremise}\nPremise: ${activeSketch?.premise}\nCharacter Name: ${char.name}\nArchetype: ${char.archetype}\nExisting Visuals: ${char.visualStyle || ''}\nExisting Personality: ${char.personality || ''}\n\nTask: Expand on this character. Return exactly this JSON: {"visualStyle": "1-2 sentences on clothing, posture, and defining physical traits", "personality": "1-2 sentences on their fatal flaw, demeanor, and comedic neuroses"}`;
      const result = await callGemini(prompt, `Expert comedy writer.`, true);
      if (result && result.visualStyle) {
        setHistory(prev => ({ ...prev, [`char-${charId}-visualStyle`]: char.visualStyle || '', [`char-${charId}-personality`]: char.personality || '' }));
        updateChar(charId, 'visualStyle', result.visualStyle);
        updateChar(charId, 'personality', result.personality);
      }
    } catch(err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, [`char-${charId}`]: false })); }
  };

  const revertCharTraits = (charId) => {
    if (history[`char-${charId}-visualStyle`] !== undefined) {
      updateChar(charId, 'visualStyle', history[`char-${charId}-visualStyle`]);
      updateChar(charId, 'personality', history[`char-${charId}-personality`]);
      setHistory(prev => { const h = {...prev}; delete h[`char-${charId}-visualStyle`]; delete h[`char-${charId}-personality`]; return h; });
    }
  };

  const handleAutoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const gridColsClass = {
    1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4',
  }[boardCols] || 'grid-cols-2';

  if (!authResolved) {
    return <div className="h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={32} /></div>;
  }

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30 overflow-hidden relative print:block print:h-auto print:overflow-visible print:bg-white">
      
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      {!isRealUser && !isGuest && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-500">
          <div className="max-w-sm w-full p-8 bg-zinc-900 border border-zinc-800 rounded-[3rem] text-center space-y-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="space-y-4 relative z-10">
              <div className="w-20 h-20 bg-zinc-950 rounded-full flex items-center justify-center mx-auto border-4 border-zinc-800 shadow-inner">
                <Camera className="text-orange-500" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter">SKETCHBEANS</h1>
                <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-1">Production Rig</p>
              </div>
            </div>
            
            <div className="space-y-3 relative z-10">
              <button onClick={() => loginWithProvider()} className="w-full flex justify-center items-center gap-3 px-4 py-4 text-xs font-black bg-zinc-100 hover:bg-white text-zinc-900 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">CONTINUE WITH GOOGLE</button>
              <button onClick={handleGuestEntry} className="w-full flex justify-center items-center gap-3 px-4 py-3 text-[10px] font-black bg-transparent hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 rounded-2xl transition-all mt-4 uppercase tracking-widest border border-dashed border-transparent hover:border-zinc-700">Explore as Guest</button>
            </div>
          </div>
        </div>
      )}

      {sketchToDelete && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Delete Project?</h3>
              <p className="text-zinc-400 text-sm mt-2">This will permanently destroy "{sketchToDelete.title}" and all its associated shots. You cannot fix this in post.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSketchToDelete(null)} className="flex-1 py-3 rounded-xl font-bold text-xs tracking-widest text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors">CANCEL</button>
              <button onClick={confirmDeleteSketch} className="flex-1 py-3 rounded-xl font-bold text-xs tracking-widest text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20 transition-colors">DELETE</button>
            </div>
          </div>
        </div>
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm print:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`absolute md:relative z-40 h-full ${isSidebarOpen ? 'w-72 md:w-72 translate-x-0' : 'w-72 -translate-x-full md:w-0 md:translate-x-0'} transition-all duration-300 overflow-hidden bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0 print:hidden`}>
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tighter flex items-center gap-2">
            <Camera className="text-orange-500" size={20} /> SKETCHBEANS
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-3 mb-2">My Projects</div>
          {sortedSketches.map(sketch => {
            const isSeries = !!sketch.seriesTitle;
            const sidebarTitle = sketch.seriesTitle ? `${sketch.seriesTitle} - ${sketch.title}` : (sketch.title || 'Untitled');
            return (
            <div key={sketch.id} className={`w-full group text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${activeSketchId === sketch.id ? 'bg-zinc-800 text-orange-400' : 'text-zinc-400 hover:bg-zinc-800/50'} ${isSeries ? 'border-l-[3px] border-purple-500 bg-purple-500/5' : ''}`}>
              <button onClick={() => { setActiveSketchId(sketch.id); if(window.innerWidth < 768) setSidebarOpen(false); }} className="flex items-center gap-3 flex-1 min-w-0 overflow-x-hidden hover:overflow-x-auto scrollbar-hide whitespace-nowrap" title={sidebarTitle}>
                {isSeries ? <Clapperboard size={16} className={`shrink-0 ${activeSketchId === sketch.id ? 'text-purple-400' : 'text-purple-500/70'}`} /> : <FileText size={16} className="shrink-0" />} 
                <span className="font-medium text-sm flex flex-col items-start leading-tight min-w-0 w-full">
                  {isSeries && <span className={`text-[9px] font-black uppercase tracking-widest truncate w-full text-left ${activeSketchId === sketch.id ? 'text-purple-400' : 'text-purple-500/70'}`}>{sketch.seriesTitle}</span>}
                  <span className="truncate w-full text-left">{sketch.title || 'Untitled'}</span>
                </span>
              </button>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2 shrink-0 bg-gradient-to-r from-transparent to-zinc-900">
                <button onClick={(e) => { e.stopPropagation(); cloneSketchAsEpisode(sketch); }} className="hover:text-green-400 p-1.5" title="Duplicate as New Episode">
                  <Copy size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); exportSingleSketch(sketch.id); }} className="hover:text-blue-400 p-1.5" title="Export Project">
                  <Download size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setSketchToDelete(sketch); }} className="hover:text-red-400 p-1.5" title="Delete Project">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            )
          })}
          <button onClick={() => { const id = Date.now().toString(); setSketches([...sketches, { id, title: 'New Project', genre: 'Comedy', tone: 'Absurdist', imageStyle: 'Pencil Sketch', aspectRatio: '16:9', seriesPremise: '', premise: '', characterProfiles: [], props: [], hook: '', escalation: '', ending: '', script: '', punchUpNotes: [] }]); setActiveSketchId(id); if(window.innerWidth < 768) setSidebarOpen(false); }} className="w-full mt-4 flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-200"><Plus size={14} /> NEW PROJECT</button>
        </nav>

        <div className="border-t border-zinc-800 bg-zinc-950/50 flex flex-col">
          <div className="p-4 border-b border-zinc-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                {aiMode !== 'manual' ? <Sparkles size={14}/> : <EyeOff size={14} className="text-zinc-500"/>} 
                <span className={aiMode !== 'manual' ? 'text-purple-500' : 'text-zinc-500'}>Studio Rig Mode</span>
              </span>
            </div>
            
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 w-full relative">
              <div className="absolute inset-y-1 w-1/3 transition-all duration-300 ease-out" style={{ left: aiMode === 'manual' ? '4px' : aiMode === 'supervisor' ? 'calc(33.333% + 1px)' : 'calc(66.666% - 2px)' }}>
                 <div className={`w-full h-full rounded shadow-sm ${aiMode === 'manual' ? 'bg-zinc-700' : aiMode === 'supervisor' ? 'bg-blue-600' : 'bg-purple-600'}`}></div>
              </div>
              
              <button onClick={() => {setAiMode('manual'); localStorage.setItem('sketchbeans_ai_mode', 'manual');}} className={`relative z-10 flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest text-center transition-colors ${aiMode === 'manual' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Manual</button>
              <button onClick={() => {setAiMode('supervisor'); localStorage.setItem('sketchbeans_ai_mode', 'supervisor');}} className={`relative z-10 flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest text-center transition-colors ${aiMode === 'supervisor' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Super</button>
              <button onClick={() => {setAiMode('cowriter'); localStorage.setItem('sketchbeans_ai_mode', 'cowriter');}} className={`relative z-10 flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest text-center transition-colors ${aiMode === 'cowriter' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Co-Write</button>
            </div>
            
            <div className="text-[8px] text-zinc-500 font-mono mt-3 text-center uppercase tracking-widest h-3 flex items-center justify-center">
              {aiMode === 'manual' && "Pure offline manual rig."}
              {aiMode === 'supervisor' && "Data Wrangling Only. No Generation."}
              {aiMode === 'cowriter' && "Full Generative AI Unlocked."}
            </div>

            {aiMode === 'cowriter' && (
              <>
                <div className="flex items-center justify-between mt-4 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${!useFreeImageGen ? 'text-purple-400' : 'text-zinc-600'}`}>PAID TIER</span>
                  <button 
                    onClick={() => {
                      const newState = !useFreeImageGen;
                      setUseFreeImageGen(newState);
                      localStorage.setItem('sb_free_img', newState.toString());
                    }}
                    className={`relative inline-flex h-4 w-10 items-center rounded-full transition-colors ${useFreeImageGen ? 'bg-blue-500' : 'bg-purple-500'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useFreeImageGen ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${useFreeImageGen ? 'text-blue-400' : 'text-zinc-600'}`}>FREE TIER</span>
                </div>
                <div className="text-[8px] text-zinc-500 font-mono mt-3 text-center uppercase tracking-widest">
                  TXT: {globalTextModel}<br/>
                  IMG: {useFreeImageGen ? 'pollinations.ai' : globalImageModel}
                </div>
              </>
            )}
          </div>

          {aiMode !== 'manual' && (
            <div className="p-4 border-b border-zinc-800/50 space-y-3 bg-zinc-900/30">
              <div className="text-[9px] text-zinc-500 leading-tight">
                Paste your personal Gemini API key here to enable AI features.
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline ml-1 font-bold">Get a free key here.</a>
              </div>
              <input 
                type="text" 
                style={{ WebkitTextSecurity: 'disc' }}
                autoComplete="off"
                data-lpignore="true"
                value={userApiKey}
                onChange={(e) => {
                  setUserApiKey(e.target.value);
                  localStorage.setItem('sketchbeans_gemini_key', e.target.value);
                }}
                placeholder="Enter Gemini Key..." 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          <div className="p-4 space-y-3">
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><Cloud className="text-green-500" size={14} /> Private Cloud</span>
              {isSyncing && <span className="text-blue-500 flex items-center gap-1 animate-pulse"><Loader2 size={10} className="animate-spin"/> SAVING...</span>}
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 truncate flex items-center justify-between">
                <span className="truncate mr-2">{isRealUser ? user.email : 'Guest Viewer'}</span>
                {isRealUser ? (
                  <button onClick={() => { signOut(auth); setIsGuest(false); localStorage.removeItem('sketchbeans_is_guest'); }} className="text-red-400 hover:text-red-300 shrink-0" title="Sign Out"><LogOut size={14} /></button>
                ) : (
                  <button onClick={() => { setIsGuest(false); setAuthResolved(true); localStorage.removeItem('sketchbeans_is_guest'); }} className="text-orange-400 hover:text-orange-300 font-bold shrink-0" title="Log In">LOG IN</button>
                )}
              </div>
              <button onClick={() => pushToCloud(false)} disabled={isSyncing || !isRealUser} className="w-full flex justify-center items-center gap-2 px-3 py-2 text-[10px] font-black bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none">
                {isSyncing ? <Loader2 size={12} className="animate-spin" /> : (!isRealUser ? <Lock size={12} /> : <Save size={12} />)}
                FORCE MANUAL SYNC
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/50">
              <button onClick={exportSnapshot} className="flex justify-center items-center gap-2 px-2 py-2 text-[9px] font-black text-zinc-500 hover:text-orange-400 border border-zinc-800 rounded-lg transition-all"><Download size={10} /> BACKUP ALL</button>
              <button onClick={handleImportClick} className="flex justify-center items-center gap-2 px-2 py-2 text-[9px] font-black text-zinc-500 hover:text-purple-400 border border-zinc-800 rounded-lg transition-all" title="Appends file to your current rig"><Upload size={10} /> IMPORT</button>
              <button onClick={downloadAllImagesZip} className="col-span-2 flex justify-center items-center gap-2 px-2 py-2 text-[9px] font-black text-zinc-500 hover:text-green-400 border border-zinc-800 rounded-lg transition-all">
                {loadingStates.zip ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />} ZIP IMAGES
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={importSnapshot} accept=".json" className="hidden" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative print:block print:h-auto print:overflow-visible">
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="absolute left-0 top-1/2 -translate-y-1/2 bg-zinc-800 p-1.5 md:p-1 rounded-r-md z-20 transition-all hover:bg-orange-500 hidden md:block print:hidden">
          <ChevronRight className={isSidebarOpen ? 'rotate-180' : ''} size={16} />
        </button>

        <div className="flex-1 overflow-y-auto w-full relative print:block print:h-auto print:overflow-visible">
          
          <header className={`p-4 md:p-6 border-b border-zinc-800 bg-zinc-950 md:backdrop-blur-xl sticky top-0 z-20 w-full shrink-0 shadow-lg transition-colors print:hidden`}>
            <div className="max-w-6xl mx-auto flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <button onClick={() => setSidebarOpen(true)} className="md:hidden text-zinc-400 hover:text-white shrink-0"><Menu size={24}/></button>
                    <div className="flex items-center gap-2 flex-1 font-black text-2xl md:text-4xl tracking-tighter truncate text-zinc-100">
                      {activeSketch?.seriesTitle && (
                        <><span className="text-purple-500 truncate">{activeSketch.seriesTitle}</span> <span className="text-zinc-600">-</span></>
                      )}
                      <span className="truncate">{activeSketch?.title || 'Untitled'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm"><Clock size={12}/> EST. RUNTIME: {formatTime(totalDurationSeconds)}</span>
                  <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm"><Film size={12}/> {activeSketch?.genre || 'Comedy'} / {activeSketch?.tone || 'Absurdist'}</span>
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm"><ImageIcon size={12}/> {activeSketch?.imageStyle || 'Pencil Sketch'} ({activeSketch?.aspectRatio || '16:9'})</span>
                  <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm"><Users size={12}/> {availableCharacters.length} Characters</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800/50 mt-2 scrollbar-hide">
                <button onClick={() => setViewMode('scene')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${viewMode === 'scene' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                  <Settings2 size={14}/> CONFIG
                </button>
                <button onClick={() => setViewMode('script')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${viewMode === 'script' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                  <ScrollText size={14}/> SCRIPT
                </button>
                <button onClick={() => setViewMode('characters')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${viewMode === 'characters' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                  <Users size={14}/> CHARACTER BIBLE
                </button>
                <button onClick={() => setViewMode('storyboard')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${viewMode === 'storyboard' ? 'bg-zinc-100 text-zinc-950 shadow-lg' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                  <Layout size={14}/> STORYBOARD
                </button>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-8 max-w-6xl mx-auto w-full pb-32 print:p-0 print:max-w-none print:pb-0">
            
            {/* --- TAB: SCENE CONFIG --- */}
            {viewMode === 'scene' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-orange-500 flex items-center gap-2"><Settings2 size={24} /> Project Configuration</h2>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 cursor-pointer hover:text-zinc-200">
                    <input type="checkbox" checked={showSeriesControls} onChange={(e) => { setShowSeriesControls(e.target.checked); localStorage.setItem('sketchbeans_show_series', e.target.checked.toString()); }} className="accent-purple-500 w-4 h-4 rounded" />
                    Show Series Controls
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {showSeriesControls && (
                    <div className="space-y-2 bg-zinc-900/40 p-6 md:p-8 rounded-[2.5rem] border border-zinc-800/50 shadow-inner relative">
                      <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center justify-between mb-2">
                        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full" /> Series Title</span>
                      </label>
                      <input value={activeSketch?.seriesTitle || ''} onChange={(e) => updateSketch(activeSketchId, 'seriesTitle', e.target.value)} placeholder="Series Name..." className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-4 text-xl font-black focus:outline-none focus:border-purple-500/50 text-zinc-200" />
                    </div>
                  )}
                  <div className={`space-y-2 bg-zinc-900/40 p-6 md:p-8 rounded-[2.5rem] border border-zinc-800/50 shadow-inner relative ${!showSeriesControls ? 'col-span-1 md:col-span-2' : ''}`}>
                    <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> Episode / Sketch Title</span>
                    </label>
                    <input value={activeSketch?.title || ''} onChange={(e) => updateSketch(activeSketchId, 'title', e.target.value)} placeholder="Untitled Project..." className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-4 text-xl font-black focus:outline-none focus:border-orange-500/50 text-zinc-200" />
                  </div>
                </div>

                {showSeriesControls && (
                  <div className="space-y-2 bg-zinc-900/20 p-6 md:p-8 rounded-[2.5rem] border border-zinc-800/50 border-dashed">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2">Series Engine / Recurring Formula (Optional)</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleVoiceInput(activeSketch?.seriesPremise, (val) => updateSketch(activeSketchId, 'seriesPremise', val), 'seriesPremise')} className={`p-1.5 rounded transition-colors ${activeMicId === 'seriesPremise' ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`} title="Dictate"><Mic size={12}/></button>
                        {history[`sketch-seriesPremise`] !== undefined && (
                          <button onClick={() => revertSketchField('seriesPremise')} className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Undo AI edit"><Undo size={12}/></button>
                        )}
                        {aiMode === 'cowriter' && (
                          <button onClick={() => generateNarrativeBeat('seriesPremise')} disabled={!isRealUser || isAIBusy} className="p-1.5 hover:bg-purple-500/20 rounded transition-colors disabled:opacity-50 text-purple-500 flex items-center gap-1 text-[9px]">
                            {!isRealUser ? <Lock size={10} /> : <Sparkles size={10} />} GENERATE
                          </button>
                        )}
                      </div>
                    </label>
                    <textarea value={activeSketch?.seriesPremise || ''} onChange={(e) => updateSketch(activeSketchId, 'seriesPremise', e.target.value)} placeholder="If this is part of a recurring series, describe the master formula here. (e.g. In every episode, two inept cops try to interrogate a completely innocent object.)" className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-4 md:p-6 text-sm focus:outline-none focus:border-zinc-500/50 min-h-[80px] resize-y text-zinc-400 italic" />
                  </div>
                )}

                <div className="space-y-2 bg-zinc-900/40 p-6 md:p-8 rounded-[2.5rem] border border-zinc-800/50 shadow-inner relative">
                  <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> The Episode Premise / Logline</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleVoiceInput(activeSketch?.premise, (val) => updateSketch(activeSketchId, 'premise', val), 'premise')} className={`p-1.5 rounded transition-colors ${activeMicId === 'premise' ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`} title="Dictate"><Mic size={12}/></button>
                      {history[`sketch-premise`] !== undefined && (
                        <button onClick={() => revertSketchField('premise')} className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Undo AI edit"><Undo size={12}/></button>
                      )}
                      {aiMode === 'cowriter' && (
                        <button onClick={() => generateNarrativeBeat('premise')} disabled={!isRealUser || isAIBusy} className="p-1.5 hover:bg-orange-500/20 rounded transition-colors disabled:opacity-50 text-orange-500 flex items-center gap-1 text-[9px]">
                          {!isRealUser ? <Lock size={10} /> : <Sparkles size={10} />} GENERATE
                        </button>
                      )}
                    </div>
                  </label>
                  <textarea value={activeSketch?.premise || ''} onChange={(e) => updateSketch(activeSketchId, 'premise', e.target.value)} placeholder="Describe the basic concept for THIS specific sketch... (e.g. A guy attends a deeply serious funeral but gets stuck in his mascot uniform.)" className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-4 md:p-6 text-sm focus:outline-none focus:border-orange-500/50 min-h-[100px] resize-y text-zinc-200" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2 bg-zinc-900/20 p-5 rounded-[2rem] border border-zinc-800">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Film size={12}/> Genre</span>
                    <select value={GENRES.includes(activeSketch?.genre) ? activeSketch?.genre : 'Other'} onChange={(e) => updateSketch(activeSketchId, 'genre', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none font-bold cursor-pointer text-zinc-300">
                      {GENRES.map(g => <option key={g} value={g} className="bg-zinc-900 text-zinc-300">{g}</option>)}
                    </select>
                    {activeSketch?.genre === 'Other' || (!GENRES.includes(activeSketch?.genre) && activeSketch?.genre) ? (
                      <input value={activeSketch?.genre === 'Other' ? '' : activeSketch?.genre} onChange={(e) => updateSketch(activeSketchId, 'genre', e.target.value)} placeholder="Type custom genre..." className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none font-bold text-zinc-300 mt-2 shadow-inner" />
                    ) : null}
                  </div>
                  <div className="space-y-2 bg-zinc-900/20 p-5 rounded-[2rem] border border-zinc-800">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><VenetianMask size={12}/> Tone</span>
                    <select value={TONES.includes(activeSketch?.tone) ? activeSketch?.tone : 'Other'} onChange={(e) => updateSketch(activeSketchId, 'tone', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none font-bold cursor-pointer text-purple-400">
                      {TONES.map(t => <option key={t} value={t} className="bg-zinc-900 text-purple-400">{t}</option>)}
                    </select>
                    {activeSketch?.tone === 'Other' || (!TONES.includes(activeSketch?.tone) && activeSketch?.tone) ? (
                      <input value={activeSketch?.tone === 'Other' ? '' : activeSketch?.tone} onChange={(e) => updateSketch(activeSketchId, 'tone', e.target.value)} placeholder="Type custom tone..." className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none font-bold text-purple-400 mt-2 shadow-inner" />
                    ) : null}
                  </div>
                  <div className="space-y-2 bg-zinc-900/20 p-5 rounded-[2rem] border border-zinc-800">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><ImageIcon size={12}/> Art Style</span>
                    <select value={IMAGE_STYLES.includes(activeSketch?.imageStyle) ? activeSketch?.imageStyle : 'Other'} onChange={(e) => updateSketch(activeSketchId, 'imageStyle', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none font-bold cursor-pointer text-blue-400">
                      {IMAGE_STYLES.map(s => <option key={s} value={s} className="bg-zinc-900 text-blue-400">{s}</option>)}
                    </select>
                    {activeSketch?.imageStyle === 'Other' || (!IMAGE_STYLES.includes(activeSketch?.imageStyle) && activeSketch?.imageStyle) ? (
                      <input value={activeSketch?.imageStyle === 'Other' ? '' : activeSketch?.imageStyle} onChange={(e) => updateSketch(activeSketchId, 'imageStyle', e.target.value)} placeholder="Type custom style..." className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none font-bold text-blue-400 mt-2 shadow-inner" />
                    ) : null}
                  </div>
                  <div className="space-y-2 bg-zinc-900/20 p-5 rounded-[2rem] border border-zinc-800">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Layout size={12}/> Ratio</span>
                    <select value={activeSketch?.aspectRatio || '16:9'} onChange={(e) => updateSketch(activeSketchId, 'aspectRatio', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none font-bold cursor-pointer text-zinc-300">
                      {ASPECT_RATIOS.map(s => <option key={s.val} value={s.val} className="bg-zinc-900 text-zinc-300">{s.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-zinc-900/20 p-6 md:p-8 rounded-[2.5rem] border border-zinc-800 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Master Props List</span>
                    {aiMode !== 'manual' && (
                      <button onClick={autoExtractProps} disabled={!isRealUser || isAIBusy} className="text-[9px] font-black tracking-widest px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50">
                        {loadingStates.extractProps ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} AUTO-EXTRACT FROM SCRIPT
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {activePropsList.map((prop, idx) => (
                      <div key={idx} className="bg-zinc-950 border border-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold text-zinc-300">
                        {prop}
                        <button onClick={() => removeProp(idx)} className="text-zinc-600 hover:text-red-400 p-0.5"><X size={12}/></button>
                      </div>
                    ))}
                    {activePropsList.length === 0 && <span className="text-xs text-zinc-600 italic py-1.5">No props added yet.</span>}
                  </div>
                  
                  <div className="relative">
                    <input 
                      value={newPropInput} 
                      onChange={(e) => setNewPropInput(e.target.value)} 
                      onKeyDown={handleAddProp}
                      placeholder="Type a prop and press Enter..." 
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-zinc-500 text-zinc-300" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-600 border border-zinc-700 px-1.5 py-0.5 rounded pointer-events-none">ENTER</div>
                  </div>
                </div>

                <div className="border border-zinc-800 rounded-[2.5rem] overflow-hidden bg-zinc-900/10">
                  <button 
                    onClick={() => setShowAdvancedBeats(!showAdvancedBeats)} 
                    className="w-full p-6 flex justify-between items-center text-sm font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Advanced Narrative Beats
                    {showAdvancedBeats ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </button>
                  
                  {showAdvancedBeats && (
                    <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 border-t border-zinc-800/50 mt-2 pt-6">
                      {['hook', 'escalation', 'ending'].map((beat) => (
                        <div key={beat} className="space-y-2 bg-zinc-900/30 p-5 rounded-[2rem] border border-zinc-800/50">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center justify-between mb-2">
                            <span>The {beat}</span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleVoiceInput(activeSketch?.[beat], (val) => updateSketch(activeSketchId, beat, val), beat)} className={`p-1 hover:bg-zinc-800 rounded transition-colors ${activeMicId === beat ? 'text-red-500 animate-pulse' : 'text-zinc-500 hover:text-zinc-300'}`}><Mic size={10}/></button>
                              {aiMode === 'cowriter' && (
                                <button onClick={() => generateNarrativeBeat(beat)} disabled={!isRealUser || isAIBusy} className="p-1 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50 text-zinc-500 hover:text-white">
                                  {loadingStates[beat] ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                </button>
                              )}
                            </div>
                          </label>
                          <textarea value={activeSketch?.[beat] || ''} onChange={(e) => updateSketch(activeSketchId, beat, e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-zinc-500 min-h-[100px] resize-none text-zinc-300" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* --- TAB: SCRIPT --- */}
            {viewMode === 'script' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
                  <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800">
                    <button onClick={() => setScriptSubTab('editor')} className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors ${scriptSubTab === 'editor' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-zinc-500 hover:text-zinc-300'}`}>MANUAL SCRIPT</button>
                    {aiMode !== 'manual' && (
                      <button onClick={() => setScriptSubTab('breaker')} className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors flex items-center gap-1.5 ${scriptSubTab === 'breaker' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-zinc-500 hover:text-zinc-300'}`}><Scissors size={12}/> SCRIPT BREAKER</button>
                    )}
                  </div>
                  
                  {scriptSubTab === 'editor' && (
                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                      {aiMode === 'cowriter' && (
                        <>
                          <button onClick={draftScriptFromConfig} disabled={!isRealUser || isAIBusy} className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 rounded-full text-[10px] font-black transition-colors whitespace-nowrap shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-400">
                            {loadingStates.scriptDraft ? <Loader2 size={12} className="animate-spin" /> : (!isRealUser ? <Lock size={12} /> : <Sparkles size={12} />)} DRAFT FROM CONFIG
                          </button>
                          <button onClick={generateScriptFromShots} disabled={!isRealUser || isAIBusy} className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 rounded-full text-[10px] font-black whitespace-nowrap shadow-[0_0_15px_rgba(79,70,229,0.5)] border border-indigo-400">
                            {loadingStates.scriptGen ? <Loader2 size={12} className="animate-spin" /> : (!isRealUser ? <Lock size={12} /> : <Layout size={12} />)} GEN FROM BOARD
                          </button>
                        </>
                      )}
                      <button onClick={downloadScript} disabled={!activeSketch?.script} className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-2.5 bg-zinc-800 text-blue-400 hover:bg-zinc-700 disabled:opacity-50 rounded-full text-[10px] font-black transition-all border border-zinc-700"><Download size={12} /> SAVE PDF</button>
                    </div>
                  )}
                </div>

                {scriptSubTab === 'editor' && (
                  <div className="space-y-4">
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 relative shadow-xl">
                      {aiMode === 'cowriter' && (
                        <button onClick={getPunchUpNotes} disabled={!isRealUser || isAIBusy || !activeSketch?.script} className="absolute top-4 right-4 md:top-6 md:right-6 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 rounded-full text-[10px] font-black shadow-lg border border-purple-400 flex items-center gap-2 transition-colors z-10 shadow-[0_0_15px_rgba(147,51,234,0.5)]">
                          {loadingStates.punchUp ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} PUNCH UP NOTES
                        </button>
                      )}
                      <textarea value={activeSketch?.script || ''} onChange={(e) => updateSketch(activeSketchId, 'script', e.target.value)} className="w-full bg-zinc-950/80 rounded-2xl p-4 md:p-8 text-xs md:text-sm font-mono text-zinc-300 min-h-[60vh] focus:outline-none border border-zinc-800/50 resize-y leading-relaxed whitespace-pre-wrap shadow-inner pt-12 md:pt-8" placeholder="Generate a script from your storyboard, draft from your config, or type manually..." />
                    </div>

                    {Array.isArray(activeSketch?.punchUpNotes) && activeSketch.punchUpNotes.length > 0 && (
                      <div className="bg-purple-900/10 border border-purple-500/30 rounded-[2rem] p-6 md:p-8 relative shadow-lg animate-in slide-in-from-top-4 mt-6">
                        <button onClick={() => { updateSketch(activeSketchId, 'punchUpNotes', []); setSelectedPunchUps([]); }} className="absolute top-4 right-4 p-2 bg-zinc-950/80 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors border border-zinc-800"><X size={14}/></button>
                        <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Sparkles size={14}/> Showrunner Notes</h3>
                        
                        <div className="space-y-3 mb-6">
                          {activeSketch.punchUpNotes.map((note, idx) => {
                            const isSelected = selectedPunchUps.includes(idx);
                            return (
                              <label key={idx} className="flex items-start gap-3 cursor-pointer group">
                                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'bg-zinc-950 border-purple-500/50 text-transparent group-hover:border-purple-400'}`}>
                                  <CheckCircle2 size={14} />
                                </div>
                                <span className={`text-sm leading-relaxed transition-colors ${isSelected ? 'text-purple-200' : 'text-purple-300/70'}`}>{note}</span>
                                <input type="checkbox" className="hidden" checked={isSelected} onChange={() => {
                                  setSelectedPunchUps(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
                                }}/>
                              </label>
                            );
                          })}
                        </div>
                        
                        {selectedPunchUps.length > 0 && (
                          <div className="flex justify-end">
                            <button onClick={implementPunchUps} disabled={loadingStates.implementNotes} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-[10px] uppercase tracking-widest font-black transition-colors shadow-[0_0_15px_rgba(147,51,234,0.5)] border border-purple-400 flex items-center gap-2">
                              {loadingStates.implementNotes ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} IMPLEMENT {selectedPunchUps.length} NOTE{selectedPunchUps.length > 1 ? 'S' : ''}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {scriptSubTab === 'breaker' && aiMode !== 'manual' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-purple-500 flex items-center gap-2"><Scissors size={24} /> The Script Breaker</h2>
                        <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest">Paste a screenplay. Let the AI digest it and build your board.</p>
                      </div>
                      {scriptChunks.length > 0 && (
                        <button onClick={() => { setScriptChunks([]); setRawImportScript(''); }} className="px-4 py-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-full text-[10px] font-black transition-colors">START OVER</button>
                      )}
                    </div>

                    {scriptChunks.length === 0 ? (
                      <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-inner">
                        <textarea 
                          value={rawImportScript} 
                          onChange={(e) => setRawImportScript(e.target.value)} 
                          placeholder="Paste your script text here... It's best if scenes start with standard headings like INT. LOCATION - DAY, but the AI will try to infer them if missing." 
                          className="w-full bg-zinc-950/80 rounded-2xl p-4 md:p-6 text-sm font-mono text-zinc-300 min-h-[40vh] focus:outline-none border border-zinc-800/50 resize-y whitespace-pre-wrap"
                        />
                        <div className="mt-4 flex flex-col lg:flex-row justify-between gap-4">
                          <button onClick={() => setRawImportScript(activeSketch?.script || '')} disabled={!activeSketch?.script} className="w-full lg:w-auto px-6 py-3 bg-zinc-800/50 hover:bg-zinc-700 disabled:opacity-50 text-blue-400 font-black text-[10px] rounded-full tracking-widest transition-all flex items-center justify-center gap-2 border border-zinc-800">
                            <ScrollText size={14}/> PULL FROM SCRIPT EDITOR
                          </button>
                          <div className="flex flex-col sm:flex-row justify-end gap-3 w-full lg:w-auto">
                            <button onClick={analyzeScriptMetadata} disabled={!rawImportScript.trim() || !isRealUser || isAIBusy} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-[10px] rounded-full tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-400">
                              {loadingStates.analyzeScript ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} 1. ANALYZE METADATA & CAST
                            </button>
                            <button onClick={parseScriptIntoChunks} disabled={!rawImportScript.trim()} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs rounded-full tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.5)] border border-purple-400">
                              <Scissors size={14}/> 2. SLICE INTO SCENES
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between text-purple-400">
                          <span className="text-xs font-bold">Successfully sliced into {scriptChunks.length} scenes.</span>
                          <span className="text-[10px] uppercase tracking-widest font-black">Process them one by one.</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {scriptChunks.map((chunk, idx) => (
                            <div key={chunk.id} className={`p-5 rounded-[1.5rem] border transition-all ${chunk.status === 'done' ? 'bg-green-900/10 border-green-900/30' : chunk.status === 'error' ? 'bg-red-900/10 border-red-900/30' : 'bg-zinc-900/40 border-zinc-800'}`}>
                              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-black uppercase text-zinc-200 mb-1 truncate">{chunk.heading || '[NO HEADING - AI WILL INFER]'}</h4>
                                  <p className="text-xs text-zinc-500 line-clamp-2 font-mono">{chunk.text.substring((chunk.heading || '').length).trim()}</p>
                                </div>
                                <div className="shrink-0">
                                  {chunk.status === 'done' ? (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-green-500 bg-green-500/10 px-3 py-1.5 rounded-full"><CheckCircle2 size={14}/> PROCESSED</span>
                                  ) : chunk.status === 'processing' ? (
                                    <span className="flex items-center gap-2 text-[10px] font-black text-purple-400 bg-purple-500/10 px-4 py-1.5 rounded-full"><Loader2 size={14} className="animate-spin"/> BREAKING DOWN...</span>
                                  ) : (
                                    <button onClick={() => processScriptChunk(idx)} disabled={isAIBusy || !isRealUser} className="w-full sm:w-auto flex items-center justify-center gap-1 text-[10px] font-black bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-full disabled:opacity-50 transition-colors shadow-lg">
                                      {!isRealUser ? <Lock size={12}/> : <Wand2 size={12}/>} EXTRACT SHOTS
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* --- TAB: CHARACTER BIBLE --- */}
            {viewMode === 'characters' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-green-500 flex items-center gap-2"><Users size={24} /> Character Bible</h2>
                    <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest">Changing a name here will auto-update the entire shot list and script.</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {aiMode !== 'manual' && (
                      <button onClick={extractCharacters} disabled={!isRealUser || isAIBusy} className="flex-1 sm:flex-none justify-center items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 rounded-full text-xs font-black transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)] flex">
                        {loadingStates.extractChars ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} AUTO-EXTRACT
                      </button>
                    )}
                    <button onClick={addCharacter} className="flex-1 sm:flex-none justify-center items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white border border-green-400 rounded-full text-xs font-black transition-all shadow-[0_0_15px_rgba(22,163,74,0.5)] flex"><Plus size={14} /> ADD CHARACTER</button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {activeProfiles.map(char => (
                    <div key={char.id} className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] p-6 flex flex-col gap-6 relative group transition-all hover:border-zinc-700 shadow-xl">
                      <div className="absolute top-4 right-4 flex items-center gap-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => updateChar(char.id, 'isLocked', !char.isLocked)} className={`p-2 rounded-full border shadow-md transition-colors ${char.isLocked ? 'bg-orange-500/20 border-orange-500 text-orange-500' : 'bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`} title={char.isLocked ? "Locked. Immune to AI overrides. Kept on duplicate." : "Unlocked. Will be overwritten by AI auto-extract."}>
                          {char.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                        <button onClick={() => removeChar(char.id)} className="p-2 bg-zinc-950/50 rounded-full text-zinc-500 hover:text-red-400 border border-zinc-800 shadow-md"><Trash2 size={14} /></button>
                      </div>
                      
                      <div className="flex gap-5 items-center pr-20">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-950 rounded-full overflow-hidden flex-shrink-0 relative group/avatar border-2 border-zinc-800 shadow-inner">
                           {char.image ? <img src={char.image} className="w-full h-full object-cover"/> : <User size={32} className="m-auto mt-6 sm:mt-8 text-zinc-700"/>}
                           <input type="file" accept="image/*" onChange={(e) => handleCharImageUpload(char.id, e)} className="hidden" id={`char-img-${char.id}`} />
                           <label htmlFor={`char-img-${char.id}`} className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity z-10">
                              <Upload size={20} className="text-white"/>
                           </label>
                           {aiMode === 'cowriter' && (
                             <button onClick={() => generateCharAvatar(char.id)} disabled={!isRealUser || loadingStates[`charImg-${char.id}`]} className="absolute bottom-2 right-2 bg-purple-600/90 hover:bg-purple-500 p-2 rounded-full text-white shadow-lg opacity-0 group-hover/avatar:opacity-100 transition-opacity z-20 disabled:opacity-50" title="Generate AI Avatar">
                               {loadingStates[`charImg-${char.id}`] ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                             </button>
                           )}
                        </div>
                        <div className="flex-1 space-y-2">
                           <input 
                              value={bulkCharEdit.id === char.id ? bulkCharEdit.value : (char.name || '')} 
                              onFocus={() => setBulkCharEdit({ id: char.id, oldName: char.name || '', value: char.name || '' })}
                              onChange={(e) => setBulkCharEdit({ ...bulkCharEdit, value: e.target.value })}
                              onBlur={commitCharRename}
                              onKeyDown={(e) => e.key === 'Enter' && commitCharRename()}
                              placeholder="Character Name" 
                              className="bg-transparent text-2xl font-black focus:outline-none text-zinc-100 w-full placeholder-zinc-800 border-b border-zinc-800 focus:border-green-500 pb-1" 
                           />
                           <select value={COMEDY_ARCHETYPES.includes(char.archetype) ? char.archetype : 'Other'} onChange={(e) => updateChar(char.id, 'archetype', e.target.value)} className="bg-zinc-900 text-green-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-800 focus:outline-none cursor-pointer w-full appearance-none">
                              {COMEDY_ARCHETYPES.map(a => <option key={a} value={a} className="bg-zinc-900 text-green-400">{a}</option>)}
                           </select>
                           {char.archetype === 'Other' || (!COMEDY_ARCHETYPES.includes(char.archetype) && char.archetype) ? (
                              <input value={char.archetype === 'Other' ? '' : char.archetype} onChange={(e) => updateChar(char.id, 'archetype', e.target.value)} placeholder="Type custom archetype..." className="bg-zinc-950 text-green-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-800 focus:outline-none w-full mt-2 shadow-inner" />
                           ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-zinc-800/50">
                        <div className="space-y-2">
                          <div className="flex justify-between text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                            <span>Age</span><span className="text-zinc-300">{char.age || 30}</span>
                          </div>
                          <input type="range" min="1" max="100" value={char.age || 30} onChange={(e) => updateChar(char.id, 'age', e.target.value)} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                            <span>Sex (Biology)</span>
                          </div>
                          <select value={char.sex || 'Male'} onChange={(e) => updateChar(char.id, 'sex', e.target.value)} className="w-full bg-zinc-900 text-zinc-300 text-[10px] font-black px-3 py-1 rounded-lg border border-zinc-800 focus:outline-none cursor-pointer appearance-none uppercase tracking-widest">
                            <option value="Male" className="bg-zinc-900 text-zinc-300">Male</option>
                            <option value="Female" className="bg-zinc-900 text-zinc-300">Female</option>
                            <option value="Intersex" className="bg-zinc-900 text-zinc-300">Intersex</option>
                          </select>
                        </div>
                        <div className="space-y-2 col-span-2">
                          <div className="flex justify-between text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                            <span>Fem Presentation</span><span>Masc Presentation</span>
                          </div>
                          <input type="range" min="0" max="100" value={char.gender !== undefined ? char.gender : 50} onChange={(e) => updateChar(char.id, 'gender', e.target.value)} className="w-full h-1.5 bg-gradient-to-r from-pink-500/50 via-zinc-800 to-blue-500/50 rounded-lg appearance-none cursor-pointer accent-zinc-300" />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <div className="flex justify-between text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                            <span>Light Skin</span><span>Dark Skin</span>
                          </div>
                          <input type="range" min="0" max="100" value={char.melanin !== undefined ? char.melanin : 50} onChange={(e) => updateChar(char.id, 'melanin', e.target.value)} className="w-full h-1.5 bg-gradient-to-r from-[#f1c27d]/50 via-[#c08253]/50 to-[#3e2311]/50 rounded-lg appearance-none cursor-pointer accent-zinc-300" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div className="relative">
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 block">Visual Style / Wardrobe</label>
                          <textarea value={char.visualStyle || ''} onChange={(e) => updateChar(char.id, 'visualStyle', e.target.value)} placeholder="Wardrobe, posture, defining physical traits..." className="w-full bg-zinc-950/50 rounded-xl p-4 text-xs text-zinc-300 resize-none focus:outline-none border border-zinc-800/50 focus:border-green-500/50 h-28 leading-relaxed shadow-inner" />
                          <button onClick={() => handleVoiceInput(char.visualStyle, (val) => updateChar(char.id, 'visualStyle', val), `char-vis-${char.id}`)} className={`absolute bottom-3 right-3 p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg transition-colors shadow-md ${activeMicId === `char-vis-${char.id}` ? 'text-red-500 animate-pulse' : 'text-zinc-500 hover:text-zinc-300'}`} title="Dictate"><Mic size={12}/></button>
                        </div>
                        <div className="relative">
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 block">Personality / Fatal Flaw</label>
                          <textarea value={char.personality || ''} onChange={(e) => updateChar(char.id, 'personality', e.target.value)} placeholder="Fatal flaw, demeanor, comedic neuroses..." className="w-full bg-zinc-950/50 rounded-xl p-4 text-xs text-zinc-300 resize-none focus:outline-none border border-zinc-800/50 focus:border-green-500/50 h-28 leading-relaxed shadow-inner" />
                          <button onClick={() => handleVoiceInput(char.personality, (val) => updateChar(char.id, 'personality', val), `char-per-${char.id}`)} className={`absolute bottom-3 right-3 p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg transition-colors shadow-md ${activeMicId === `char-per-${char.id}` ? 'text-red-500 animate-pulse' : 'text-zinc-500 hover:text-zinc-300'}`} title="Dictate"><Mic size={12}/></button>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 border-t border-zinc-800/50 pt-4">
                        {history[`char-${char.id}-visualStyle`] !== undefined && (
                          <button onClick={() => revertCharTraits(char.id)} className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors shadow-md" title="Undo AI edit"><Undo size={14}/></button>
                        )}
                        {aiMode === 'cowriter' && (
                          <button onClick={() => generateCharTraits(char.id)} disabled={!isRealUser || isAIBusy} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-green-400 transition-colors disabled:opacity-50 shadow-md flex items-center gap-2" title="Generate character flaw">
                            {loadingStates[`char-${char.id}`] ? <Loader2 size={12} className="animate-spin text-green-500" /> : (!isRealUser ? <Lock size={12} /> : <Sparkles size={12} />)} AI TOUCH-UP
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {activeProfiles.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-[2rem] text-zinc-600 flex flex-col items-center gap-3">
                      <Users size={32} className="opacity-50"/>
                      <p className="text-sm font-bold uppercase tracking-widest">No Characters Added Yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- TAB: STORYBOARD (SHOT LIST & SUB-VIEWS) --- */}
            {viewMode === 'storyboard' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 md:space-y-8">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4 print:hidden">
                  <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800 overflow-x-auto w-full sm:w-auto">
                    <button onClick={() => setBoardSubTab('grid')} className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors whitespace-nowrap flex items-center gap-1.5 ${boardSubTab === 'grid' ? 'bg-zinc-100 text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><Layout size={12}/> VISUAL GRID</button>
                    <button onClick={() => optimizeShootOrder(false)} disabled={isAIBusy} className={`px-6 py-2 rounded-full text-xs font-black transition-colors whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50 ${boardSubTab === 'shoot-plan' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)] border border-yellow-400' : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'}`}>
                      {loadingStates.optimizing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} 1ST AD PLAN
                    </button>
                    <div className="w-px h-4 bg-zinc-700 mx-1 my-auto"></div>
                    <button onClick={() => setBoardSubTab('print-boards')} className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors whitespace-nowrap flex items-center gap-1.5 ${boardSubTab === 'print-boards' ? 'bg-zinc-700 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}><Printer size={12}/> BOARDS</button>
                    <button onClick={() => setBoardSubTab('print-list')} className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors whitespace-nowrap flex items-center gap-1.5 ${boardSubTab === 'print-list' ? 'bg-zinc-700 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}><ListVideo size={12}/> LIST</button>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
                    {boardSubTab === 'grid' && activeShots.length > 0 && (
                      <button onClick={clearAllShots} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-900/50 rounded-full text-[10px] font-black transition-colors">
                        <Trash2 size={14}/> CLEAR BOARD
                      </button>
                    )}
                    {boardSubTab === 'grid' && aiMode === 'cowriter' && (
                      <div className="flex bg-purple-600/20 border border-purple-500/30 rounded-full overflow-hidden shadow-lg shadow-purple-900/20 shrink-0">
                        <div className="flex items-center px-3 border-r border-purple-500/30 text-purple-400">
                          {loadingStates.genShots ? <Loader2 size={12} className="animate-spin" /> : (!isRealUser ? <Lock size={12} /> : <Sparkles size={12} />)}
                        </div>
                        <button onClick={() => generateAISHots(1, 'opening')} disabled={!isRealUser || isAIBusy} className="px-3 py-2 text-[9px] font-black hover:bg-purple-600 hover:text-white text-purple-300 transition-colors border-r border-purple-500/30 whitespace-nowrap disabled:opacity-50">OPENING</button>
                        <button onClick={() => generateAISHots(4, 'sequence')} disabled={!isRealUser || isAIBusy} className="px-3 py-2 text-[10px] font-black hover:bg-purple-600 hover:text-white text-purple-300 transition-colors border-r border-purple-500/30 disabled:opacity-50">+4</button>
                        <button onClick={() => generateAISHots(6, 'sequence')} disabled={!isRealUser || isAIBusy} className="px-3 py-2 text-[10px] font-black hover:bg-purple-600 hover:text-white text-purple-300 transition-colors border-r border-purple-500/30 disabled:opacity-50">+6</button>
                        <button onClick={() => generateAISHots(8, 'sequence')} disabled={!isRealUser || isAIBusy} className="px-3 py-2 text-[10px] font-black hover:bg-purple-600 hover:text-white text-purple-300 transition-colors border-r border-purple-500/30 disabled:opacity-50">+8</button>
                        <button onClick={() => generateAISHots(1, 'ending')} disabled={!isRealUser || isAIBusy} className="px-3 py-2 text-[9px] font-black hover:bg-purple-600 hover:text-white text-purple-300 transition-colors whitespace-nowrap disabled:opacity-50">ENDING</button>
                      </div>
                    )}
                    {boardSubTab === 'shoot-plan' && (
                      <>
                        <button onClick={() => optimizeShootOrder(false)} disabled={isAIBusy} className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-full text-[10px] font-black transition-all flex">
                          {loadingStates.optimizing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />} REASSESS
                        </button>
                        <button onClick={downloadShootPlan} className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 bg-zinc-800 text-yellow-500 hover:bg-zinc-700 border border-zinc-700 rounded-full text-[10px] font-black transition-all flex"><Download size={12} /> SAVE TXT</button>
                      </>
                    )}
                  </div>
                </div>

                {boardSubTab === 'grid' && (
                  <div className="space-y-4">
                    {activeShots.length === 0 && (
                      <div className="py-16 text-center border-2 border-dashed border-zinc-800 rounded-[3rem] text-zinc-600 flex flex-col items-center gap-4">
                        <Camera size={48} className="opacity-30"/>
                        <p className="text-sm font-bold uppercase tracking-widest">The board is empty.<br/>Add a shot manually or use the AI builder.</p>
                      </div>
                    )}

                    {activeShots.map((shot, index) => {
                      const currentPrompt = getShotPrompt(shot);
                      const isPersonalKeyActive = userApiKey.trim().length > 0;
                      
                      const currentHeading = shot.sceneHeading || '';
                      const previousShot = index > 0 ? activeShots[index - 1] : null;
                      const previousHeading = previousShot?.sceneHeading || '';
                      const isNewScene = index === 0 || currentHeading !== previousHeading;
                      const isEditingThisHeading = bulkHeadingEdit.old === currentHeading;
                      const colorTheme = SHOT_COLORS.find(c => c.name === shot.colorGroup) || SHOT_COLORS[0];
                      
                      return (
                      <React.Fragment key={shot.id}>
                        {isNewScene && (
                           <div className="flex items-center gap-4 py-4 mt-8">
                             <div className="h-px bg-zinc-800 flex-1"></div>
                             <div className="text-sm font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-4 py-2 rounded-full border border-orange-500/20 flex items-center gap-2 group/heading">
                                <Clapperboard size={16}/> 
                                <input 
                                  value={isEditingThisHeading ? (bulkHeadingEdit.value || '') : currentHeading}
                                  onChange={(e) => setBulkHeadingEdit({ old: currentHeading, value: e.target.value.toUpperCase() })}
                                  onBlur={() => {
                                    if (bulkHeadingEdit.old) {
                                      updateSceneHeadingBulk(bulkHeadingEdit.old, bulkHeadingEdit.value);
                                      setBulkHeadingEdit({ old: null, value: '' });
                                    }
                                  }}
                                  className="bg-transparent border-none outline-none text-orange-500 placeholder-orange-500/50 min-w-[150px] sm:min-w-[250px]"
                                  title="Edit to rename all shots in this scene"
                                />
                             </div>
                             <div className="h-px bg-zinc-800 flex-1"></div>
                           </div>
                        )}
                        
                        <div className={`group ${colorTheme.bg} border ${shot.fx ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.15)]' : colorTheme.border} rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 transition-all relative overflow-hidden mt-4`}>
                          
                          <div className="absolute top-0 right-0 p-4 md:p-6 text-6xl md:text-9xl text-zinc-800/20 font-black pointer-events-none select-none z-0">{index + 1}</div>
                          
                          {/* COLOR PICKER & DELETE */}
                          <div className="absolute top-4 right-4 md:top-6 md:right-6 flex flex-col items-end gap-3 z-20">
                             <button onClick={() => deleteShot(shot.id)} className="p-2 text-zinc-600 hover:text-red-400 bg-zinc-950/80 rounded-full border border-zinc-800 hover:border-red-500/50 transition-all shadow-lg"><Trash2 size={16} /></button>
                             <div className="flex flex-col gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-zinc-950/80 p-1.5 rounded-full border border-zinc-800">
                               {SHOT_COLORS.map(c => (
                                 <button 
                                   key={c.name} 
                                   onClick={() => updateShot(shot.id, 'colorGroup', c.name)} 
                                   className={`w-3 h-3 rounded-full border border-zinc-700 hover:scale-125 transition-transform ${c.dotBg} ${shot.colorGroup === c.name ? 'ring-1 ring-white scale-125' : ''}`}
                                   title={`Tag color: ${c.name}`}
                                 />
                               ))}
                             </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 relative z-10 w-full mt-8 md:mt-0">
                            
                            <div className="lg:col-span-4 space-y-4 w-full">
                              
                              <div className="bg-zinc-950 rounded-[1.5rem] border border-zinc-800 overflow-hidden relative group/img flex items-center justify-center mx-auto" style={{ aspectRatio: (activeSketch?.aspectRatio || '16:9').replace(':', '/') }}>
                                {shot.image ? (
                                  <><img src={shot.image} alt="Storyboard" className="w-full h-full object-cover" />
                                    <div className="absolute top-3 right-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover/img:opacity-100 transition-opacity">
                                      <button onClick={() => setZoomedImage(shot.image)} className="p-2 bg-black/60 hover:bg-black/80 rounded-full text-white shadow-lg"><Maximize2 size={14} /></button>
                                      <button onClick={() => downloadImage(shot.id, shot.number)} className="p-2 bg-black/60 hover:bg-black/80 rounded-full text-white shadow-lg"><Download size={14} /></button>
                                      <button onClick={() => updateShot(shot.id, 'image', null)} className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white shadow-lg"><X size={14} /></button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-center p-4 md:p-6 w-full">
                                    {visiblePromptId === shot.id ? (
                                      <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-xl text-left relative animate-in fade-in zoom-in-95 duration-200 shadow-xl flex flex-col h-full justify-between">
                                        <div>
                                          <button onClick={() => setVisiblePromptId(null)} className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-white bg-zinc-800 rounded-full"><X size={10} /></button>
                                          <p className="text-[9px] text-zinc-400 mb-2 font-mono pr-4 h-20 overflow-y-auto leading-relaxed select-all">{currentPrompt}</p>
                                        </div>
                                        <button onClick={() => copyPrompt(currentPrompt)} className="w-full bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-black py-2 rounded flex items-center justify-center gap-1 transition-colors"><Copy size={10} /> COPY PROMPT</button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center gap-3">
                                        <ImageIcon className="text-zinc-800 mx-auto" size={32} />
                                        <label className="text-[10px] font-black text-zinc-500 hover:text-orange-400 border border-zinc-800 hover:border-orange-500/50 hover:bg-orange-500/10 px-4 py-2 rounded-full flex items-center gap-2 cursor-pointer transition-all">
                                          <Upload size={10} /> UPLOAD
                                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(shot.id, e)} />
                                        </label>
                                        {aiMode === 'cowriter' && (
                                          <div className="flex gap-2">
                                            <button onClick={() => setVisiblePromptId(shot.id)} className="text-[9px] font-black text-zinc-600 hover:text-purple-400 flex items-center gap-1 transition-colors uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800"><FileText size={10} /> PROMPT</button>
                                            <button onClick={() => generateImage(shot.id)} disabled={(!isPersonalKeyActive && !useFreeImageGen) || loadingStates[`image-${shot.id}`] || isAIBusy} className={`text-[9px] font-black flex items-center gap-1 transition-colors uppercase tracking-widest px-3 py-1.5 rounded border ${isPersonalKeyActive || useFreeImageGen ? 'text-zinc-300 bg-purple-600/20 border-purple-500/30 hover:bg-purple-600 hover:text-white' : 'text-zinc-600 bg-zinc-900 border-zinc-800 opacity-50'}`} title={!isPersonalKeyActive && !useFreeImageGen ? "Requires personal API Key in sidebar" : "Generate Image"}>
                                              {loadingStates[`image-${shot.id}`] ? <Loader2 size={10} className="animate-spin text-purple-400" /> : (!isPersonalKeyActive && !useFreeImageGen ? <Lock size={10} /> : <Sparkles size={10} />)} {useFreeImageGen ? 'GEN (FREE)' : 'GENERATE'}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col gap-2 w-full mt-4">
                                <div className="flex items-center bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-3 py-3 md:py-2 w-full focus-within:border-orange-500/50 transition-colors">
                                  <Clapperboard size={12} className="text-orange-500 mr-2 shrink-0" />
                                  <input value={shot.sceneHeading || ''} onChange={(e) => updateShot(shot.id, 'sceneHeading', e.target.value)} placeholder="INT. LOCATION - DAY" className="w-full bg-transparent text-[10px] font-black uppercase text-zinc-300 focus:outline-none min-w-0 tracking-widest" />
                                </div>
                                <div className="flex gap-2 w-full">
                                  <select value={shot.type || 'Medium'} onChange={(e) => updateShot(shot.id, 'type', e.target.value)} className="flex-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 md:p-2.5 text-xs font-bold focus:ring-1 ring-orange-500 appearance-none text-zinc-300">
                                    {SHOT_TYPES.map(type => <option key={type} value={type} className="bg-zinc-900 text-zinc-300">{type}</option>)}
                                  </select>
                                  <button onClick={() => updateShot(shot.id, 'fx', !shot.fx)} className={`px-4 py-3 md:py-2 rounded-xl text-[10px] font-black border ${shot.fx ? 'bg-orange-600 text-white border-orange-400' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>FX</button>
                                </div>
                                <div className="flex items-center bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-3 py-3 md:py-2 w-full"><Map size={12} className="text-zinc-500 mr-2 shrink-0" /><input value={shot.locationCaveat || ''} onChange={(e) => updateShot(shot.id, 'locationCaveat', e.target.value)} placeholder="Specific area caveat... (e.g. Corner desk)" className="w-full bg-transparent text-[10px] font-bold text-zinc-400 focus:outline-none min-w-0" /></div>
                                
                                <div className="flex gap-2 w-full">
                                  <div className="flex-1 bg-zinc-950/50 border border-zinc-800/50 rounded-xl focus-within:border-blue-500/50 transition-colors flex items-center px-2">
                                     <Video size={12} className="text-blue-500 mr-2 shrink-0"/>
                                     <select value={shot.cameraMove || 'Locked Off'} onChange={(e) => updateShot(shot.id, 'cameraMove', e.target.value)} className="w-full bg-transparent text-[10px] text-blue-400 font-bold py-3 md:py-2 focus:outline-none appearance-none cursor-pointer">
                                       {CAMERA_MOVES.map(m => <option key={m} value={m} className="bg-zinc-900 text-blue-400">{m}</option>)}
                                     </select>
                                  </div>
                                  <div className="w-24 bg-zinc-950/50 border border-zinc-800/50 rounded-xl focus-within:border-green-500/50 transition-colors flex items-center px-2">
                                     <Clock size={12} className="text-green-500 mr-2 shrink-0"/>
                                     <input type="number" min="1" value={shot.duration || 5} onChange={(e) => updateShot(shot.id, 'duration', e.target.value)} className="w-full bg-transparent text-[10px] text-green-400 font-bold py-3 md:py-2 focus:outline-none text-center" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="lg:col-span-8 flex flex-col justify-between w-full h-full">
                              <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                  <div className="flex-1 space-y-3 w-full">
                                    <input value={shot.subject || ''} onChange={(e) => updateShot(shot.id, 'subject', e.target.value)} placeholder="Subject..." className="w-full bg-transparent text-xl md:text-2xl font-black border-b border-zinc-500 focus:border-orange-500 p-1 focus:outline-none" />
                                    {availableCharacters.length > 0 && (
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        <span className="text-[9px] font-black text-zinc-500 uppercase flex items-center h-6 mr-1 shrink-0">In Shot:</span>
                                        {availableCharacters.map(char => {
                                          const isActive = (shot.shotCharacters || []).includes(char);
                                          return (<button key={char} onClick={() => toggleShotCharacter(shot.id, char)} className={`px-3 py-1.5 md:py-1 rounded-full text-[10px] font-bold border transition-all whitespace-nowrap ${isActive ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50'}`}>{char}</button>);
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-2 w-full">
                                  <div className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => handleVoiceInput(shot.action, (val) => updateShot(shot.id, 'action', val), `action-${shot.id}`)} className={`p-1 rounded transition-colors ${activeMicId === `action-${shot.id}` ? 'text-red-500 animate-pulse' : 'text-zinc-500 hover:text-zinc-300'}`} title="Dictate"><Mic size={10}/></button>
                                      {history[`shot-${shot.id}-action`] !== undefined && (
                                        <button onClick={() => revertShotField(shot.id, 'action')} className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Undo AI edit"><Undo size={12}/></button>
                                      )}
                                      {aiMode === 'cowriter' && (
                                        <button onClick={() => generateTextAssist(shot.id, 'action', 'Director blocking physical comedy. Write in screenplay format.', `Describe exactly what we SEE. Focus on specific physical action, props, and facial expressions. Max 1-2 brief sentences.`)} disabled={!isRealUser || isAIBusy} className="p-1 hover:bg-orange-500/20 rounded disabled:opacity-50 shrink-0 text-orange-500">{loadingStates[`action-${shot.id}`] ? <Loader2 size={12} className="animate-spin" /> : (!isRealUser ? <Lock size={12} /> : <Clapperboard size={12} />)}</button>
                                      )}
                                    </div>
                                    Action / Blocking
                                  </div>
                                  <textarea value={shot.action || ''} onChange={(e) => updateShot(shot.id, 'action', e.target.value)} className="w-full bg-zinc-950/30 rounded-[1.5rem] p-4 text-xs text-zinc-200 min-h-[80px] md:min-h-[60px] focus:outline-none border border-zinc-800/30 focus:border-orange-500/50 resize-y" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
                                  <div className="space-y-2 w-full">
                                    <div className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => handleVoiceInput(shot.dialogue, (val) => updateShot(shot.id, 'dialogue', val), `dialogue-${shot.id}`)} className={`p-1 rounded transition-colors ${activeMicId === `dialogue-${shot.id}` ? 'text-red-500 animate-pulse' : 'text-zinc-500 hover:text-zinc-300'}`} title="Dictate"><Mic size={10}/></button>
                                        {history[`shot-${shot.id}-dialogue`] !== undefined && (
                                          <button onClick={() => revertShotField(shot.id, 'dialogue')} className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Undo AI edit"><Undo size={12}/></button>
                                        )}
                                        {aiMode === 'cowriter' && (
                                          <button onClick={() => generateTextAssist(shot.id, 'dialogue', 'Writer drafting dialogue.', `Write a single punchy line of dialogue, or a brief improv prompt. Max 1-2 sentences. DO NOT write a full script format.`)} disabled={!isRealUser || isAIBusy} className="p-1 hover:bg-purple-500/20 rounded disabled:opacity-50 shrink-0 text-purple-500">{loadingStates[`dialogue-${shot.id}`] ? <Loader2 size={12} className="animate-spin" /> : (!isRealUser ? <Lock size={12} /> : <Quote size={12} />)}</button>
                                        )}
                                      </div>
                                      Dialogue / Improv
                                    </div>
                                    <textarea value={shot.dialogue || ''} onChange={(e) => updateShot(shot.id, 'dialogue', e.target.value)} className="w-full bg-zinc-950/30 rounded-[1.5rem] p-4 text-xs text-zinc-200 min-h-[100px] focus:outline-none border border-zinc-800/30 focus:border-purple-500/50 resize-y" />
                                  </div>
                                  <div className="space-y-2 w-full">
                                    <div className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => handleVoiceInput(shot.notes, (val) => updateShot(shot.id, 'notes', val), `notes-${shot.id}`)} className={`p-1 rounded transition-colors ${activeMicId === `notes-${shot.id}` ? 'text-red-500 animate-pulse' : 'text-zinc-500 hover:text-zinc-300'}`} title="Dictate"><Mic size={10}/></button>
                                        {history[`shot-${shot.id}-notes`] !== undefined && (
                                          <button onClick={() => revertShotField(shot.id, 'notes')} className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Undo AI edit"><Undo size={12}/></button>
                                        )}
                                        {aiMode === 'cowriter' && (
                                          <button onClick={() => generateTextAssist(shot.id, 'notes', 'DP advising on camera/light.', `Focus on lighting, lens choice, and camera movement. Max 1-2 brief sentences.`)} disabled={!isRealUser || isAIBusy} className="p-1 hover:bg-blue-500/20 rounded disabled:opacity-50 shrink-0 text-blue-500">{loadingStates[`notes-${shot.id}`] ? <Loader2 size={12} className="animate-spin" /> : (!isRealUser ? <Lock size={12} /> : <Wand2 size={12} />)}</button>
                                        )}
                                      </div>
                                      Director Notes
                                    </div>
                                    <textarea value={shot.notes || ''} onChange={(e) => updateShot(shot.id, 'notes', e.target.value)} className="w-full bg-zinc-950/30 rounded-[1.5rem] p-4 text-xs text-zinc-400 min-h-[100px] focus:outline-none border border-zinc-800/30 focus:border-blue-500/50 resize-y italic" />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex justify-end items-end mt-6 pt-4 border-t border-zinc-800/30">
                                <div className="flex items-center gap-1 bg-zinc-950/50 rounded-xl p-1 border border-zinc-800/50">
                                  <button onClick={() => moveShot(index, -1)} disabled={index === 0} className="p-2 md:p-1.5 text-zinc-600 hover:text-white disabled:opacity-20 transition-colors" title="Move Up"><ArrowUp size={16} /></button>
                                  <div className="flex items-center px-1">
                                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mr-1.5 hidden md:block">POS</span>
                                    <select value={index + 1} onChange={(e) => moveToPosition(index, parseInt(e.target.value) - 1)} className="bg-zinc-900 text-orange-500 text-xs font-black px-2 py-1.5 rounded-lg border border-zinc-800 focus:outline-none focus:border-orange-500/50 cursor-pointer appearance-none text-center min-w-[3rem]" title="Jump to position">
                                      {activeShots.map((_, i) => <option key={i} value={i + 1} className="bg-zinc-900 text-orange-500">{i + 1}</option>)}
                                    </select>
                                  </div>
                                  <button onClick={() => moveShot(index, 1)} disabled={index === activeShots.length - 1} className="p-2 md:p-1.5 text-zinc-600 hover:text-white disabled:opacity-20 transition-colors" title="Move Down"><ArrowDown size={16} /></button>
                                </div>

                              </div>
                            </div>
                          </div>
                        </div>

                        {index < activeShots.length - 1 && (
                          <div className="flex justify-center relative z-10 group my-[-12px]">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800 border-dashed group-hover:border-orange-500/30 transition-colors"></div></div>
                            <button onClick={() => insertShotAt(index, 'after')} className="relative bg-zinc-950 border border-zinc-800 group-hover:border-orange-500/50 text-zinc-500 group-hover:text-orange-400 rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest flex items-center gap-1 transition-all">
                              <Plus size={12}/> ADD SHOT
                            </button>
                          </div>
                        )}
                      </React.Fragment>
                      )
                    })}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                      <button onClick={addShot} className="w-full py-8 border-2 border-dashed border-zinc-800 rounded-[2rem] md:rounded-[3rem] text-zinc-600 hover:text-orange-500 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all flex flex-col items-center justify-center gap-3 font-black tracking-widest group">
                        <div className="bg-zinc-900 group-hover:bg-orange-500/20 p-4 rounded-full"><Plus size={24} className="text-zinc-500 group-hover:text-orange-500" /></div> ADD SHOT AT BOTTOM
                      </button>
                      {aiMode === 'cowriter' && (
                        <button onClick={generateSingleAIShot} disabled={!isRealUser || isAIBusy} className="w-full py-8 border-2 border-dashed border-purple-900/50 rounded-[2rem] md:rounded-[3rem] text-purple-600/50 hover:text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all flex flex-col items-center justify-center gap-3 font-black tracking-widest group disabled:opacity-50">
                          <div className="bg-purple-900/20 group-hover:bg-purple-500/20 p-4 rounded-full">
                            {loadingStates.singleAIShot ? <Loader2 size={24} className="animate-spin text-purple-500" /> : (!isRealUser ? <Lock size={24} /> : <Sparkles size={24} className="text-purple-500 group-hover:text-purple-400" />)}
                          </div> 
                          AUTO-FILL NEXT SHOT
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {boardSubTab === 'shoot-plan' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                     {currentDisplayList.length > 0 ? (
                      currentDisplayList.map((shot, index) => {
                        const isNewScene = index === 0 || shot.sceneHeading !== currentDisplayList[index - 1].sceneHeading;
                        const isSameSetup = !isNewScene && index > 0 && 
                            shot.type === currentDisplayList[index - 1].type && 
                            (shot.locationCaveat || '') === (currentDisplayList[index - 1].locationCaveat || '');
                        const isSameSetupAsNext = index < currentDisplayList.length - 1 && 
                            shot.sceneHeading === currentDisplayList[index + 1].sceneHeading && 
                            shot.type === currentDisplayList[index + 1].type && 
                            (shot.locationCaveat || '') === (currentDisplayList[index + 1].locationCaveat || '');
                        
                        const rowColorTheme = SHOT_COLORS.find(c => c.name === shot.colorGroup) || SHOT_COLORS[0];

                        return (
                          <React.Fragment key={shot.id}>
                            {isNewScene && (
                              <div className="flex items-center gap-4 py-4 mt-6">
                                <div className="text-sm font-black uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                                   <Map size={16}/> {shot.sceneHeading}
                                </div>
                                <div className="h-px bg-zinc-800 flex-1"></div>
                              </div>
                            )}
                            <div className={`group bg-zinc-900/40 border-x border-zinc-800 ${shot.fx ? 'border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : ''} ${isSameSetupAsNext ? 'border-b-0 rounded-t-[2rem] rounded-b-none mb-0 pb-6' : 'border-b border-zinc-800 rounded-b-[2rem] mb-4'} ${isSameSetup ? 'border-t-0 rounded-t-none mt-0 pt-6' : 'border-t border-zinc-800 rounded-t-[2rem] mt-4'} ${rowColorTheme.name !== 'none' ? rowColorTheme.bg : ''} hover:bg-zinc-900/60 transition-all relative overflow-hidden shadow-md`}>
                               
                               {isSameSetup && <div className="absolute top-0 left-6 right-6 h-px border-t border-dashed border-zinc-700"></div>}

                               <div className="absolute top-0 right-0 p-4 text-4xl text-zinc-800/30 font-black pointer-events-none select-none z-0">{shot.shootOrderNumber || index + 1}</div>
                               <div className="relative z-10 flex flex-col md:flex-row gap-6">
                                 {shot.image ? (
                                   <img src={shot.image} className="w-full md:w-48 aspect-video object-cover rounded-xl border border-zinc-800 shrink-0"/>
                                 ) : (
                                   <div className="w-full md:w-48 aspect-video bg-zinc-950 rounded-xl border border-zinc-800 shrink-0 flex items-center justify-center">
                                     <ImageIcon size={24} className="text-zinc-800/50" />
                                   </div>
                                 )}
                                 <div className="flex-1 space-y-2">
                                   <div className="flex flex-wrap gap-2 items-center">
                                     {isSameSetup ? (
                                       <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1"><ArrowDownToLine size={10}/> SAME SETUP</span>
                                     ) : (
                                       <span className="text-xs font-black bg-zinc-800 text-zinc-300 px-2 py-1 rounded uppercase tracking-wider">{shot.type}</span>
                                     )}
                                     {!isSameSetup && shot.cameraMove && shot.cameraMove !== 'Locked Off' && <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 border border-blue-500/20 uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1"><Video size={10} className="inline -mt-0.5"/> {shot.cameraMove}</span>}
                                     {!isSameSetup && shot.locationCaveat && <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 uppercase tracking-widest px-2 py-1 rounded">LOC: {shot.locationCaveat}</span>}
                                     
                                     {shot.duration && <span className="text-[10px] font-black text-green-500 bg-green-500/10 border border-green-500/20 uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1"><Clock size={10} className="inline -mt-0.5"/> {shot.duration}<span className="opacity-50 lowercase ml-[1px]">s</span></span>}
                                     
                                     <input 
                                        value={shot.subject || ''} 
                                        onChange={e => updateShot(shot.id, 'subject', e.target.value)} 
                                        className="text-lg font-black uppercase bg-transparent hover:bg-zinc-800 focus:bg-zinc-100 focus:text-zinc-950 rounded px-1 -mx-1 outline-none transition-colors w-full md:w-auto"
                                     />
                                   </div>
                                   {shot.optimizationReason && <div className="text-xs italic text-yellow-500/70 border-l-2 border-yellow-500/50 pl-3 py-1 my-2">{shot.optimizationReason}</div>}
                                   
                                   <div className="flex flex-col">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-1">Action</span>
                                     <textarea 
                                        value={shot.action || ''} 
                                        onChange={e => updateShot(shot.id, 'action', e.target.value)} 
                                        onInput={handleAutoResize}
                                        className="text-sm text-zinc-300 bg-transparent hover:bg-zinc-800 focus:bg-zinc-100 focus:text-zinc-950 rounded px-2 py-1 -mx-2 outline-none transition-colors resize-none overflow-hidden"
                                        rows={1}
                                     />
                                   </div>

                                   <div className="flex flex-col mt-2">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-1">Notes</span>
                                     <textarea 
                                        value={shot.notes || ''} 
                                        onChange={e => updateShot(shot.id, 'notes', e.target.value)} 
                                        onInput={handleAutoResize}
                                        className="text-xs text-zinc-500 bg-transparent hover:bg-zinc-800 focus:bg-zinc-100 focus:text-zinc-950 rounded px-2 py-1 -mx-2 outline-none transition-colors resize-none overflow-hidden"
                                        rows={1}
                                     />
                                   </div>
                                 </div>
                               </div>
                            </div>
                          </React.Fragment>
                        )
                      })
                     ) : (
                       <div className="py-16 text-center border-2 border-dashed border-zinc-800 rounded-[3rem] text-zinc-600 flex flex-col items-center gap-4">
                         <Zap size={48} className="opacity-30 text-yellow-500"/>
                         <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Plan not generated.<br/>Click "1st AD Plan" to optimize your shoot order.</p>
                       </div>
                     )}
                  </div>
                )}
                
                {(boardSubTab === 'print-boards' || boardSubTab === 'print-list') && (
                  <div className="print:block print:bg-white print:text-black min-h-screen bg-white text-black p-6 md:p-12 font-serif rounded-[2rem] shadow-2xl print:shadow-none print:rounded-none print:p-0 print:m-0 print:overflow-visible">
                    <div className="flex items-center gap-2 print:hidden mb-12 border-b-2 border-black pb-6 justify-between">
                      <button onClick={() => setBoardSubTab('grid')} className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-zinc-800 transition-colors text-white rounded-full text-xs font-bold shadow-lg">
                        <ArrowLeft size={14} /> EXIT PRINT PREVIEW
                      </button>
                      <div className="flex gap-4 items-center">
                        {boardSubTab === 'print-boards' && (
                          <div className="flex bg-zinc-200 rounded-full p-1 shadow-inner items-center">
                            <span className="text-[10px] font-black uppercase text-zinc-500 px-3 select-none">Columns:</span>
                            {[1, 2, 3, 4].map(num => (
                              <button key={num} onClick={() => setBoardCols(num)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${boardCols === num ? 'bg-black text-white shadow' : 'text-zinc-600 hover:text-black'}`}>{num}</button>
                            ))}
                          </div>
                        )}
                        {boardSubTab === 'print-list' && (
                          <div className="flex bg-zinc-200 rounded-full p-1 shadow-inner items-center">
                            <span className="text-[10px] font-black uppercase text-zinc-500 px-3 select-none">Sort:</span>
                            <button onClick={() => setPrintListMode('sequence')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${printListMode === 'sequence' ? 'bg-black text-white shadow' : 'text-zinc-600 hover:text-black'}`}>IN SEQUENCE</button>
                            <button onClick={() => { if(shootPlanMeta.length > 0) setPrintListMode('shoot-plan'); else optimizeShootOrder(true); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${printListMode === 'shoot-plan' ? 'bg-black text-white shadow' : 'text-zinc-600 hover:text-black'}`}>
                               {loadingStates.optimizing ? <Loader2 size={12} className="animate-spin inline" /> : '1ST AD PLAN'}
                            </button>
                          </div>
                        )}
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 transition-colors text-white rounded-full text-xs font-bold shadow-lg">
                          <Printer size={14} /> PRINT DOC
                        </button>
                      </div>
                    </div>

                    <div className="max-w-6xl mx-auto space-y-8">
                      <div className="border-b-4 border-black pb-4 flex flex-col md:flex-row justify-between md:items-end gap-2">
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">{getFullTitle()}</h1>
                        <div className="text-left md:text-right text-[10px] font-bold uppercase">{new Date().toLocaleDateString()}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 border-b border-black pb-4 text-sm">
                        <p><strong>CHARACTERS:</strong> {availableCharacters.join(', ') || 'N/A'}</p>
                        <p><strong>EST RUNTIME:</strong> {formatTime(totalDurationSeconds)}</p>
                        <p className="md:col-span-2"><strong>PROPS:</strong> {activePropsList.join(', ') || 'None'}</p>
                        {activeSketch?.premise && <p className="md:col-span-2 text-xs italic"><strong>PREMISE:</strong> {activeSketch.premise}</p>}
                      </div>

                      {boardSubTab === 'print-list' ? (
                        <div className="space-y-4 overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead><tr className="border-b-2 border-black text-[10px] font-black uppercase tracking-widest"><th className="py-2 w-12">#</th><th className="py-2 w-24">Type</th><th className="py-2">Details & Action</th><th className="py-2 w-16">FX</th></tr></thead>
                            <tbody>
                              {currentDisplayList.map((shot, idx) => {
                                const isNewScene = idx === 0 || shot.sceneHeading !== currentDisplayList[idx-1].sceneHeading;
                                const isSameSetup = printListMode === 'shoot-plan' && !isNewScene && idx > 0 && 
                                  shot.type === currentDisplayList[idx - 1].type && 
                                  (shot.locationCaveat || '') === (currentDisplayList[idx - 1].locationCaveat || '');
                                
                                const rowColorTheme = SHOT_COLORS.find(c => c.name === shot.colorGroup) || SHOT_COLORS[0];
                                
                                return (
                                  <React.Fragment key={shot.id}>
                                    {isNewScene && (
                                      <tr>
                                        <td colSpan="4" className="py-4 font-black uppercase border-b border-black text-xs bg-zinc-100 px-2 print:bg-transparent">
                                          <input 
                                             value={shot.sceneHeading || ''} 
                                             onChange={e => updateShot(shot.id, 'sceneHeading', e.target.value)} 
                                             className="bg-transparent w-full outline-none hover:bg-black/5 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-1 transition-all" 
                                          />
                                        </td>
                                      </tr>
                                    )}
                                    <tr className={`border-b border-zinc-200 align-top break-inside-avoid ${rowColorTheme.listRow}`}>
                                      <td className="py-4 font-bold px-2">{printListMode === 'shoot-plan' ? shot.shootOrderNumber || idx + 1 : idx + 1}</td>
                                      <td className="py-4 font-bold text-[10px] uppercase px-2">
                                        {isSameSetup ? (
                                          <span className="text-yellow-600">↳ SAME SETUP</span>
                                        ) : (
                                          <>
                                            {shot.type}
                                            {shot.cameraMove && shot.cameraMove !== 'Locked Off' && <span className="block text-[8px] text-blue-600 mt-1">{shot.cameraMove}</span>}
                                            {shot.locationCaveat && <span className="block text-[8px] text-yellow-600 mt-1">LOC: {shot.locationCaveat}</span>}
                                          </>
                                        )}
                                        {shot.shotCharacters?.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            {shot.shotCharacters.map(c => <span key={c} className="block text-[8px] bg-white px-1 py-0.5 rounded border border-zinc-300 w-fit">{c}</span>)}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-4 space-y-1 pr-4">
                                        <input 
                                           value={shot.subject || ''} 
                                           onChange={e => updateShot(shot.id, 'subject', e.target.value)} 
                                           className="font-bold text-sm w-full bg-transparent hover:bg-black/5 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-1 -mx-1 outline-none transition-all" 
                                        />
                                        <textarea 
                                           value={shot.action || ''} 
                                           onChange={e => updateShot(shot.id, 'action', e.target.value)} 
                                           onInput={handleAutoResize}
                                           className="text-sm w-full bg-transparent hover:bg-black/5 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-1 -mx-1 outline-none transition-all resize-none overflow-hidden" 
                                           rows={1}
                                        />
                                        <textarea 
                                           value={shot.dialogue || ''} 
                                           onChange={e => updateShot(shot.id, 'dialogue', e.target.value)} 
                                           onInput={handleAutoResize}
                                           className="text-xs italic w-full bg-transparent hover:bg-black/5 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-1 -mx-1 outline-none transition-all resize-none overflow-hidden mt-1" 
                                           rows={1}
                                           placeholder="Dialogue..."
                                        />
                                        <textarea 
                                           value={shot.notes || ''} 
                                           onChange={e => updateShot(shot.id, 'notes', e.target.value)} 
                                           onInput={handleAutoResize}
                                           className="text-[10px] text-zinc-500 w-full bg-transparent hover:bg-black/5 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-1 -mx-1 outline-none transition-all resize-none overflow-hidden mt-1" 
                                           rows={1}
                                           placeholder="Notes..."
                                        />
                                      </td>
                                      <td className="py-4 font-black text-xs px-2">
                                        <button onClick={() => updateShot(shot.id, 'fx', !shot.fx)} className={`px-2 py-1 rounded text-[8px] print:border-none ${shot.fx ? 'bg-orange-500 text-white' : 'text-zinc-300 hover:bg-zinc-200'}`}>
                                          {shot.fx ? 'YES' : '—'}
                                        </button>
                                      </td>
                                    </tr>
                                  </React.Fragment>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className={`grid ${gridColsClass} gap-6 md:gap-8 w-full print:gap-4`}>
                          {currentDisplayList.map((shot, idx) => (
                            <div key={shot.id} className="break-inside-avoid flex flex-col border-2 border-black rounded-lg overflow-hidden bg-white shadow-sm">
                              <div className="bg-black text-white text-[9px] font-black uppercase p-1.5 truncate border-b border-black flex justify-between">
                                <span>{shot.sceneHeading}</span>
                                <span>{shot.duration}<span className="text-zinc-400 lowercase ml-[1px]">s</span></span>
                              </div>
                              <div className="aspect-video border-b-2 border-black bg-white flex items-center justify-center relative overflow-hidden" style={{ aspectRatio: (activeSketch?.aspectRatio || '16:9').replace(':', '/') }}>
                                {shot.image ? (
                                  <img src={shot.image} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover" />
                                ) : null}
                                <div className="absolute top-2 left-2 bg-white border-2 border-black px-2 py-0.5 text-xs font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] text-black">
                                  {idx + 1}
                                </div>
                                {shot.fx && (
                                  <div className="absolute top-2 right-2 bg-orange-500 text-white border-2 border-black px-2 py-0.5 text-[10px] font-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                                    FX
                                  </div>
                                )}
                              </div>
                              <div className="p-4 font-sans space-y-3">
                                <div className="font-black uppercase text-sm border-b border-zinc-200 pb-2 text-black">
                                  <span className="text-zinc-500 mr-2">[{shot.type}]</span>{shot.subject}
                                </div>
                                <div className="text-xs space-y-2 text-black">
                                  {shot.locationCaveat && <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 p-1.5 rounded inline-block mb-1">LOC: {shot.locationCaveat}</div>}
                                  {shot.cameraMove && shot.cameraMove !== 'Locked Off' && <div className="text-[9px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 p-1.5 rounded inline-block ml-1 mb-1 border border-blue-200"><Video size={10} className="inline mr-1 -mt-0.5"/>{shot.cameraMove}</div>}
                                  {shot.action && <p className="leading-snug"><span className="font-bold uppercase text-[10px] tracking-widest block text-zinc-500 mb-0.5">Action</span> {shot.action}</p>}
                                  {shot.dialogue && <p className="leading-snug italic"><span className="font-bold uppercase not-italic text-[10px] tracking-widest block text-zinc-500 mb-0.5">Dialogue</span> "{shot.dialogue}"</p>}
                                  {shot.notes && <p className="leading-snug text-zinc-600"><span className="font-bold text-black uppercase text-[10px] tracking-widest block mb-0.5">Notes</span> {shot.notes}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      </main>

      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out print:hidden" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-7xl w-full max-h-screen flex justify-center">
            <img src={zoomedImage} alt="Zoomed Storyboard" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-zinc-800" />
            <button onClick={() => setZoomedImage(null)} className="absolute -top-2 -right-2 md:-top-4 md:-right-4 p-3 bg-zinc-900 border border-zinc-700 rounded-full text-white hover:bg-zinc-800 shadow-xl"><X size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;