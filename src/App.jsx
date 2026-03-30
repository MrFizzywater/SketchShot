import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, Camera, FileText, ChevronRight, Layout, 
  AlertCircle, Wand2, Printer, Sparkles, 
  Loader2, Quote, Zap, ArrowLeft, Image as ImageIcon, 
  X, Download, Upload, Save, Maximize2, Map, 
  ChevronUp, ChevronDown, 
  UserPlus, ArrowUp, ArrowDown, Cloud, GitBranch, LogOut, Lock, Copy, Menu,
  ScrollText, VenetianMask, Clapperboard, Key, EyeOff, User, Settings2, Users, Settings, Video, RefreshCcw, ArrowDownToLine, ArrowUpFromLine, Undo
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, signInWithPopup, signInAnonymously,
  GoogleAuthProvider, GithubAuthProvider, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc 
} from 'firebase/firestore';

// --- ENVIRONMENT INITIALIZATION & SAFE KEY EXTRACTION ---
let firebaseConfig = {};
let globalGeminiKey = "";
let globalTextModel = "gemini-2.5-flash"; 
let globalImageModel = "imagen-3.0-generate-001"; 

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
    globalGeminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (import.meta.env.VITE_GEMINI_TEXT_MODEL) globalTextModel = import.meta.env.VITE_GEMINI_TEXT_MODEL;
    if (import.meta.env.VITE_GEMINI_IMAGE_MODEL) globalImageModel = import.meta.env.VITE_GEMINI_IMAGE_MODEL;
  } catch (e) { /* Ignore in strict environments */ }
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'sketchbeans-app';

// --- PRODUCTION DIAGNOSTICS ---
console.log("🎬 SketchBeans Rig Booting...");
console.log("Firebase Config Loaded:", {
  hasApiKey: !!firebaseConfig?.apiKey,
  hasAuthDomain: !!firebaseConfig?.authDomain,
  projectId: firebaseConfig?.projectId || "MISSING"
});

const SHOT_TYPES = ['Wide', 'Medium', 'Close Up', 'POV', 'Over the Shoulder', 'Insert', 'Drone', 'Tracking'];
const CAMERA_MOVES = ['Locked Off', 'Handheld / Shaky', 'Slow Creep In', 'Slow Creep Out', 'Crash Zoom', 'Whip Pan', 'Dolly Tracking', 'Dutch Angle', 'Crane Up', 'Crane Down'];
const IMAGE_STYLES = ['Pencil Sketch', 'Photographic', 'Cinematic', 'Comic Book', 'Watercolor', '3D Render', 'Vintage Film'];
const ASPECT_RATIOS = [{label: '16:9 (Widescreen)', val: '16:9'}, {label: '1:1 (Square)', val: '1:1'}, {label: '4:3 (Standard)', val: '4:3'}, {label: '9:16 (Vertical)', val: '9:16'}, {label: '3:4 (Portrait)', val: '3:4'}];

const TONES = ['Absurdist', 'Disruptive / Cringe', 'Deadpan', 'Slapstick', 'Satire', 'Surreal', 'Mockumentary', 'Cinematic', 'Dark Comedy', 'Screwball', 'High Concept', 'Mumblecore', 'None', 'Other'];
const COMEDY_ARCHETYPES = ['The Straight Man', 'The Wildcard', 'The Neurotic', 'The Himbo / Bimbo', 'The Agent of Chaos', 'The Deadpan', 'The Instigator', 'The Oblivious One', 'The Cynic', 'The Over-Enthusiast', 'The Voice of Reason', 'The Fall Guy', 'None', 'Other'];

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

