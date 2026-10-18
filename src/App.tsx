import React, { useState, useEffect } from 'react';
import { 
  Heart, Sparkles, MessageCircle, ShieldCheck, MapPin, Search, Filter, 
  UserCheck, Volume2, Image as ImageIcon, AlertTriangle, Lock, LogOut, 
  CheckCircle, XCircle, Trash2, Send, Bot, RefreshCw, Star, ArrowRight,
  Flame, Globe, Smile, Check, ShieldAlert
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  age: number;
  gender: string;
  municipality: string;
  village: string;
  intention: string;
  language: string;
  whatsapp: string;
  bio: string;
  image_url: string;
  is_approved: boolean;
  is_banned: boolean;
  created_at: string;
}

interface Report {
  id: string;
  reported_id: string;
  reason: string;
  reporter: string;
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const MUNICIPALITIES = [
  'All Municipalities',
  'Greater Giyani',
  'Greater Tzaneen',
  'Ba-Phalaborwa',
  'Greater Letaba',
  'Maruleng'
];

const INTENTIONS = [
  'All Intentions',
  'Marriage & Family',
  'Long-term relationship',
  'Serious Relationship',
  'Dating & Friendship',
  'Marriage'
];

export default function App() {
  const [tab, setTab] = useState<'discover' | 'ai-coach' | 'ai-images' | 'create' | 'admin'>('discover');
  
  // Profiles state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  
  // Filters
  const [selectedMunicipality, setSelectedMunicipality] = useState('All Municipalities');
  const [selectedIntention, setSelectedIntention] = useState('All Intentions');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected profile for modal detail view
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  
  // TTS & Audio State
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // AI Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Sawubona! I am your Mopani Matchmaker AI. Need a sweet icebreaker for Xitsonga or Sepedi speakers, looking for romantic date spots in Tzaneen or Giyani, or relationship advice? Ask away!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // AI Image Generator State
  const [imagePrompt, setImagePrompt] = useState('Romantic couple having coffee at a scenic view overlooking Tzaneen dam at sunset');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Create Profile Form State
  const [formName, setFormName] = useState('');
  const [formAge, setFormAge] = useState(25);
  const [formGender, setFormGender] = useState('Female');
  const [formMunicipality, setFormMunicipality] = useState('Greater Giyani');
  const [formVillage, setFormVillage] = useState('');
  const [formIntention, setFormIntention] = useState('Marriage & Family');
  const [formLanguage, setFormLanguage] = useState('Xitsonga / English');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Report Modal State
  const [reportingProfile, setReportingProfile] = useState<Profile | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Admin State
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminProfiles, setAdminProfiles] = useState<Profile[]>([]);
  const [adminReports, setAdminReports] = useState<Report[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // Load approved profiles on mount
  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const res = await fetch('/api/profiles?approved=true');
      const data = await res.json();
      setProfiles(data);
    } catch (err) {
      console.error('Failed to fetch profiles', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  // Filter profiles
  const filteredProfiles = profiles.filter(p => {
    if (selectedMunicipality !== 'All Municipalities' && p.municipality !== selectedMunicipality) return false;
    if (selectedIntention !== 'All Intentions' && p.intention !== selectedIntention) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.full_name.toLowerCase().includes(q);
      const matchVillage = p.village.toLowerCase().includes(q);
      const matchBio = p.bio.toLowerCase().includes(q);
      if (!matchName && !matchVillage && !matchBio) return false;
    }
    return true;
  });

  // Handle TTS
  const speakBio = async (id: string, text: string) => {
    try {
      if (speakingId === id && audioElement) {
        audioElement.pause();
        setSpeakingId(null);
        setAudioElement(null);
        return;
      }
      if (audioElement) {
        audioElement.pause();
      }
      setSpeakingId(id);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.audioBase64) {
        const audio = new Audio(`data:${data.mimeType || 'audio/mp3'};base64,${data.audioBase64}`);
        setAudioElement(audio);
        audio.play();
        audio.onended = () => {
          setSpeakingId(null);
          setAudioElement(null);
        };
      } else {
        alert(data.error || 'TTS could not generate audio. Ensure GEMINI_API_KEY is set.');
        setSpeakingId(null);
      }
    } catch (err) {
      console.error('TTS error', err);
      alert('Failed to play audio');
      setSpeakingId(null);
    }
  };

  // Handle AI Chat
  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages = [...chatMessages, { role: 'user' as const, text: userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await res.json();
      setChatMessages([...newMessages, { role: 'model', text: data.reply || 'No response' }]);
    } catch (err) {
      console.error('Chat error', err);
      setChatMessages([...newMessages, { role: 'model', text: 'Sorry, connection error occurred. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Handle AI Image Generation
  const generateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() || imageLoading) return;
    setImageLoading(true);
    setGeneratedImageUrl(null);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, size: imageSize })
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
      } else {
        alert(data.error || 'Image generation failed');
      }
    } catch (err) {
      console.error('Image gen error', err);
      alert('Image generation failed');
    } finally {
      setImageLoading(false);
    }
  };

  // Submit Profile Form
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formWhatsapp || !formVillage || !formBio) {
      alert('Please fill in all required fields.');
      return;
    }
    try {
      const avatar = formImageUrl.trim() || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?auto=format&fit=crop&w=800&q=80`;
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formName,
          age: Number(formAge),
          gender: formGender,
          municipality: formMunicipality,
          village: formVillage,
          intention: formIntention,
          language: formLanguage,
          whatsapp: formWhatsapp,
          bio: formBio,
          image_url: avatar
        })
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setFormName('');
        setFormVillage('');
        setFormBio('');
        setFormWhatsapp('');
        setFormImageUrl('');
      } else {
        alert('Failed to submit profile');
      }
    } catch (err) {
      console.error('Create profile error', err);
      alert('Error submitting profile');
    }
  };

  // Submit Report
  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingProfile || !reportReason.trim()) return;
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_id: reportingProfile.id,
          reason: reportReason,
          reporter: 'Member'
        })
      });
      setReportSubmitted(true);
      setTimeout(() => {
        setReportingProfile(null);
        setReportReason('');
        setReportSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error('Report error', err);
    }
  };

  // Admin Login & Actions
  const handleAdminLogin = async () => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await res.json();
      if (data.success) {
        setAdminAuth(true);
        loadAdminData();
      } else {
        alert('Wrong admin password! (Hint: MopaniAdmin2026!)');
      }
    } catch (err) {
      console.error('Admin login error', err);
    }
  };

  const loadAdminData = async () => {
    try {
      setAdminLoading(true);
      const res = await fetch('/api/admin/data');
      const data = await res.json();
      setAdminProfiles(data.profiles);
      setAdminReports(data.reports);
    } catch (err) {
      console.error('Load admin data error', err);
    } finally {
      setAdminLoading(false);
    }
  };

  const performAdminAction = async (id: string, action: 'approve' | 'ban' | 'delete') => {
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      const data = await res.json();
      if (data.success) {
        setAdminProfiles(data.profiles);
        fetchProfiles(); // refresh public
      }
    } catch (err) {
      console.error('Admin action error', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Banner / Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setTab('discover')}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/30">
              <Heart className="w-6 h-6 text-white fill-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-rose-200 to-amber-200 bg-clip-text text-transparent">
                Mopani Singles
              </h1>
              <p className="text-xs text-zinc-400 font-medium hidden sm:block">
                Giyani • Tzaneen • Phalaborwa • Letaba • Maruleng
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setTab('discover')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center space-x-2 ${
                tab === 'discover' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Discover</span>
            </button>
            <button
              onClick={() => setTab('ai-coach')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center space-x-2 ${
                tab === 'ai-coach' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Coach & Chat</span>
            </button>
            <button
              onClick={() => setTab('ai-images')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center space-x-2 ${
                tab === 'ai-images' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Date Spot Studio</span>
            </button>
            <button
              onClick={() => setTab('create')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center space-x-2 ${
                tab === 'create' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Join / Create Profile</span>
            </button>
            <button
              onClick={() => setTab('admin')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center space-x-2 ${
                tab === 'admin' ? 'bg-zinc-800 text-rose-400 border border-rose-500/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </nav>

          {/* Mobile hamburger or CTA */}
          <div className="flex items-center space-x-2 md:hidden">
            <button
              onClick={() => setTab('create')}
              className="bg-gradient-to-r from-rose-600 to-pink-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30"
            >
              Join Free
            </button>
            <button
              onClick={() => setTab('admin')}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden overflow-x-auto px-4 py-2 bg-zinc-900/90 border-t border-zinc-800 space-x-2 scrollbar-none">
          <button
            onClick={() => setTab('discover')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 ${
              tab === 'discover' ? 'bg-rose-600 text-white' : 'text-zinc-400 bg-zinc-800/50'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Discover</span>
          </button>
          <button
            onClick={() => setTab('ai-coach')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 ${
              tab === 'ai-coach' ? 'bg-rose-600 text-white' : 'text-zinc-400 bg-zinc-800/50'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Coach</span>
          </button>
          <button
            onClick={() => setTab('ai-images')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 ${
              tab === 'ai-images' ? 'bg-rose-600 text-white' : 'text-zinc-400 bg-zinc-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Studio</span>
          </button>
          <button
            onClick={() => setTab('create')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 ${
              tab === 'create' ? 'bg-rose-600 text-white' : 'text-zinc-400 bg-zinc-800/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Join</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: DISCOVER SINGLES */}
        {tab === 'discover' && (
          <div className="space-y-8">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-950/80 via-zinc-900 to-indigo-950/80 border border-zinc-800/80 p-8 sm:p-12 shadow-2xl">
              <div className="absolute -right-12 -top-12 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider mb-4">
                  <Flame className="w-3.5 h-3.5" /> Mopani's Premier Match Platform
                </span>
                <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
                  Find Love & Meaningful Connections Across Mopani
                </h2>
                <p className="text-zinc-300 text-base sm:text-lg mb-6">
                  Verified single ladies and gentlemen in Giyani, Tzaneen, Phalaborwa, Letaba, and Maruleng. Connect directly via WhatsApp or chat!
                </p>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => setTab('create')}
                    className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-rose-600/30 transition-all flex items-center space-x-2"
                  >
                    <span>Create Your Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTab('ai-coach')}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold px-6 py-3 rounded-2xl border border-zinc-700 transition-all flex items-center space-x-2"
                  >
                    <Bot className="w-4 h-4 text-rose-400" />
                    <span>Ask AI Matchmaker</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 border border-zinc-800 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Municipality Select */}
              <div className="relative">
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Municipality</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-rose-500 pointer-events-none" />
                  <select
                    value={selectedMunicipality}
                    onChange={(e) => setSelectedMunicipality(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-zinc-100 focus:outline-none focus:border-rose-500 appearance-none font-medium cursor-pointer"
                  >
                    {MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Intention Select */}
              <div className="relative">
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Relationship Intention</label>
                <div className="relative">
                  <Heart className="absolute left-3.5 top-3 w-4 h-4 text-rose-500 pointer-events-none" />
                  <select
                    value={selectedIntention}
                    onChange={(e) => setSelectedIntention(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-zinc-100 focus:outline-none focus:border-rose-500 appearance-none font-medium cursor-pointer"
                  >
                    {INTENTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Search Name / Village</label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Risuna, Giyani..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-zinc-100 focus:outline-none focus:border-rose-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Profile Grid */}
            {loadingProfiles ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(n => (
                  <div key={n} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl h-96 animate-pulse p-6 flex flex-col justify-end">
                    <div className="h-6 bg-zinc-800 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-zinc-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No singles found matching criteria</h3>
                <p className="text-zinc-400 text-sm mb-6">Try adjusting your filters or search terms, or be the first to join in this area!</p>
                <button
                  onClick={() => { setSelectedMunicipality('All Municipalities'); setSelectedIntention('All Intentions'); setSearchQuery(''); }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProfiles.map(p => (
                  <div 
                    key={p.id}
                    className="group bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col"
                  >
                    {/* Image Card Header */}
                    <div className="relative h-72 w-full overflow-hidden bg-zinc-950">
                      <img 
                        src={p.image_url} 
                        alt={p.full_name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                      
                      {/* Verified Badge */}
                      <div className="absolute top-4 left-4 flex items-center space-x-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-emerald-400 text-xs font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified Mopani Local</span>
                      </div>

                      {/* Language Badge */}
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-zinc-300 text-xs font-semibold">
                        {p.language.split('/')[0]}
                      </div>

                      {/* Name & Age Overlay */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-baseline space-x-2">
                          <h3 className="text-2xl font-black text-white">{p.full_name},</h3>
                          <span className="text-xl font-bold text-rose-400">{p.age}</span>
                        </div>
                        <p className="text-xs text-zinc-300 flex items-center space-x-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>{p.village}, {p.municipality}</span>
                        </p>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="inline-block bg-rose-500/10 text-rose-400 text-xs font-bold px-3 py-1 rounded-full mb-3 border border-rose-500/20">
                          {p.intention}
                        </div>
                        <p className="text-zinc-300 text-sm line-clamp-3 leading-relaxed">
                          {p.bio}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => speakBio(p.id, `${p.full_name} from ${p.village}, ${p.municipality}. Looking for ${p.intention}. Bio: ${p.bio}`)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                            speakingId === p.id 
                              ? 'bg-rose-600 border-rose-500 text-white animate-pulse' 
                              : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                          }`}
                          title="Listen to Bio (AI Voice)"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>{speakingId === p.id ? 'Playing...' : 'Voice'}</span>
                        </button>

                        <a
                          href={`https://wa.me/${p.whatsapp.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(p.full_name)},%20I%20saw%20your%20profile%20on%20Mopani%20Singles!%20Let's%20connect.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp Connect</span>
                        </a>

                        <button
                          onClick={() => setReportingProfile(p)}
                          className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-all"
                          title="Report Profile"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI COACH & CHAT */}
        {tab === 'ai-coach' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-rose-950/60 via-zinc-900 to-indigo-950/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-600 flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/30 text-white">
                <Bot className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Mopani Matchmaker & Relationship AI</h2>
                <p className="text-zinc-300 text-sm">
                  Powered by Gemini. Get customized icebreakers in Xitsonga or Sepedi, date spot recommendations in Tzaneen and Giyani, and relationship guidance.
                </p>
              </div>
            </div>

            {/* Chat Container */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col h-[600px] overflow-hidden">
              <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm font-bold text-white">AI Coach Online</span>
                </div>
                <button 
                  onClick={() => setChatMessages([{ role: 'model', text: 'Sawubona! How can I assist your love journey in Mopani today?' }])}
                  className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1 bg-zinc-800 px-3 py-1.5 rounded-xl"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Clear Chat</span>
                </button>
              </div>

              {/* Message scroll area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-md ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-br-xs' 
                        : 'bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-bl-xs'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-2xl p-4 text-sm flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                      <span>Mopani Matchmaker is typing advice...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={sendChat} className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Ask for icebreakers, date ideas in Tzaneen, relationship tips..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white p-3 rounded-2xl transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: AI DATE SPOT STUDIO (IMAGE GENERATION) */}
        {tab === 'ai-images' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-rose-950/60 via-zinc-900 to-amber-950/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-600/30 text-white">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">AI Date Spot & Avatar Studio</h2>
                <p className="text-zinc-300 text-sm">
                  Generate stunning romantic date venue concepts in Mopani (Tzaneen Dam, Magoebaskloof, luxury lodges) using gemini-3-pro-image-preview with 1K, 2K, and 4K options.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Generator Form */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
                <form onSubmit={generateImage} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Image Prompt Idea</label>
                    <textarea
                      rows={4}
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-rose-500"
                      placeholder="Describe the romantic date spot or avatar..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Resolution / Size</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['1K', '2K', '4K'] as const).map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setImageSize(sz)}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                            imageSize === sz 
                              ? 'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-600/30' 
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {sz} Quality
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={imageLoading || !imagePrompt.trim()}
                    className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-2"
                  >
                    {imageLoading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Generating AI Concept...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Generate AI Image</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Preview Result */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
                {imageLoading ? (
                  <div className="space-y-4 py-16">
                    <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-zinc-400 text-sm">Crafting your {imageSize} Mopani date spot artwork...</p>
                  </div>
                ) : generatedImageUrl ? (
                  <div className="space-y-4 w-full">
                    <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl h-80 w-full bg-black">
                      <img src={generatedImageUrl} alt="Generated AI Spot" className="w-full h-full object-cover" />
                    </div>
                    <a
                      href={generatedImageUrl}
                      download="mopani-date-spot.jpg"
                      className="inline-block bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all"
                    >
                      Download Image
                    </a>
                  </div>
                ) : (
                  <div className="py-16 space-y-3">
                    <div className="w-16 h-16 bg-zinc-800/80 rounded-2xl flex items-center justify-center mx-auto text-zinc-500">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-300">No Image Generated Yet</h3>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                      Click generate to create breathtaking AI date spots or profile concepts in Mopani.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CREATE PROFILE */}
        {tab === 'create' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-rose-600/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <UserCheck className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-white">Create Your Dating Profile</h2>
                <p className="text-zinc-400 text-sm mt-1">
                  Profiles are reviewed by our admin team before appearing publicly to ensure safety and authenticity.
                </p>
              </div>

              {submitSuccess ? (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-400">Profile Submitted Successfully!</h3>
                  <p className="text-zinc-300 text-sm">
                    Your profile is now pending admin approval. Once approved by our team, it will be visible on the Discover feed.
                  </p>
                  <button
                    onClick={() => { setSubmitSuccess(false); setTab('discover'); }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  >
                    Back to Discover
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Risuna Nkuna"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Age *</label>
                      <input
                        type="number"
                        required
                        min={18}
                        max={99}
                        value={formAge}
                        onChange={(e) => setFormAge(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Gender *</label>
                      <select
                        value={formGender}
                        onChange={(e) => setFormGender(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Municipality *</label>
                      <select
                        value={formMunicipality}
                        onChange={(e) => setFormMunicipality(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                      >
                        {MUNICIPALITIES.filter(m => m !== 'All Municipalities').map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Village / Town *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Giyani Section D, Lenyenye..."
                        value={formVillage}
                        onChange={(e) => setFormVillage(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Intention *</label>
                      <select
                        value={formIntention}
                        onChange={(e) => setFormIntention(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                      >
                        {INTENTIONS.filter(i => i !== 'All Intentions').map(i => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Primary Language *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Xitsonga / English"
                        value={formLanguage}
                        onChange={(e) => setFormLanguage(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">WhatsApp Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. +27 72 345 6789"
                        value={formWhatsapp}
                        onChange={(e) => setFormWhatsapp(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Profile Photo URL (Unsplash or direct image link)</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... (leave blank for automatic)"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Bio / About Me *</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Share your hobbies, work, what you are looking for..."
                      value={formBio}
                      onChange={(e) => setFormBio(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-2"
                  >
                    <span>Submit Profile for Approval</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ADMIN PORTAL */}
        {tab === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {!adminAuth ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md mx-auto shadow-2xl text-center space-y-5">
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Admin Login</h2>
                  <p className="text-zinc-400 text-sm mt-1">Enter password to manage pending profiles & reports</p>
                </div>
                <div className="space-y-4">
                  <input
                    type="password"
                    placeholder="Password (MopaniAdmin2026!)"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                  <button
                    onClick={handleAdminLogin}
                    className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-xl transition-all"
                  >
                    Login to Admin Panel
                  </button>
                  <p className="text-xs text-zinc-500">Default Password: MopaniAdmin2026!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex items-center justify-between shadow-xl">
                  <div>
                    <h2 className="text-2xl font-black text-white">Mopani Singles - Admin Control</h2>
                    <p className="text-sm text-zinc-400 mt-1">
                      {adminProfiles.filter(p => !p.is_approved && !p.is_banned).length} pending approval | {adminReports.length} reports
                    </p>
                  </div>
                  <button
                    onClick={() => setAdminAuth(false)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>

                {/* Pending & All Profiles */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">Profiles Management</h3>
                  {adminLoading ? (
                    <p className="text-zinc-400">Loading admin data...</p>
                  ) : adminProfiles.length === 0 ? (
                    <p className="text-zinc-400">No profiles found.</p>
                  ) : (
                    <div className="grid gap-4">
                      {adminProfiles.map(p => (
                        <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex items-start space-x-4">
                            <img src={p.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-bold text-white">{p.full_name}, {p.age}</h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  p.is_approved ? 'bg-emerald-500/20 text-emerald-400' : p.is_banned ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                  {p.is_approved ? 'Approved' : p.is_banned ? 'Banned' : 'Pending'}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 mt-0.5">{p.village} ({p.municipality}) • {p.intention}</p>
                              <p className="text-xs text-zinc-300 mt-1 line-clamp-2">{p.bio}</p>
                              <p className="text-xs text-emerald-400 mt-1 font-mono">WhatsApp: {p.whatsapp}</p>
                            </div>
                          </div>

                          <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                            {!p.is_approved && (
                              <button
                                onClick={() => performAdminAction(p.id, 'approve')}
                                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                              >
                                Approve
                              </button>
                            )}
                            {!p.is_banned && (
                              <button
                                onClick={() => performAdminAction(p.id, 'ban')}
                                className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                              >
                                Ban
                              </button>
                            )}
                            <button
                              onClick={() => performAdminAction(p.id, 'delete')}
                              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reports Section */}
                <div className="space-y-4 pt-6">
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <span>Member Reports</span>
                  </h3>
                  {adminReports.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-400 text-sm">
                      No active reports. All clear!
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {adminReports.map(r => (
                        <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex justify-between items-center text-sm">
                          <div>
                            <span className="text-red-400 font-bold block">{r.reason}</span>
                            <span className="text-xs text-zinc-500">Reported Profile ID: {r.reported_id} • By {r.reporter}</span>
                          </div>
                          <span className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* REPORT MODAL */}
      {reportingProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <h3 className="text-xl font-bold text-white">Report Profile</h3>
            <p className="text-xs text-zinc-400">
              Report <span className="text-white font-bold">{reportingProfile.full_name}</span> for inappropriate behavior, fake photos, or scams.
            </p>

            {reportSubmitted ? (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-center text-emerald-400 text-sm font-semibold">
                Report submitted successfully. Thank you for keeping Mopani Singles safe!
              </div>
            ) : (
              <form onSubmit={submitReport} className="space-y-4">
                <textarea
                  rows={4}
                  required
                  placeholder="Reason for report (e.g. fake profile, scam, harassment)..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500"
                />
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setReportingProfile(null)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold transition-all"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-8 mt-12 text-center text-xs text-zinc-500 space-y-2">
        <p>© 2026 Mopani Singles. Connecting Hearts in Greater Giyani, Greater Tzaneen, Ba-Phalaborwa, Greater Letaba & Maruleng.</p>
        <p>Built with Google AI Studio & Gemini API.</p>
      </footer>
    </div>
  );
}