const App = () => {
  const [user, setUser] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const isRealUser = user && !user.isAnonymous;

  // --- LOCAL STATE (PRIVATE) ---
  const [sketches, setSketches] = useState([{ 
    id: '1', title: 'Welcome to SketchBeans 🎬', 
    premise: 'A director discovers a digital production rig that does the heavy lifting of pre-production, allowing them to visualize their absurd ideas instantly.',
    settingType: 'INT.', location: 'THE EDIT BAY', timeOfDay: 'NIGHT', tone: 'Cinematic', imageStyle: 'Pencil Sketch', aspectRatio: '16:9',
    characterProfiles: [
      { id: 'c1', name: 'The Director', age: 35, gender: 50, melanin: 50, archetype: 'The Neurotic', desc: 'Staring at a blank screen.', image: null },
      { id: 'c2', name: 'The AI', age: 1, gender: 50, melanin: 50, archetype: 'The Wildcard', desc: 'A chaotic but helpful partner.', image: null },
    ], props: 'Coffee cup, Mechanical keyboard', hook: 'The Director is staring at a blank page.', escalation: 'They open SketchBeans.', ending: 'They get some sleep.', script: ''
  }]);
  const [shots, setShots] = useState([
    { id: 's1', sketchId: '1', number: 1, type: 'Wide', cameraMove: 'Locked Off', subject: 'THE DASHBOARD', action: 'Welcome to SketchBeans! The key details of your sketch live right up there under the title. \n\nClick the "SCENE CONFIG" tab to change your location, comedic tone, and visual style.', notes: 'Keep the premise simple. The AI uses it to build everything else.', dialogue: '', fx: false, image: null, locationCaveat: '', shotCharacters: [] }
  ]);

  // --- PUBLIC STATE (WRITER'S ROOM) ---
  const [publicSketches, setPublicSketches] = useState([]);
  const [publicShots, setPublicShots] = useState([]);

  const [activeSketchId, setActiveSketchId] = useState(localStorage.getItem('sketchbeans_active_sketch') || '1');
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [viewMode, setViewMode] = useState('scene'); 
  const [shootPlan, setShootPlan] = useState([]);
  const [loadingStates, setLoadingStates] = useState({});
  const [isAIBusy, setIsAIBusy] = useState(false); 
  const [zoomedImage, setZoomedImage] = useState(null);
  const [visiblePromptId, setVisiblePromptId] = useState(null);
  const [sketchToDelete, setSketchToDelete] = useState(null);
  const fileInputRef = useRef(null);
  
  const [fullResImages, setFullResImages] = useState({});
  const [userApiKey, setUserApiKey] = useState(localStorage.getItem('sketchbeans_gemini_key') || '');
  const [aiEnabled, setAiEnabled] = useState(localStorage.getItem('sketchbeans_ai_enabled') === 'true');
  const [history, setHistory] = useState({});

  const [isSyncing, setIsSyncing] = useState(false);
  const isInitialLoad = useRef({ sketches: true, shots: true, pubSketches: true, pubShots: true });
  const [boardCols, setBoardCols] = useState(2);
  const apiKey = globalGeminiKey; 

  // --- DERIVED CONTEXT LOGIC ---
  const isWritersRoom = activeSketchId.startsWith('pub_');
  const activeDataSourceSketches = isWritersRoom ? publicSketches : sketches;
  const activeDataSourceShots = isWritersRoom ? publicShots : shots;
  
  const activeSketch = activeDataSourceSketches.find(s => s.id === activeSketchId) || activeDataSourceSketches[0] || sketches[0];
  const activeShots = activeDataSourceShots.filter(s => s.sketchId === activeSketchId).sort((a, b) => a.number - b.number);
  const currentDisplayList = viewMode === 'shoot-plan' && shootPlan.length > 0 ? shootPlan : activeShots;
  
  const isOriginalAuthor = isWritersRoom && activeSketch?.originalAuthorId === user?.uid;
  const formattedSceneHeading = `${activeSketch?.settingType || 'INT.'} ${activeSketch?.location || 'LOCATION'} - ${activeSketch?.timeOfDay || 'DAY'}`;
  const activeProfiles = activeSketch?.characterProfiles || [];
  const availableCharacters = activeProfiles.map(c => c.name);
  const richCharactersContext = activeProfiles.map(c => {
    let details = [];
    if (c.age) details.push(`${c.age}yo`);
    if (c.archetype) details.push(c.archetype);
    if (c.gender !== undefined) details.push(getGenderText(c.gender));
    if (c.melanin !== undefined) details.push(getSkinText(c.melanin));
    return `${c.name}${details.length > 0 ? ` [${details.join(', ')}]` : ''}${c.desc ? ` - ${c.desc}` : ''}`;
  }).join(' | ');

  useEffect(() => {
    if (activeSketchId) localStorage.setItem('sketchbeans_active_sketch', activeSketchId);
  }, [activeSketchId]);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token).catch(console.error);
      } else {
        await signInAnonymously(auth).catch(() => {});
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setAuthResolved(true); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isRealUser) return;
    const trackPresence = async () => {
      try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
        await setDoc(userRef, { email: user.email, displayName: user.displayName || 'Unknown Crew', lastSeen: new Date().toISOString(), uid: user.uid }, { merge: true });
      } catch (err) {}
    };
    trackPresence();
  }, [isRealUser, user]);

  useEffect(() => {
    if (!user || !isRealUser) return;
    
    const unsubSketches = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'sketches'), (snap) => {
      if (isInitialLoad.current.sketches) {
        if (!snap.empty) setSketches(snap.docs.map(d => ({id: d.id, ...d.data()})));
        isInitialLoad.current.sketches = false;
      }
    });
    const unsubShots = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'shots'), (snap) => {
      if (isInitialLoad.current.shots) {
        if (!snap.empty) setShots(snap.docs.map(d => ({id: d.id, ...d.data()})));
        isInitialLoad.current.shots = false;
      }
    });

    const unsubPubSketches = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'shared_sketches'), (snap) => {
      setPublicSketches(snap.docs.map(d => ({id: d.id, ...d.data()})));
      isInitialLoad.current.pubSketches = false;
    }, (err) => console.warn("Writer's Room access denied. Check Firebase Rules:", err.message));

    const unsubPubShots = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'shared_shots'), (snap) => {
      setPublicShots(snap.docs.map(d => ({id: d.id, ...d.data()})));
      isInitialLoad.current.pubShots = false;
    }, (err) => console.warn("Writer's Room shots access denied. Check Firebase Rules:", err.message));

    return () => { unsubSketches(); unsubShots(); unsubPubSketches(); unsubPubShots(); };
  }, [isRealUser, user]);

  const loginWithProvider = async (providerName) => {
    const provider = providerName === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
    try { 
      await signInWithPopup(auth, provider); 
    } catch (err) { 
      console.error("Login failed:", err);
      alert(`Login Error: ${err.message}\n\nMake sure ${providerName} is enabled in your Firebase Auth settings, and double-check your VITE_FIREBASE_AUTH_DOMAIN in Coolify.`);
    }
  };

  const toggleAiState = () => {
    const newState = !aiEnabled;
    setAiEnabled(newState);
    localStorage.setItem('sketchbeans_ai_enabled', newState.toString());
  };

  // --- STATE MUTATION HELPERS ---
  const updateContextState = (stateUpdater, isSketch) => {
    if (isWritersRoom) {
      if (isSketch) setPublicSketches(stateUpdater); else setPublicShots(stateUpdater);
    } else {
      if (isSketch) setSketches(stateUpdater); else setShots(stateUpdater);
    }
  };

  const updateSketch = (id, field, value) => {
    const editorTag = isWritersRoom ? { lastEditedBy: user?.email || 'Guest' } : {};
    updateContextState(prev => prev.map(s => s.id === id ? { ...s, [field]: value, ...editorTag } : s), true);
  };
  
  const updateShot = (id, field, value) => {
    const editorTag = isWritersRoom ? { lastEditedBy: user?.email || 'Guest' } : {};
    updateContextState(prev => prev.map(s => s.id === id ? { ...s, [field]: value, ...editorTag } : s), false);
  };

  const toggleShotCharacter = (shotId, charName) => {
    updateContextState(prev => prev.map(s => {
      if (s.id !== shotId) return s;
      const currentChars = s.shotCharacters || [];
      return currentChars.includes(charName) ? { ...s, shotCharacters: currentChars.filter(c => c !== charName) } : { ...s, shotCharacters: [...currentChars, charName] };
    }), false);
  };

  const addCharacter = () => updateSketch(activeSketchId, 'characterProfiles', [...activeProfiles, { id: Date.now().toString(), name: 'New Character', age: 30, gender: 50, melanin: 50, archetype: 'The Wildcard', desc: '', image: null }]);
  const updateChar = (charId, field, value) => updateSketch(activeSketchId, 'characterProfiles', activeProfiles.map(p => p.id === charId ? { ...p, [field]: value } : p));
  const removeChar = (charId) => updateSketch(activeSketchId, 'characterProfiles', activeProfiles.filter(p => p.id !== charId));

  const addShot = () => {
    const nextNumber = activeShots.length > 0 ? Math.max(...activeShots.map(s => s.number)) + 1 : 1;
    updateContextState(prev => [...prev, { id: (isWritersRoom ? 'pub_' : '') + Date.now().toString(), sketchId: activeSketchId, number: nextNumber, type: 'Medium', cameraMove: 'Locked Off', subject: '', action: '', notes: '', dialogue: '', fx: false, image: null, locationCaveat: '', shotCharacters: [] }], false);
  };
  
  const insertShotAt = (index, position) => {
    const currentActiveShots = [...activeShots];
    const insertIndex = position === 'before' ? index : index + 1;
    const newShot = { 
      id: (isWritersRoom ? 'pub_' : '') + Date.now().toString(), sketchId: activeSketchId, type: 'Medium', cameraMove: 'Locked Off',
      subject: '', action: '', notes: '', dialogue: '', fx: false, image: null, locationCaveat: '', shotCharacters: [] 
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
    if (user && isRealUser) {
      try { 
        const path = isWritersRoom ? ['public', 'data', 'shared_shots'] : ['users', user.uid, 'shots'];
        await deleteDoc(doc(db, 'artifacts', appId, ...path, shotId)); 
      } catch (e) {}
    }
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
    updateContextState(prev => prev.map(s => {
      if (s.id === currentShot.id) return { ...s, number: currentShot.number };
      if (s.id === targetShot.id) return { ...s, number: targetShot.number };
      return s;
    }), false);
  };

  const confirmDeleteSketch = async () => {
    if (!sketchToDelete) return;
    const id = sketchToDelete.id;
    const isDeletingShared = id.startsWith('pub_');
    
    if (isDeletingShared) {
      setPublicSketches(prev => prev.filter(s => s.id !== id));
      setPublicShots(prev => prev.filter(s => s.sketchId !== id));
      if (activeSketchId === id) setActiveSketchId(sketches[0]?.id || '1');
      if (user && isRealUser) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_sketches', id));
    } else {
      const updatedSketches = sketches.filter(s => s.id !== id);
      if (updatedSketches.length === 0) {
        const newId = Date.now().toString();
        updatedSketches.push({ id: newId, title: 'New Sketch', settingType: 'INT.', location: 'LOCATION', timeOfDay: 'DAY', tone: 'Absurdist', imageStyle: 'Pencil Sketch', aspectRatio: '16:9', premise: '', characterProfiles: [], props: '', hook: '', escalation: '', ending: '', script: '' });
        setActiveSketchId(newId);
      } else if (activeSketchId === id) setActiveSketchId(updatedSketches[0].id);
      
      setSketches(updatedSketches);
      setShots(prev => prev.filter(s => s.sketchId !== id));
      if (user && isRealUser) try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sketches', id)); } catch (err) {}
    }
    setSketchToDelete(null);
  };

  // --- SYNC & COLLAB LOGIC ---
  const pushToCloud = async () => {
    if (!user || !isRealUser) return;
    setIsSyncing(true);
    try {
      if (isWritersRoom) {
        const s = publicSketches.find(s => s.id === activeSketchId);
        if (s) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_sketches', s.id), { ...s, lastEditedBy: user.email || user.displayName }, { merge: true });
        for (const shot of publicShots.filter(sh => sh.sketchId === activeSketchId)) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_shots', shot.id), { ...shot, lastEditedBy: user.email || user.displayName }, { merge: true });
        }
      } else {
        for (const s of sketches) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sketches', s.id), s, { merge: true });
        for (const s of shots) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'shots', s.id), s, { merge: true });
      }
    } catch (err) { alert(`Sync Failed: ${err.message}`); }
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const openWritersRoom = async () => {
    if (isWritersRoom || !activeSketch) return;
    const pubId = `pub_${activeSketch.id}`;
    const pubSketch = { ...activeSketch, id: pubId, originalAuthorId: user.uid, originalAuthorName: user.displayName || user.email };
    setPublicSketches(prev => [...prev, pubSketch]);
    
    const localShots = shots.filter(s => s.sketchId === activeSketch.id);
    const pubShots = localShots.map(s => ({ ...s, id: `pub_${s.id}`, sketchId: pubId }));
    setPublicShots(prev => [...prev, ...pubShots]);
    
    setActiveSketchId(pubId);
    if (isRealUser) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_sketches', pubId), pubSketch);
      for (const shot of pubShots) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_shots', shot.id), shot);
    }
  };

  const pullToMaster = async () => {
    if (!isOriginalAuthor) return;
    const privateId = activeSketch.id.replace('pub_', '');
    const updatedSketch = { ...activeSketch, id: privateId };
    setSketches(prev => prev.map(s => s.id === privateId ? updatedSketch : s));
    
    const sharedShotsForSketch = publicShots.filter(s => s.sketchId === activeSketch.id);
    const privateShots = sharedShotsForSketch.map(s => ({ ...s, id: s.id.replace('pub_', ''), sketchId: privateId }));
    
    setShots(prev => {
      const otherShots = prev.filter(s => s.sketchId !== privateId);
      return [...otherShots, ...privateShots];
    });

    if (isRealUser) {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sketches', privateId), updatedSketch);
      for (const shot of privateShots) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'shots', shot.id), shot);
      alert("Successfully pulled edits from the Writer's Room to your Private Master.");
    }
  };

  const revertWritersRoom = async () => {
    if (!isOriginalAuthor) return;
    if (!window.confirm("WARNING: This will nuke the public Writer's Room branch and overwrite it with your private Master copy. Continue?")) return;
    const privateId = activeSketch.id.replace('pub_', '');
    const privateSketch = sketches.find(s => s.id === privateId);
    const privateShotsLocal = shots.filter(s => s.sketchId === privateId);
    if (!privateSketch) return;

    const restoredPubSketch = { ...privateSketch, id: activeSketch.id, originalAuthorId: user.uid, originalAuthorName: user.displayName || user.email };
    const restoredPubShots = privateShotsLocal.map(s => ({ ...s, id: `pub_${s.id}`, sketchId: activeSketch.id }));

    setPublicSketches(prev => prev.map(s => s.id === activeSketch.id ? restoredPubSketch : s));
    setPublicShots(prev => {
      const others = prev.filter(s => s.sketchId !== activeSketch.id);
      return [...others, ...restoredPubShots];
    });

    if (isRealUser) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_sketches', activeSketch.id), restoredPubSketch);
      for (const shot of restoredPubShots) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_shots', shot.id), shot);
    }
  };

  // --- IMAGE UPLOAD LOGIC ---
  const handleImageUpload = (shotId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawImageUrl = e.target.result;
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
      img.src = e.target.result;
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

  // --- EXPORT & DOWNLOAD LOGIC ---
  const exportSnapshot = () => {
    const data = { version: "4.3", timestamp: new Date().toISOString(), sketches, shots, publicSketches, publicShots };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `SketchBeans_Backup_${new Date().getTime()}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleImportClick = () => { if(fileInputRef.current) fileInputRef.current.click(); };
  const importSnapshot = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result);
        if (content.sketches && content.shots) {
          setSketches(content.sketches); setShots(content.shots);
          if (content.publicSketches) setPublicSketches(content.publicSketches);
          if (content.publicShots) setPublicShots(content.publicShots);
          if (content.sketches.length > 0) setActiveSketchId(content.sketches[0].id);
        }
      } catch (err) {}
    };
    reader.readAsText(file);
  };

  const downloadShootPlan = () => {
    if (!shootPlan || shootPlan.length === 0) return;
    const safeTitle = activeSketch?.title?.toUpperCase() || 'UNTITLED';
    let planText = `SHOOT PLAN: ${safeTitle}\n=========================================\n\nSCENE: ${formattedSceneHeading}\nCHARACTERS: ${availableCharacters.join(', ') || 'N/A'}\nPROPS: ${activeSketch?.props || 'N/A'}\n\n=========================================\n\n`;
    shootPlan.forEach((shot, index) => {
      planText += `${index + 1}. [${shot.type.toUpperCase()}] ${shot.subject.toUpperCase()}\n`;
      if (shot.locationCaveat) planText += `   Location: ${shot.locationCaveat}\n`;
      if (shot.cameraMove) planText += `   Camera Move: ${shot.cameraMove}\n`;
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
      const link = document.createElement('a'); 
      link.href = imageUrl; 
      link.download = `SketchBeans_Storyboard_Shot_${shotNumber}.png`; 
      link.click();
    }
  };

  // --- AI ENGINE (API LOGIC) ---
  const callGemini = async (prompt, systemPrompt = "", isJson = false) => {
    const activeKey = (userApiKey || apiKey).trim();
    if (!activeKey) {
      alert("API Key missing! Please enter your own Gemini API key in the sidebar Settings panel.");
      throw new Error("API Key is missing.");
    }
    
    setIsAIBusy(true); 
    const maxRetries = 6; let delay = 3000; 
    try {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
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

  // --- GET SHOT PROMPT MUST BE DEFINED BEFORE IMAGE AI CALLS ---
  const getShotPrompt = (shot) => {
    const charContext = shot.shotCharacters?.length > 0 
      ? shot.shotCharacters.map(n => {
          const profile = activeProfiles.find(p => p.name === n);
          if (!profile) return n;
          return `${n} (${profile.age}yo, ${getGenderText(profile.gender || 50)}, ${getSkinText(profile.melanin || 50)}. ${profile.desc || ''})`;
        }).join(', ') 
      : richCharactersContext;

    const location = shot.locationCaveat || formattedSceneHeading;
    const style = activeSketch?.imageStyle || 'Pencil Sketch';
    
    let stylePrefix = "Rough storyboard sketch, mixed media graphite and colored pencil.";
    if (style === 'Photographic') stylePrefix = "High-resolution photograph, photorealistic, 85mm lens.";
    else if (style === 'Cinematic') stylePrefix = "Cinematic movie still, anamorphic lens, dramatic lighting, highly detailed.";
    else if (style === 'Comic Book') stylePrefix = "Comic book panel, ink outlines, vivid colors, graphic novel style.";
    else if (style === 'Watercolor') stylePrefix = "Expressive watercolor painting, loose artistic brush strokes.";
    else if (style === '3D Render') stylePrefix = "High-quality 3D render, stylized but detailed, cinematic lighting.";
    else if (style === 'Vintage Film') stylePrefix = "Vintage 35mm film still, grainy, retro color grading, nostalgic aesthetic.";

    let prompt = `Sketch Context: ${activeSketch?.premise || activeSketch?.title}. Focus on creating a storyboard panel for THIS SPECIFIC SHOT: A ${shot.type} shot of ${shot.subject}. Location: ${location}. `;
    if (shot.cameraMove !== 'Locked Off') prompt += `Framed for a ${shot.cameraMove} camera movement. `;
    if (shot.action) prompt += `Action: ${shot.action} `;
    if (charContext) prompt += `Featuring: ${charContext}. `;
    if (shot.notes) prompt += `Visual Notes: ${shot.notes}. `;
    prompt += `${stylePrefix} PURE ARTWORK ONLY. NO TEXT, NO WORDS, NO TITLES, NO WATERMARKS in the image.`;
    return prompt;
  };

  const generateImage = async (shotId) => {
    const activeKey = userApiKey.trim();
    if (!activeKey) return alert("You need to enter your own personal Gemini API Key in the sidebar Settings to generate images.");
    
    setLoadingStates(prev => ({ ...prev, [`image-${shotId}`]: true }));
    const shot = activeShots.find(s => s.id === shotId);
    const promptText = getShotPrompt(shot);

    const maxRetries = 6; let delay = 3000;
    try {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${globalImageModel}:predict?key=${activeKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              instances: { prompt: promptText }, 
              parameters: { sampleCount: 1, aspectRatio: activeSketch?.aspectRatio || '16:9' } 
            })
          });

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
    if (!activeKey) return alert("You need your own personal Gemini API Key in the sidebar Settings.");
    
    setLoadingStates(prev => ({ ...prev, [`charImg-${charId}`]: true }));
    const char = activeProfiles.find(c => c.id === charId);
    const promptText = `A close-up cinematic headshot photograph of a ${char.age} year old ${getGenderText(char.gender)} with ${getSkinText(char.melanin)}. Vibe/Archetype: ${char.archetype}. Details: ${char.desc}. Plain neutral background. Highly detailed, photorealistic.`;

    const maxRetries = 6; let delay = 3000;
    try {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${globalImageModel}:predict?key=${activeKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instances: { prompt: promptText }, parameters: { sampleCount: 1, aspectRatio: '1:1' } })
          });

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

  const extractCharacters = async () => {
    setLoadingStates(prev => ({ ...prev, extractChars: true }));
    try {
      const systemPrompt = `Analyze the scene premise, hook, escalation, and ending. Identify distinct characters mentioned. Return a JSON array of objects with keys: "name" (string), "age" (number 1-100), "gender" (number 0-100, 0=femme, 100=masc), "melanin" (number 0-100, 0=light, 100=dark), "archetype" (choose best match from: ${COMEDY_ARCHETYPES.join(', ')}), "desc" (1 short punchy sentence). Do not invent characters not implied by the text.`;
      const prompt = `Premise: ${activeSketch.premise}\nHook: ${activeSketch.hook}\nEscalation: ${activeSketch.escalation}\nEnding: ${activeSketch.ending}`;
      const extracted = await callGemini(prompt, systemPrompt, true);
      
      if (extracted && Array.isArray(extracted) && extracted.length > 0) {
         const newProfiles = extracted.map(c => ({
           id: Date.now().toString() + Math.random().toString(36).substring(7),
           name: c.name || 'Unknown', age: c.age || 30, gender: c.gender || 50, melanin: c.melanin || 50,
           archetype: COMEDY_ARCHETYPES.includes(c.archetype) ? c.archetype : 'The Wildcard', desc: c.desc || '', image: null
         }));
         updateSketch(activeSketchId, 'characterProfiles', [...activeProfiles, ...newProfiles]);
      } else alert("No clear characters found to extract.");
    } catch(e) { console.error(e); } finally { setLoadingStates(prev => ({ ...prev, extractChars: false })); }
  };

  const generateAISHots = async () => {
    setLoadingStates(prev => ({ ...prev, genShots: true }));
    try {
      const typeList = SHOT_TYPES.join(', ');
      const systemPrompt = `Expert comedy director. Generate JSON array of exactly 8 shots. Use these EXACT keys: "type" (MUST BE EXACTLY ONE OF: ${typeList}), "subject", "action", "notes", "dialogue", "shotCharacters" (array of strings). CRITICAL: Keep all text responses extremely brief, punchy, and direct. No flowery language. 1-2 short sentences max.`;
      const prompt = `PREMISE: ${activeSketch?.premise}\nTONE: ${activeSketch?.tone}\nSCENE: ${formattedSceneHeading}\nCHARACTERS AVAILABLE: ${richCharactersContext}\nHOOK: ${activeSketch?.hook}\nESCALATION: ${activeSketch?.escalation}\nENDING: ${activeSketch?.ending}`;
      const newShotsData = await callGemini(prompt, systemPrompt, true);
      if (newShotsData) {
        updateContextState(prev => [...prev, ...newShotsData.map((s, idx) => ({ 
          ...s, id: (isWritersRoom ? 'pub_' : '') + `ai-${Date.now()}-${idx}`, sketchId: activeSketchId, number: activeShots.length + idx + 1, 
          fx: false, image: null, locationCaveat: '', cameraMove: 'Locked Off', shotCharacters: Array.isArray(s.shotCharacters) ? s.shotCharacters : [] 
        }))], false);
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, genShots: false })); }
  };

  const generateSingleAIShot = async () => {
    setLoadingStates(prev => ({ ...prev, singleAIShot: true }));
    try {
      const typeList = SHOT_TYPES.join(', ');
      const systemPrompt = `Expert comedy director. Generate exactly ONE new shot to continue the sequence. Return a SINGLE JSON OBJECT with these EXACT keys: "type" (MUST BE EXACTLY ONE OF: ${typeList}), "subject", "action", "notes", "dialogue", "shotCharacters" (array of strings). CRITICAL: Keep all text extremely brief, punchy, and direct. 1-2 short sentences max. Zero fluff.`;
      const recentShots = activeShots.slice(-3).map(s => `Shot ${s.number}: [${s.type}] ${s.subject} - ${s.action}`).join('\n');
      const prompt = `PREMISE: ${activeSketch?.premise}\nTONE: ${activeSketch?.tone}\nSCENE: ${formattedSceneHeading}\nCHARACTERS: ${richCharactersContext}\nHOOK: ${activeSketch?.hook}\nRECENT SHOTS:\n${recentShots}\n\nCreate the NEXT logical shot to build the comedy.`;
      const newShotData = await callGemini(prompt, systemPrompt, true);
      if (newShotData) {
        const nextNumber = activeShots.length > 0 ? Math.max(...activeShots.map(s => s.number)) + 1 : 1;
        updateContextState(prev => [...prev, {
          ...newShotData, id: (isWritersRoom ? 'pub_' : '') + `ai-single-${Date.now()}`, sketchId: activeSketchId, number: nextNumber,
          fx: false, image: null, locationCaveat: '', cameraMove: 'Locked Off', shotCharacters: Array.isArray(newShotData.shotCharacters) ? newShotData.shotCharacters : []
        }], false);
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, singleAIShot: false })); }
  };

  const optimizeShootOrder = async () => {
    setLoadingStates(prev => ({ ...prev, optimizing: true }));
    try {
      const systemPrompt = `Expert 1st AD. Reorder shots into most efficient SHOOT ORDER. Group by Location Caveats, Shot Types, and active Characters. Return JSON array of objects with 'id' and 'reason'.`;
      const prompt = `Scene: ${activeSketch?.title} (${formattedSceneHeading})\nShots: ${activeShots.map(s => `ID: ${s.id}, Type: ${s.type}, Subject: ${s.subject}, Location: ${s.locationCaveat || 'Base'}, Chars: ${(s.shotCharacters||[]).join(',')}`).join('\n')}`;
      const optimizedIds = await callGemini(prompt, systemPrompt, true);
      if (optimizedIds) {
        setShootPlan(optimizedIds.map((item, idx) => ({ ...activeShots.find(s => s.id === item.id), shootOrderNumber: idx + 1, optimizationReason: item.reason })));
        setViewMode('shoot-plan');
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, optimizing: false })); }
  };

  const generateScript = async () => {
    setLoadingStates(prev => ({ ...prev, script: true }));
    try {
      const systemPrompt = `You are an expert comedy writer specializing in ${activeSketch?.tone} humor. Turn this shot list and outline into a formatted script. Write in PLAIN TEXT standard screenplay format. CRITICAL: DO NOT use any HTML tags like <center> or <b>. Use ALL CAPS for scene headings and character names. Use standard line breaks and spacing to format action lines and dialogue.`;
      const prompt = `Title: ${activeSketch?.title}\nPremise: ${activeSketch?.premise}\nTone: ${activeSketch?.tone}\nScene Heading: ${formattedSceneHeading}\nCharacter Profiles: ${richCharactersContext}\nProps: ${activeSketch?.props}\nHook: ${activeSketch?.hook}\nEscalation: ${activeSketch?.escalation}\nEnding: ${activeSketch?.ending}\n\nShot List:\n${activeShots.map(s => `Shot ${s.number} (${s.type} - ${s.cameraMove}): ${s.subject}\nAction: ${s.action}\nNotes: ${s.notes}\nDialogue: ${s.dialogue}`).join('\n\n')}`;
      const scriptContent = await callGemini(prompt, systemPrompt, false);
      if (scriptContent) {
        updateSketch(activeSketchId, 'script', scriptContent);
        setViewMode('script');
      }
    } catch (err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, script: false })); }
  };

  const generateTextAssist = async (shotId, field, rolePrompt, contextPrompt) => {
    setLoadingStates(prev => ({ ...prev, [`${field}-${shotId}`]: true }));
    const shot = activeShots.find(s => s.id === shotId);
    try {
      const charContext = shot.shotCharacters?.length > 0 ? shot.shotCharacters.map(n => activeProfiles.find(p => p.name === n)?.desc || n).join(', ') : richCharactersContext;
      const existing = shot[field] ? `CURRENT TEXT (DO NOT ERASE, ESCALATE THIS): "${shot[field]}"` : `CURRENT TEXT: [Empty]`;
      const prompt = `Scene: ${formattedSceneHeading}\nPremise: ${activeSketch?.premise}\n${contextPrompt}\nCharacters in shot: ${charContext}\nCamera Move: ${shot.cameraMove}\n${existing}`;
      const newText = await callGemini(prompt, `${rolePrompt} Apply the 'Yes, And...' rule. If text exists, keep facts and punch it up. CRITICAL: Be extremely concise, direct, and blunt. No flowery prose. 1-2 short sentences max.`, false);
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
      const systemPrompt = `Brilliant comedy writer (${activeSketch?.tone || 'comedic'} humor). Provide a punchy, creative ${beatType} for the sketch. CRITICAL: Be extremely brief and direct. 1-2 short sentences maximum. Zero fluff.`;
      const prompt = `Title: ${activeSketch?.title}\nScene Heading: ${formattedSceneHeading}\nCharacter Profiles: ${richCharactersContext}\nCurrent Premise: ${activeSketch?.premise}\nCurrent Hook: ${activeSketch?.hook}\nCurrent Escalation: ${activeSketch?.escalation}\nCurrent Ending: ${activeSketch?.ending}\nTask: Write/Improve the ${beatType.toUpperCase()}.`;
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

  const generateCharDesc = async (charId) => {
    setLoadingStates(prev => ({ ...prev, [`char-${charId}`]: true }));
    const char = activeProfiles.find(c => c.id === charId);
    try {
      const existing = char.desc ? `CURRENT DETAILS (YES, AND... THESE): "${char.desc}"\n` : '';
      const prompt = `Scene: ${formattedSceneHeading}\nPremise: ${activeSketch?.premise}\nSketch Hook: ${activeSketch?.hook}\nCharacter Name: ${char.name}\nCharacter Tropes: ${char.archetype}, ${char.age} years old, ${getGenderText(char.gender)}, ${getSkinText(char.melanin)}\n${existing}Task: Write 1 absurd, highly specific character description or fatal flaw. CRITICAL: Extremely brief, direct, and punchy. No flowery prose. Maximum 15 words.`;
      const newDesc = await callGemini(prompt, `Expert comedy writer (${activeSketch?.tone || 'comedic'} humor).`, false);
      if (newDesc) {
        setHistory(prev => ({ ...prev, [`char-${charId}-desc`]: char.desc || '' }));
        updateChar(charId, 'desc', newDesc.trim());
      }
    } catch(err) { console.error(err); } finally { setLoadingStates(prev => ({ ...prev, [`char-${charId}`]: false })); }
  };

  const revertCharDesc = (charId) => {
    const key = `char-${charId}-desc`;
    if (history[key] !== undefined) {
      updateChar(charId, 'desc', history[key]);
      setHistory(prev => { const h = {...prev}; delete h[key]; return h; });
    }
  };

  // --- RENDER LOGIC ---
  const gridColsClass = {
    1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4',
  }[boardCols] || 'grid-cols-2';

  if (viewMode === 'print' || viewMode === 'print-boards') {
    return (
      <div className="min-h-screen bg-white text-black p-6 md:p-12 font-serif overflow-y-auto">
        <div className="fixed top-4 left-4 md:top-6 md:left-6 flex items-center gap-2 print:hidden z-50">
          <button onClick={() => setViewMode('storyboard')} className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-zinc-800 transition-colors text-white rounded-full text-xs font-bold shadow-lg">
            <ArrowLeft size={14} /> BACK
          </button>
          
          {viewMode === 'print-boards' && (
            <div className="flex bg-zinc-200 rounded-full p-1 shadow-lg items-center ml-2">
              <span className="text-[10px] font-black uppercase text-zinc-500 px-3 select-none">Columns:</span>
              {[1, 2, 3, 4].map(num => (
                <button key={num} onClick={() => setBoardCols(num)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${boardCols === num ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'}`}>
                  {num}
                </button>
              ))}
            </div>
          )}
          
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 transition-colors text-white rounded-full text-xs font-bold shadow-lg ml-2">
            <Printer size={14} /> PRINT PDF
          </button>
        </div>

        <div className="max-w-6xl mx-auto space-y-8 mt-16 md:mt-0">
          <div className="border-b-4 border-black pb-4 flex flex-col md:flex-row justify-between md:items-end gap-2">
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">{activeSketch?.title}</h1>
            <div className="text-left md:text-right text-[10px] font-bold uppercase">{new Date().toLocaleDateString()}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 border-b border-black pb-4 text-sm">
            <p><strong>SCENE:</strong> {formattedSceneHeading}</p>
            <p><strong>CHARACTERS:</strong> {availableCharacters.join(', ') || 'N/A'}</p>
            <p className="md:col-span-2"><strong>PROPS:</strong> {activeSketch?.props || 'None'}</p>
            {activeSketch?.premise && <p className="md:col-span-2 text-xs italic"><strong>PREMISE:</strong> {activeSketch.premise}</p>}
          </div>

          {viewMode === 'print' ? (
            <div className="space-y-4 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead><tr className="border-b-2 border-black text-[10px] font-black uppercase tracking-widest"><th className="py-2 w-12">#</th><th className="py-2 w-24">Type</th><th className="py-2">Details & Action</th><th className="py-2 w-16">FX</th></tr></thead>
                <tbody>
                  {currentDisplayList.map((shot, idx) => (
                    <tr key={shot.id} className="border-b border-zinc-200 align-top break-inside-avoid">
                      <td className="py-4 font-bold">{idx + 1}</td>
                      <td className="py-4 font-bold text-[10px] uppercase">
                        {shot.type}
                        {shot.cameraMove && shot.cameraMove !== 'Locked Off' && <span className="block text-[8px] text-blue-600 mt-1">{shot.cameraMove}</span>}
                        {shot.shotCharacters?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {shot.shotCharacters.map(c => <span key={c} className="block text-[8px] bg-zinc-100 px-1 py-0.5 rounded border border-zinc-300 w-fit">{c}</span>)}
                          </div>
                        )}
                      </td>
                      <td className="py-4 space-y-1 pr-4">
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
          ) : (
            <div className={`grid ${gridColsClass} gap-6 md:gap-8 w-full print:gap-4`}>
              {currentDisplayList.map((shot, idx) => (
                <div key={shot.id} className="break-inside-avoid flex flex-col border-2 border-black rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="aspect-video border-b-2 border-black bg-zinc-100 flex items-center justify-center relative overflow-hidden" style={{ aspectRatio: (activeSketch?.aspectRatio || '16:9').replace(':', '/') }}>
                    {shot.image ? (
                      <img src={shot.image} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-zinc-300 font-sans font-black tracking-widest uppercase text-xl">NO IMAGE</div>
                    )}
                    <div className="absolute top-2 left-2 bg-white border-2 border-black px-2 py-0.5 text-xs font-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      {idx + 1}
                    </div>
                    {shot.fx && (
                      <div className="absolute top-2 right-2 bg-orange-500 text-white border-2 border-black px-2 py-0.5 text-[10px] font-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                        FX
                      </div>
                    )}
                  </div>
                  <div className="p-4 font-sans space-y-3">
                    <div className="font-black uppercase text-sm border-b border-zinc-200 pb-2">
                      <span className="text-zinc-500 mr-2">[{shot.type}]</span>{shot.subject}
                    </div>
                    <div className="text-xs space-y-2">
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
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30 overflow-hidden relative">
      
      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {sketchToDelete && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Delete Sketch?</h3>
              <p className="text-zinc-400 text-sm mt-2">This will permanently destroy "{sketchToDelete.title}" and all its associated shots. You cannot fix this in post.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSketchToDelete(null)} className="flex-1 py-3 rounded-xl font-bold text-xs tracking-widest text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors">CANCEL</button>
              <button onClick={confirmDeleteSketch} className="flex-1 py-3 rounded-xl font-bold text-xs tracking-widest text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20 transition-colors">DELETE</button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`absolute md:relative z-40 h-full ${isSidebarOpen ? 'w-72 md:w-72 translate-x-0' : 'w-72 -translate-x-full md:w-0 md:translate-x-0'} transition-all duration-300 overflow-hidden bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0`}>
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tighter flex items-center gap-2">
            <Camera className="text-orange-500" size={20} /> SKETCHBEANS
          </h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-3 mb-2">My Private Sketches</div>
          {sketches.map(sketch => (
            <div key={sketch.id} className={`w-full group text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${activeSketchId === sketch.id && !isWritersRoom ? 'bg-zinc-800 text-orange-400' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
              <button onClick={() => { setActiveSketchId(sketch.id); if(window.innerWidth < 768) setSidebarOpen(false); }} className="flex items-center gap-3 flex-1 min-w-0">
                <FileText size={16} className="shrink-0" /> <span className="truncate font-medium text-sm">{sketch.title || 'Untitled'}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setSketchToDelete(sketch); }} className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1.5 transition-opacity" title="Delete Sketch">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button onClick={() => { const id = Date.now().toString(); setSketches([...sketches, { id, title: 'New Sketch', settingType: 'INT.', location: 'LOCATION', timeOfDay: 'DAY', tone: 'Absurdist', imageStyle: 'Pencil Sketch', aspectRatio: '16:9', premise: '', characters: '', characterProfiles: [], props: '', hook: '', escalation: '', ending: '', script: '' }]); setActiveSketchId(id); if(window.innerWidth < 768) setSidebarOpen(false); }} className="w-full mt-4 flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-200"><Plus size={14} /> NEW SKETCH</button>

          {/* PUBLIC WRITER'S ROOM LIST */}
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-3 mt-8 mb-2 flex items-center gap-1"><Users size={12}/> The Writer's Room</div>
          {publicSketches.map(sketch => (
            <div key={sketch.id} className={`w-full group text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${activeSketchId === sketch.id && isWritersRoom ? 'bg-blue-900/30 text-blue-400 border border-blue-500/20' : 'text-zinc-400 hover:bg-zinc-800/50 border border-transparent'}`}>
              <button onClick={() => { setActiveSketchId(sketch.id); if(window.innerWidth < 768) setSidebarOpen(false); }} className="flex items-center gap-3 flex-1 min-w-0">
                <GitBranch size={16} className="shrink-0" /> <span className="truncate font-medium text-sm">{sketch.title || 'Untitled'}</span>
              </button>
              {sketch.originalAuthorId === user?.uid && (
                <button onClick={(e) => { e.stopPropagation(); setSketchToDelete(sketch); }} className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1.5 transition-opacity" title="Delete Shared Sketch">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {publicSketches.length === 0 && <div className="px-3 text-xs text-zinc-600 italic">No shared sketches.</div>}
        </nav>

        {/* CLOUD SYNC & BYOK PANEL */}
        <div className="border-t border-zinc-800 bg-zinc-950/50 flex flex-col">
          
          {/* LUDDITE MODE TOGGLE */}
          <div className="p-4 border-b border-zinc-800/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                {aiEnabled ? <Sparkles size={14}/> : <EyeOff size={14} className="text-zinc-500"/>} 
                <span className={aiEnabled ? 'text-purple-500' : 'text-zinc-500'}>AI Assistant</span>
              </span>
              <button 
                onClick={toggleAiState}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${aiEnabled ? 'bg-purple-600' : 'bg-zinc-700'}`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${aiEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* BYOK: Bring Your Own Key Section (Hides if AI is disabled) */}
          {aiEnabled && (
            <div className="p-4 border-b border-zinc-800/50 space-y-3 bg-zinc-900/30">
              <div className="text-[9px] text-zinc-500 leading-tight">Paste your personal Gemini API key here to bypass shared rate limits.</div>
              <input 
                type="password" 
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
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Cloud className="text-green-500" size={14} /> Cloud Rig
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-zinc-400 truncate flex items-center justify-between">
                <span className="truncate mr-2">{isRealUser ? user.email : 'Guest Viewer'}</span>
                {isRealUser ? (
                  <button onClick={() => signOut(auth)} className="text-red-400 hover:text-red-300 shrink-0" title="Sign Out"><LogOut size={14} /></button>
                ) : (
                  <button onClick={() => { setIsGuest(false); setAuthResolved(true); }} className="text-orange-400 hover:text-orange-300 font-bold shrink-0" title="Log In">LOG IN</button>
                )}
              </div>
              <button onClick={pushToCloud} disabled={isSyncing || !isRealUser} className="w-full flex justify-center items-center gap-2 px-3 py-2 text-[10px] font-black bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none">
                {isSyncing ? <Loader2 size={12} className="animate-spin" /> : (!isRealUser ? <Lock size={12} /> : <Save size={12} />)}
                SYNC CHANGES
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/50">
              <button onClick={exportSnapshot} className="flex justify-center items-center gap-2 px-2 py-2 text-[9px] font-black text-zinc-500 hover:text-orange-400 border border-zinc-800 rounded-lg transition-all"><Download size={10} /> BACKUP</button>
              <button onClick={handleImportClick} className="flex justify-center items-center gap-2 px-2 py-2 text-[9px] font-black text-zinc-500 hover:text-purple-400 border border-zinc-800 rounded-lg transition-all"><Upload size={10} /> IMPORT</button>
            </div>
            <input type="file" ref={fileInputRef} onChange={importSnapshot} accept=".json" className="hidden" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="absolute left-0 top-1/2 -translate-y-1/2 bg-zinc-800 p-1.5 md:p-1 rounded-r-md z-20 transition-all hover:bg-orange-500 hidden md:block">
          <ChevronRight className={isSidebarOpen ? 'rotate-180' : ''} size={16} />
        </button>

        <div className="flex-1 overflow-y-auto w-full">
          {/* REDESIGNED NAVIGATION HEADER */}
          <header className={`p-4 md:p-6 border-b border-zinc-800 ${isWritersRoom ? 'bg-blue-950/20' : 'bg-zinc-950'} md:backdrop-blur-xl sticky top-0 z-20 w-full shrink-0 shadow-lg transition-colors`}>
            
            {/* WRITER'S ROOM BANNER */}
            {isWritersRoom && (
              <div className="max-w-6xl mx-auto mb-4 bg-blue-600/10 border border-blue-500/30 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><GitBranch size={14}/> The Writer's Room (Public Branch)</h3>
                  <p className="text-[10px] text-blue-300/70 mt-1">Anyone can edit this sketch. {isOriginalAuthor ? "You are the showrunner." : `Original author: ${activeSketch.originalAuthorName}`}</p>
                </div>
                {isOriginalAuthor && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={pullToMaster} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9px] font-black transition-colors"><ArrowDownToLine size={12}/> PULL TO MASTER</button>
                    <button onClick={revertWritersRoom} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/30 rounded text-[9px] font-black transition-colors"><ArrowUpFromLine size={12}/> NUKE & REVERT</button>
                  </div>
                )}
              </div>
            )}

            <div className="max-w-6xl mx-auto flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <button onClick={() => setSidebarOpen(true)} className="md:hidden text-zinc-400 hover:text-white shrink-0"><Menu size={24}/></button>
                    <input value={activeSketch?.title || ''} onChange={(e) => updateSketch(activeSketchId, 'title', e.target.value)} className="bg-transparent text-2xl md:text-4xl font-black focus:outline-none w-full tracking-tighter truncate" placeholder="Title..." />
                  </div>
                  {/* OPEN WRITER'S ROOM BUTTON (Only shown on Private Master) */}
                  {!isWritersRoom && isRealUser && (
                    <button onClick={openWritersRoom} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-[10px] font-black transition-colors shrink-0">
                      <Users size={12}/> OPEN TO WRITER'S ROOM
                    </button>
                  )}
                </div>
                
                {/* HIGH VISIBILITY SCENE METADATA BADGES */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm"><Map size={12}/> {formattedSceneHeading}</span>
                  <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm"><VenetianMask size={12}/> {activeSketch?.tone || 'No Tone'}</span>
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm"><ImageIcon size={12}/> {activeSketch?.imageStyle || 'Pencil Sketch'}</span>
                  <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm"><Layout size={12}/> {activeSketch?.aspectRatio || '16:9'}</span>
                  <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 truncate max-w-[200px] shadow-sm"><Users size={12}/> {availableCharacters.join(', ') || 'No Characters'}</span>
                </div>
              </div>
              
              {/* HORIZONTAL TAB NAVIGATION */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800/50 mt-2">
                <button onClick={() => setViewMode('scene')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${viewMode === 'scene' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                  <Settings2 size={14}/> SCENE CONFIG
                </button>
                <button onClick={() => setViewMode('characters')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${viewMode === 'characters' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                  <Users size={14}/> CHARACTER BIBLE
                </button>
                <button onClick={() => setViewMode('storyboard')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${viewMode === 'storyboard' ? 'bg-zinc-100 text-zinc-950 shadow-lg' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                  <Layout size={14}/> STORYBOARD
                </button>
                <button onClick={() => setViewMode('script')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${viewMode === 'script' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                  <ScrollText size={14}/> SCRIPT
                </button>
                
                <div className="w-px h-6 bg-zinc-800 mx-2 shrink-0 hidden sm:block"></div>
                
                <button onClick={() => shootPlan.length > 0 ? setViewMode('shoot-plan') : optimizeShootOrder()} disabled={!isRealUser && shootPlan.length === 0 || isAIBusy} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all disabled:opacity-50 ${viewMode === 'shoot-plan' ? 'bg-yellow-500 text-black shadow-lg' : 'text-zinc-500 border border-zinc-800 hover:text-white'}`}>
                  {loadingStates.optimizing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} SHOOT PLAN
                </button>
                <button onClick={() => setViewMode('print-boards')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${viewMode === 'print-boards' ? 'bg-zinc-100 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:bg-zinc-900 hover:text-white border border-zinc-800'}`}>
                  <Layout size={14} /> BOARDS
                </button>
                <button onClick={() => setViewMode('print')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${viewMode === 'print' ? 'bg-zinc-100 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:bg-zinc-900 hover:text-white border border-zinc-800'}`}>
                  <Printer size={14} /> PRINT LIST
                </button>
              </div>

            </div>
          </header>

          <div className="p-4 md:p-8 max-w-6xl mx-auto w-full pb-32">
            
            {/* --- TAB: SCENE CONFIG --- */}
            {viewMode === 'scene' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-orange-500 flex items-center gap-2"><Settings2 size={24} /> Scene Configuration</h2>
                </div>

                {/* THE PREMISE SEED */}
                <div className="space-y-2 bg-zinc-900/40 p-6 md:p-8 rounded-[2.5rem] border border-zinc-800/50 shadow-inner">
                  <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> The Premise (Idea)</span>
                    <div className="flex items-center gap-1.5">
                      {history[`sketch-premise`] !== undefined && (
                        <button onClick={() => revertSketchField('premise')} className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Undo AI edit"><Undo size={12}/></button>
                      )}
                      {aiEnabled && (
                        <button onClick={() => generateNarrativeBeat('premise')} disabled={!isRealUser || isAIBusy} className="p-1.5 hover:bg-orange-500/20 rounded transition-colors disabled:opacity-50 text-orange-500 flex items-center gap-1 text-[9px]">
                          {!isRealUser ? <Lock size={10} /> : <Sparkles size={10} />} GENERATE
                        </button>
                      )}
                    </div>
                  </label>
                  <textarea value={activeSketch?.premise || ''} onChange={(e) => updateSketch(activeSketchId, 'premise', e.target.value)} placeholder="Describe the basic concept here to act as a seed for the AI... (e.g. A guy attends a deeply serious funeral but gets stuck in his mascot uniform.)" className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-4 md:p-6 text-sm focus:outline-none focus:border-orange-500/50 min-h-[100px] resize-y text-zinc-200" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {['hook', 'escalation', 'ending'].map((beat) => (
                    <div key={beat} className="space-y-2 bg-zinc-900/30 p-5 rounded-[2rem] border border-zinc-800/50">
                      <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center justify-between mb-2">
                        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> The {beat}</span>
                        <div className="flex items-center gap-1">
                          {history[`sketch-${beat}`] !== undefined && (
                            <button onClick={() => revertSketchField(beat)} className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Undo AI edit"><Undo size={12}/></button>
                          )}
                          {aiEnabled && (
                            <button onClick={() => generateNarrativeBeat(beat)} disabled={!isRealUser || isAIBusy} className="p-1.5 hover:bg-orange-500/20 rounded transition-colors disabled:opacity-50">{!isRealUser ? <Lock size={12} className="text-orange-500" /> : <Sparkles size={12} className="text-orange-500" />}</button>
                          )}
                        </div>
                      </label>
                      <textarea value={activeSketch?.[beat] || ''} onChange={(e) => updateSketch(activeSketchId, beat, e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-orange-500/50 min-h-[120px] resize-none text-zinc-300" />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-zinc-900/20 p-6 md:p-8 rounded-[2.5rem] border border-zinc-800 shadow-inner">
                  <div className="space-y-2 sm:col-span-2 lg:col-span-5">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Scene Heading</span>
                    <div className="flex flex-col sm:flex-row bg-zinc-950/50 rounded-xl border border-zinc-800 focus-within:border-orange-500/50 overflow-hidden shadow-inner">
                      <select value={activeSketch?.settingType || 'INT.'} onChange={(e) => updateSketch(activeSketchId, 'settingType', e.target.value)} className="bg-zinc-900 border-b sm:border-b-0 sm:border-r border-zinc-800 text-sm font-bold text-orange-500 p-3 focus:outline-none cursor-pointer text-center sm:w-24">
                        <option>INT.</option><option>EXT.</option><option>I/E.</option>
                      </select>
                      <input value={activeSketch?.location !== undefined ? activeSketch.location : (activeSketch?.sceneType || '')} onChange={(e) => updateSketch(activeSketchId, 'location', e.target.value)} placeholder="LOCATION..." className="flex-1 bg-transparent text-sm font-black p-3 focus:outline-none uppercase w-full text-zinc-200" />
                      <span className="text-zinc-700 font-black p-3 select-none hidden sm:block">-</span>
                      <select value={activeSketch?.timeOfDay || 'DAY'} onChange={(e) => updateSketch(activeSketchId, 'timeOfDay', e.target.value)} className="bg-zinc-900 border-t sm:border-t-0 sm:border-l border-zinc-800 text-sm font-bold text-blue-500 p-3 focus:outline-none cursor-pointer text-center sm:w-28">
                        <option>DAY</option><option>NIGHT</option><option>DAWN</option><option>DUSK</option><option>CONT.</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><VenetianMask size={12}/> Tone</span>
                    <select value={TONES.includes(activeSketch?.tone) ? activeSketch?.tone : 'Other'} onChange={(e) => updateSketch(activeSketchId, 'tone', e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none font-bold cursor-pointer text-purple-400 [&>option]:bg-zinc-900">
                      {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {activeSketch?.tone === 'Other' || (!TONES.includes(activeSketch?.tone) && activeSketch?.tone) ? (
                      <input value={activeSketch?.tone === 'Other' ? '' : activeSketch?.tone} onChange={(e) => updateSketch(activeSketchId, 'tone', e.target.value)} placeholder="Type custom tone..." className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none font-bold text-purple-400 mt-2 shadow-inner" />
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><ImageIcon size={12}/> Art Style</span>
                    <select value={activeSketch?.imageStyle || 'Pencil Sketch'} onChange={(e) => updateSketch(activeSketchId, 'imageStyle', e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none font-bold cursor-pointer text-blue-400 [&>option]:bg-zinc-900">
                      {IMAGE_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Layout size={12}/> Ratio</span>
                    <select value={activeSketch?.aspectRatio || '16:9'} onChange={(e) => updateSketch(activeSketchId, 'aspectRatio', e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none font-bold cursor-pointer text-zinc-300 [&>option]:bg-zinc-900">
                      {ASPECT_RATIOS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Key Props</span>
                    <input value={activeSketch?.props || ''} onChange={(e) => updateSketch(activeSketchId, 'props', e.target.value)} placeholder="Mustard, Casket..." className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none font-bold italic h-[46px] text-zinc-300" />
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB: CHARACTER BIBLE --- */}
            {viewMode === 'characters' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-green-500 flex items-center gap-2"><Users size={24} /> Character Bible</h2>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {aiEnabled && (
                      <button onClick={extractCharacters} disabled={!isRealUser || isAIBusy} className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-600/30 rounded-full text-xs font-black transition-all shadow-lg flex">
                        {loadingStates.extractChars ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} AUTO-EXTRACT
                      </button>
                    )}
                    <button onClick={addCharacter} className="flex-1 sm:flex-none justify-center items-center gap-2 px-6 py-2.5 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white border border-green-600/30 rounded-full text-xs font-black transition-all shadow-lg flex"><Plus size={14} /> ADD CHARACTER</button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {activeProfiles.map(char => (
                    <div key={char.id} className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] p-6 flex flex-col gap-6 relative group transition-all hover:border-zinc-700 shadow-xl">
                      <button onClick={() => removeChar(char.id)} className="absolute top-4 right-4 p-2 bg-zinc-950/50 rounded-full text-zinc-500 hover:text-red-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity border border-zinc-800 z-10 shadow-md"><Trash2 size={14} /></button>
                      
                      <div className="flex gap-5 items-center pr-10">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-950 rounded-full overflow-hidden flex-shrink-0 relative group/avatar border-2 border-zinc-800 shadow-inner">
                           {char.image ? <img src={char.image} className="w-full h-full object-cover"/> : <User size={32} className="m-auto mt-6 sm:mt-8 text-zinc-700"/>}
                           <input type="file" accept="image/*" onChange={(e) => handleCharImageUpload(char.id, e)} className="hidden" id={`char-img-${char.id}`} />
                           <label htmlFor={`char-img-${char.id}`} className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity z-10">
                              <Upload size={20} className="text-white"/>
                           </label>
                           {aiEnabled && (
                             <button onClick={() => generateCharAvatar(char.id)} disabled={!isRealUser || loadingStates[`charImg-${char.id}`]} className="absolute bottom-2 right-2 bg-purple-600/90 hover:bg-purple-500 p-2 rounded-full text-white shadow-lg opacity-0 group-hover/avatar:opacity-100 transition-opacity z-20 disabled:opacity-50" title="Generate AI Avatar">
                               {loadingStates[`charImg-${char.id}`] ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                             </button>
                           )}
                        </div>
                        <div className="flex-1 space-y-2">
                           <input value={char.name || ''} onChange={(e) => updateChar(char.id, 'name', e.target.value)} placeholder="Character Name" className="bg-transparent text-2xl font-black focus:outline-none text-zinc-100 w-full placeholder-zinc-800 border-b border-zinc-800 focus:border-green-500 pb-1" />
                           <select value={COMEDY_ARCHETYPES.includes(char.archetype) ? char.archetype : 'Other'} onChange={(e) => updateChar(char.id, 'archetype', e.target.value)} className="bg-zinc-950 text-green-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-800 focus:outline-none cursor-pointer w-full appearance-none">
                              {COMEDY_ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
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
                            <span>Fem</span><span>Masc</span>
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

                      <div className="relative mt-2">
                        <textarea value={char.desc || ''} onChange={(e) => updateChar(char.id, 'desc', e.target.value)} placeholder="Fatal flaw, weird physical traits, strange wardrobe..." className="w-full bg-zinc-950/50 rounded-xl p-4 text-sm text-zinc-300 resize-none focus:outline-none border border-zinc-800/50 focus:border-green-500/50 h-28 leading-relaxed shadow-inner" />
                        <div className="absolute bottom-3 right-3 flex items-center gap-1">
                          {history[`char-${char.id}-desc`] !== undefined && (
                            <button onClick={() => revertCharDesc(char.id)} className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors shadow-md" title="Undo AI edit"><Undo size={14}/></button>
                          )}
                          {aiEnabled && (
                            <button onClick={() => generateCharDesc(char.id)} disabled={!isRealUser || isAIBusy} className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-green-400 transition-colors disabled:opacity-50 shadow-md" title="Generate character flaw">
                              {loadingStates[`char-${char.id}`] ? <Loader2 size={14} className="animate-spin text-green-500" /> : (!isRealUser ? <Lock size={14} /> : <Sparkles size={14} />)}
                            </button>
                          )}
                        </div>
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

            {/* --- TAB: SCRIPT --- */}
            {viewMode === 'script' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-blue-400 flex items-center gap-2"><ScrollText size={24} /> Generated Script</h2>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {aiEnabled && (
                      <button onClick={generateScript} disabled={!isRealUser || isAIBusy} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-full text-xs font-black shadow-lg shadow-blue-900/20 whitespace-nowrap">
                        {loadingStates.script ? <Loader2 size={14} className="animate-spin" /> : (!isRealUser ? <Lock size={14} /> : <Sparkles size={14} />)} WRITE SCRIPT
                      </button>
                    )}
                    <button onClick={downloadScript} disabled={!activeSketch?.script} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-zinc-800 text-blue-400 hover:bg-zinc-700 disabled:opacity-50 rounded-full text-xs font-black transition-all border border-zinc-700"><Download size={14} /> SAVE PDF</button>
                  </div>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 relative shadow-xl">
                  <textarea value={activeSketch?.script || ''} onChange={(e) => updateSketch(activeSketchId, 'script', e.target.value)} className="w-full bg-zinc-950/80 rounded-2xl p-4 md:p-8 text-xs md:text-sm font-mono text-zinc-300 min-h-[70vh] focus:outline-none border border-zinc-800/50 resize-y leading-relaxed whitespace-pre-wrap shadow-inner" placeholder="Generate a script from your storyboard, or type manually..." />
                </div>
              </div>
            )}

            {/* --- TAB: STORYBOARD (SHOT LIST) --- */}
            {viewMode === 'storyboard' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 md:space-y-8">
                
                {/* Storyboard Header & AI Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-zinc-100 flex items-center gap-2"><Layout size={24} /> Shot List</h2>
                  {aiEnabled && (
                    <button onClick={generateAISHots} disabled={!isRealUser || isAIBusy} className="w-full sm:w-auto flex justify-center flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-full text-xs font-black shadow-lg shadow-purple-900/20 whitespace-nowrap">
                      {loadingStates.genShots ? <Loader2 size={14} className="animate-spin" /> : (!isRealUser ? <Lock size={14} /> : <Sparkles size={14} />)} BUILD 8-SHOT SEQUENCE
                    </button>
                  )}
                </div>

                {activeShots.length === 0 && (
                  <div className="py-16 text-center border-2 border-dashed border-zinc-800 rounded-[3rem] text-zinc-600 flex flex-col items-center gap-4">
                    <Camera size={48} className="opacity-30"/>
                    <p className="text-sm font-bold uppercase tracking-widest">The board is empty.<br/>Add a shot manually or use the AI builder.</p>
                  </div>
                )}

                {activeShots.map((shot, index) => {
                  const currentPrompt = getShotPrompt(shot);
                  const isPersonalKeyActive = userApiKey.trim().length > 0;
                  
                  return (
                  <React.Fragment key={shot.id}>
                    <div className={`group bg-zinc-900/40 border ${shot.fx ? 'border-orange-500/40' : 'border-zinc-800'} rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 hover:bg-zinc-900/60 transition-all relative overflow-hidden`}>
                      
                      <div className="absolute top-0 right-0 p-4 md:p-6 text-6xl md:text-9xl text-zinc-800/20 font-black pointer-events-none select-none z-0">{index + 1}</div>
                      
                      {/* TRASH ICON - MOVED TO TOP RIGHT */}
                      <button onClick={() => deleteShot(shot.id)} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-zinc-600 hover:text-red-400 bg-zinc-950/80 rounded-full border border-zinc-800 hover:border-red-500/50 transition-all z-20 shadow-lg"><Trash2 size={16} /></button>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 relative z-10 w-full mt-8 md:mt-0">
                        <div className="lg:col-span-4 space-y-4 w-full">
                          
                          {/* DYNAMIC ASPECT RATIO CONTAINER */}
                          <div 
                            className="bg-zinc-950 rounded-[1.5rem] border border-zinc-800 overflow-hidden relative group/img flex items-center justify-center mx-auto"
                            style={{ aspectRatio: (activeSketch?.aspectRatio || '16:9').replace(':', '/') }}
                          >
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
                                      <p className="text-[9px] text-zinc-400 mb-2 font-mono pr-4 h-20 overflow-y-auto leading-relaxed select-all">
                                        {currentPrompt}
                                      </p>
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
                                    {aiEnabled && (
                                      <div className="flex gap-2">
                                        <button onClick={() => setVisiblePromptId(shot.id)} className="text-[9px] font-black text-zinc-600 hover:text-purple-400 flex items-center gap-1 transition-colors uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800">
                                          <FileText size={10} /> PROMPT
                                        </button>
                                        <button 
                                          onClick={() => generateImage(shot.id)} 
                                          disabled={!isPersonalKeyActive || loadingStates[`image-${shot.id}`] || isAIBusy}
                                          className={`text-[9px] font-black flex items-center gap-1 transition-colors uppercase tracking-widest px-3 py-1.5 rounded border ${isPersonalKeyActive ? 'text-zinc-300 bg-purple-600/20 border-purple-500/30 hover:bg-purple-600 hover:text-white' : 'text-zinc-600 bg-zinc-900 border-zinc-800 opacity-50'}`}
                                          title={!isPersonalKeyActive ? "Requires personal API Key in sidebar" : "Generate Image"}
                                        >
                                          {loadingStates[`image-${shot.id}`] ? <Loader2 size={10} className="animate-spin text-purple-400" /> : (!isPersonalKeyActive ? <Lock size={10} /> : <Sparkles size={10} />)} 
                                          GENERATE
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* COLLABORATION BADGE */}
                          {shot.lastEditedBy && isWritersRoom && (
                            <div className="mt-2 text-[9px] text-blue-400 italic">Last edit by: {shot.lastEditedBy}</div>
                          )}

                          <div className="flex flex-col gap-2 w-full mt-4">
                            <div className="flex gap-2 w-full">
                              <select value={shot.type || 'Medium'} onChange={(e) => updateShot(shot.id, 'type', e.target.value)} className="flex-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 md:p-2.5 text-xs font-bold focus:ring-1 ring-orange-500 appearance-none">{SHOT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select>
                              <button onClick={() => updateShot(shot.id, 'fx', !shot.fx)} className={`px-4 py-3 md:py-2 rounded-xl text-[10px] font-black border ${shot.fx ? 'bg-orange-600 text-white border-orange-400' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>FX</button>
                            </div>
                            <div className="flex items-center bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-3 py-3 md:py-2 w-full"><Map size={12} className="text-zinc-500 mr-2 shrink-0" /><input value={shot.locationCaveat || ''} onChange={(e) => updateShot(shot.id, 'locationCaveat', e.target.value)} placeholder="Location caveat..." className="w-full bg-transparent text-[10px] font-bold text-zinc-400 focus:outline-none min-w-0" /></div>
                          </div>
                        </div>

                        <div className="lg:col-span-8 flex flex-col justify-between w-full h-full">
                          <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                              <div className="flex-1 space-y-3 w-full">
                                <input value={shot.subject || ''} onChange={(e) => updateShot(shot.id, 'subject', e.target.value)} placeholder="Subject..." className="w-full bg-transparent text-xl md:text-2xl font-black border-b border-zinc-800 focus:border-orange-500 p-1 focus:outline-none" />
                                {availableCharacters.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    <span className="text-[9px] font-black text-zinc-600 uppercase flex items-center h-6 mr-1 shrink-0">In Shot:</span>
                                    {availableCharacters.map(char => {
                                      const isActive = (shot.shotCharacters || []).includes(char);
                                      return (<button key={char} onClick={() => toggleShotCharacter(shot.id, char)} className={`px-3 py-1.5 md:py-1 rounded-full text-[10px] font-bold border transition-all whitespace-nowrap ${isActive ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>{char}</button>);
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-2 w-full">
                              <div className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                <div className="flex items-center gap-1">
                                  {history[`shot-${shot.id}-action`] !== undefined && (
                                    <button onClick={() => revertShotField(shot.id, 'action')} className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Undo AI edit"><Undo size={12}/></button>
                                  )}
                                  {aiEnabled && (
                                    <button onClick={() => generateTextAssist(shot.id, 'action', 'Director blocking physical comedy.', `Shot Subject: ${shot.subject}`)} disabled={!isRealUser || isAIBusy} className="p-1 hover:bg-orange-500/20 rounded disabled:opacity-50 shrink-0 text-orange-500">{loadingStates[`action-${shot.id}`] ? <Loader2 size={12} className="animate-spin" /> : (!isRealUser ? <Lock size={12} /> : <Clapperboard size={12} />)}</button>
                                  )}
                                </div>
                                Action / Blocking
                              </div>
                              <textarea value={shot.action || ''} onChange={(e) => updateShot(shot.id, 'action', e.target.value)} className="w-full bg-zinc-950/50 rounded-[1.5rem] p-4 text-xs text-zinc-300 min-h-[80px] md:min-h-[60px] focus:outline-none border border-zinc-800/50 focus:border-orange-500/50 resize-y" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
                              <div className="space-y-2 w-full">
                                <div className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                  <div className="flex items-center gap-1">
                                    {history[`shot-${shot.id}-dialogue`] !== undefined && (
                                      <button onClick={() => revertShotField(shot.id, 'dialogue')} className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Undo AI edit"><Undo size={12}/></button>
                                    )}
                                    {aiEnabled && (
                                      <button onClick={() => generateTextAssist(shot.id, 'dialogue', 'Writer drafting dialogue.', `Subject: ${shot.subject}, Action: ${shot.action}`)} disabled={!isRealUser || isAIBusy} className="p-1 hover:bg-purple-500/20 rounded disabled:opacity-50 shrink-0 text-purple-500">{loadingStates[`dialogue-${shot.id}`] ? <Loader2 size={12} className="animate-spin" /> : (!isRealUser ? <Lock size={12} /> : <Quote size={12} />)}</button>
                                    )}
                                  </div>
                                  Dialogue / Improv
                                </div>
                                <textarea value={shot.dialogue || ''} onChange={(e) => updateShot(shot.id, 'dialogue', e.target.value)} className="w-full bg-zinc-950/50 rounded-[1.5rem] p-4 text-xs text-zinc-200 min-h-[100px] focus:outline-none border border-zinc-800/50 focus:border-purple-500/50 resize-y" />
                              </div>
                              <div className="space-y-2 w-full">
                                <div className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                  <div className="flex items-center gap-1">
                                    {history[`shot-${shot.id}-notes`] !== undefined && (
                                      <button onClick={() => revertShotField(shot.id, 'notes')} className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Undo AI edit"><Undo size={12}/></button>
                                    )}
                                    {aiEnabled && (
                                      <button onClick={() => generateTextAssist(shot.id, 'notes', 'DP advising on camera/light.', `Type: ${shot.type}, Subject: ${shot.subject}`)} disabled={!isRealUser || isAIBusy} className="p-1 hover:bg-blue-500/20 rounded disabled:opacity-50 shrink-0 text-blue-500">{loadingStates[`notes-${shot.id}`] ? <Loader2 size={12} className="animate-spin" /> : (!isRealUser ? <Lock size={12} /> : <Wand2 size={12} />)}</button>
                                    )}
                                  </div>
                                  Director Notes
                                </div>
                                <textarea value={shot.notes || ''} onChange={(e) => updateShot(shot.id, 'notes', e.target.value)} className="w-full bg-zinc-950/50 rounded-[1.5rem] p-4 text-xs text-zinc-400 min-h-[100px] focus:outline-none border border-zinc-800/50 focus:border-blue-500/50 resize-y italic" />
                              </div>
                            </div>
                          </div>
                          
                          {/* NEW BOTTOM BAR: Camera Move & Reordering Arrows */}
                          <div className="flex justify-between items-end mt-6 pt-4 border-t border-zinc-800/50">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1"><Video size={10}/> Camera Movement</span>
                              <select value={shot.cameraMove || 'Locked Off'} onChange={(e) => updateShot(shot.id, 'cameraMove', e.target.value)} className="bg-zinc-950 text-blue-400 text-xs font-bold px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-blue-500/50 cursor-pointer appearance-none">
                                {CAMERA_MOVES.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                            <div className="flex gap-1 bg-zinc-950/50 rounded-xl p-1 border border-zinc-800/50">
                              <button onClick={() => moveShot(index, -1)} disabled={index === 0} className="p-2 md:p-1.5 text-zinc-600 hover:text-white disabled:opacity-20 transition-colors"><ArrowUp size={16} /></button>
                              <button onClick={() => moveShot(index, 1)} disabled={index === activeShots.length - 1} className="p-2 md:p-1.5 text-zinc-600 hover:text-white disabled:opacity-20 transition-colors"><ArrowDown size={16} /></button>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* NEW SUBTLE INSERT SHOT DIVIDER */}
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
                  {aiEnabled && (
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
            
            {/* --- TAB: SHOOT PLAN --- */}
            {viewMode === 'shoot-plan' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                 {shootPlan.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-[2rem] p-6 md:p-8 mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-yellow-500 flex items-center gap-2"><Zap size={24}/> Optimized Shoot Plan</h2>
                      <p className="text-xs text-yellow-500/60 mt-1">Grouped by location, type, and talent to save time on set.</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={optimizeShootOrder} disabled={!isRealUser || isAIBusy} className="flex-1 sm:flex-none justify-center items-center gap-2 px-6 py-2.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-full text-xs font-black transition-all flex">
                        {loadingStates.optimizing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} REASSESS
                      </button>
                      <button onClick={downloadShootPlan} className="flex-1 sm:flex-none justify-center items-center gap-2 px-6 py-2.5 bg-zinc-800 text-yellow-500 hover:bg-zinc-700 border border-zinc-700 rounded-full text-xs font-black transition-all flex"><Download size={14} /> SAVE PLAN</button>
                    </div>
                  </div>
                )}
                {/* Fallback to render shoot plan list, borrowing logic from storyboard but reading from shootPlan array */}
                {shootPlan.map((shot, index) => {
                  return (
                    <div key={shot.id} className={`group bg-zinc-900/40 border ${shot.fx ? 'border-orange-500/40' : 'border-zinc-800'} rounded-[2rem] p-6 hover:bg-zinc-900/60 transition-all relative overflow-hidden mb-4 shadow-md`}>
                       <div className="absolute top-0 right-0 p-4 text-4xl text-zinc-800/30 font-black pointer-events-none select-none z-0">{shot.shootOrderNumber}</div>
                       <div className="relative z-10 flex flex-col md:flex-row gap-6">
                         {shot.image && <img src={shot.image} className="w-full md:w-48 aspect-video object-cover rounded-xl border border-zinc-800 shrink-0"/>}
                         <div className="flex-1 space-y-2">
                           <div className="flex flex-wrap gap-2 items-center">
                             <span className="text-xs font-black bg-zinc-800 text-zinc-300 px-2 py-1 rounded uppercase tracking-wider">{shot.type}</span>
                             {shot.cameraMove && shot.cameraMove !== 'Locked Off' && <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 border border-blue-500/20 uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1"><Video size={10} className="inline -mt-0.5"/> {shot.cameraMove}</span>}
                             {shot.locationCaveat && <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 uppercase tracking-widest px-2 py-1 rounded">LOC: {shot.locationCaveat}</span>}
                             <span className="text-lg font-black uppercase">{shot.subject}</span>
                           </div>
                           {shot.optimizationReason && <div className="text-xs italic text-yellow-500/70 border-l-2 border-yellow-500/50 pl-3 py-1 my-2">{shot.optimizationReason}</div>}
                           <p className="text-sm text-zinc-400"><span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-1">Action</span>{shot.action}</p>
                           <p className="text-xs text-zinc-500"><span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-1 mt-2">Notes</span>{shot.notes}</p>
                         </div>
                       </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </div>
      </main>

      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out" onClick={() => setZoomedImage(null)}>
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