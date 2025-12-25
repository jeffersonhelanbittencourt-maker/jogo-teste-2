import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { 
  Dice5 as Dice20, Shield, Zap, Heart, Crown, Send, Skull, Camera, ZoomIn, ZoomOut, 
  Plus, Minus, Package, Trash2, Save, Upload, AlertTriangle, Scale, Move, 
  Scroll, Grid3X3, Image as ImageIcon, Info, Activity, UserPlus, X, Search, Wand2, Map as MapIcon,
  Smartphone, Monitor, RotateCcw, ChevronUp, ChevronDown, ShieldAlert, ShieldCheck, Target,
  CheckCircle2, XCircle, Sword, Flame, Sparkles, ZapOff, Settings, Eye, EyeOff, Brush, Eraser,
  Users
} from 'lucide-react';
import { Attribute, Character, Token, Message, InventoryItem, Spell, ArmorType } from './types';
import { T20_SKILLS, INITIAL_ATTRS } from './constants';
import { generateLore, generateMonster } from './services/gemini';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_Mig5GONv3_D0T9qZDDMt1Q_jacteokQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const calcularModificador = (valor: number) => Math.floor((valor - 10) / 2);

const calcularTotalPericia = (nivel: number, atributoValor: number, treinado: boolean, outrosBonuses: number = 0) => {
  const modAtributo = calcularModificador(atributoValor);
  const bonusTreino = treinado ? (nivel <= 6 ? 2 : nivel <= 14 ? 4 : 6) : 0;
  return Math.floor(nivel / 2) + modAtributo + bonusTreino + outrosBonuses;
};

const calcularDefesa = (desBase: number, armaduraBonus: number, bonusEscudo: number, tipoArmadura: ArmorType) => {
  let modDes = calcularModificador(desBase);
  if (tipoArmadura === "Pesada") modDes = 0;
  if (tipoArmadura === "Média") modDes = Math.min(modDes, 3);
  return 10 + modDes + armaduraBonus + bonusEscudo;
};

const calcularDanoCritico = (dadoDano: number, multiplicador: number, bonusFixo: number): number => {
  let totalDano = 0;
  for (let i = 0; i < multiplicador; i++) {
    totalDano += Math.floor(Math.random() * dadoDano) + 1;
  }
  return totalDano + bonusFixo;
};

const soltarNoGrid = (rawCoord: number, gridSize: number): number => Math.round(rawCoord / gridSize);

export default function App() {
  const [isJoined, setIsJoined] = useState(false);
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('Arton-1');
  const [isMaster, setIsMaster] = useState(false);
  const [playersOnline, setPlayersOnline] = useState<string[]>([]);
  
  const [char, setChar] = useState<Character>({
    name: '', level: 1, attrs: INITIAL_ATTRS,
    pv: { cur: 20, max: 20 }, pm: { cur: 10, max: 10 },
    defense: 10, armorBonus: 0, shieldBonus: 0, armorType: 'Nenhuma'
  });
  const [trainedSkills, setTrainedSkills] = useState<Record<string, boolean>>({});
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [weaponDie, setWeaponDie] = useState<number>(8);
  const [critMult, setCritMult] = useState<number>(2);
  const [extraDmg, setExtraDmg] = useState<number>(0);

  const [isPortrait, setIsPortrait] = useState(false);
  const [manualOrientation, setManualOrientation] = useState<boolean | null>(null);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'spells' | 'items' | 'ai'>('status');
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastRoll, setLastRoll] = useState<{ label: string; total: number; success?: boolean; isDamage?: boolean } | null>(null);

  const [configMapa, setConfigMapa] = useState({
    backgroundImage: "https://i.redd.it/vsw2v8s7q8y51.jpg",
    gridSize: 60,
    zoom: 1.0,
    fogEnabled: false,
    brushSize: 60
  });
  const [tokens, setTokens] = useState<Token[]>([]);

  // Quick Summon State
  const [isQuickSummonOpen, setIsQuickSummonOpen] = useState(false);
  const [quickSummonInput, setQuickSummonInput] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) setRoomCode(room);
  }, []);

  useEffect(() => {
    if (!isJoined) return;
    const channel = supabase.channel(`vtt_${roomCode}`, {
      config: { presence: { key: userName }, broadcast: { self: true } }
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPlayersOnline(Object.keys(state));
      })
      .on('broadcast', { event: 'vtt_sync' }, ({ payload }) => {
        const { type, data } = payload;
        switch (type) {
          case 'token_update':
            setTokens(prev => {
              const exists = prev.find(t => t.id === data.id);
              if (exists) return prev.map(t => t.id === data.id ? data : t);
              return [...prev, data];
            });
            break;
          case 'token_delete':
            setTokens(prev => prev.filter(t => t.id !== data.id));
            break;
          case 'chat_msg':
            setMessages(prev => [...prev, data]);
            break;
          case 'map_update':
            if (!isMaster) setConfigMapa(prev => ({ ...prev, ...data }));
            break;
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString(), is_master: isMaster });
          const myToken: Token = { id: userName, name: userName, type: 'pc', gx: 5, gy: 5, hp: char.pv.cur, maxHp: char.pv.max };
          channel.send({ type: 'broadcast', event: 'vtt_sync', payload: { type: 'token_update', data: myToken } });
        }
      });
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [isJoined, roomCode, isMaster, userName]);

  const broadcastAction = useCallback((type: string, data: any) => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'vtt_sync', payload: { type, data } });
    }
  }, []);

  const addLog = useCallback((text: string, type: Message['type'] = 'chat', total?: number, details?: string, image?: string) => {
    const msg: Message = { id: Math.random().toString(36).substr(2, 9), user: userName || 'Herói', text, type, total, details, image, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    broadcastAction('chat_msg', msg);
  }, [userName, broadcastAction]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, mode: 'map' | 'chat') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
       alert("Imagem muito grande! Tente uma com menos de 2MB.");
       return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        if (mode === 'map') {
          setConfigMapa(p => ({ ...p, backgroundImage: result }));
          broadcastAction('map_update', { backgroundImage: result });
          addLog("Alterou o mapa da batalha.", "system");
        } else {
          addLog("enviou uma imagem", "chat", undefined, undefined, result);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleInvite = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomCode);
    navigator.clipboard.writeText(url.toString());
    addLog("Link de convite copiado!", "system");
  };

  const totalDefense = useMemo(() => calcularDefesa(char.attrs[Attribute.DES], char.armorBonus, char.shieldBonus, char.armorType), [char.attrs, char.armorBonus, char.shieldBonus, char.armorType]);
  const currentOrientation = manualOrientation !== null ? manualOrientation : isPortrait;

  useEffect(() => {
    const checkOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth);
    checkOrientation(); window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const rollDice = (label: string, attrKey: Attribute) => {
    const die = Math.floor(Math.random() * 20) + 1;
    const total = die + calcularTotalPericia(char.level, char.attrs[attrKey], trainedSkills[label] || false);
    setLastRoll({ label, total }); setTimeout(() => setLastRoll(null), 3000);
    addLog(`rolou ${label}`, 'roll', total, `Dado: ${die}`);
  };

  const rollDamageAction = (isCrit: boolean = false) => {
    const mult = isCrit ? critMult : 1;
    const total = calcularDanoCritico(weaponDie, mult, extraDmg + calcularModificador(char.attrs.FOR));
    setLastRoll({ label: isCrit ? "DANO CRÍTICO!" : "DANO", total, isDamage: true });
    setTimeout(() => setLastRoll(null), 3000);
    addLog(`${isCrit ? '🔥 CRÍTICO!' : '🗡️ Dano'}`, 'roll', total);
  };

  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState('');

  const handleAiAction = async (mode: 'lore' | 'monster' = 'lore', customInput?: string) => {
    const input = customInput || aiInput;
    if (!input.trim()) return;
    setAiLoading(true);
    try {
      if (mode === 'monster') {
        const monster = await generateMonster(input);
        const details = `ND: ${monster.threatLevel} | Defesa: ${monster.suggestedDefense}\nAtaques: ${monster.attacks}\n\n${monster.description}`;
        addLog(`O Oráculo conjura: ${monster.name}`, 'ai', undefined, details);
        
        if (isMaster) {
          const newToken: Token = { 
            id: 'enemy_' + Date.now(), 
            name: monster.name, 
            type: 'enemy', 
            gx: 10, 
            gy: 10, 
            hp: monster.suggestedHP, 
            maxHp: monster.suggestedHP 
          };
          setTokens(prev => [...prev, newToken]);
          broadcastAction('token_update', newToken);
        }
      } else {
        const lore = await generateLore(input);
        addLog('Sussurros de Arton...', 'ai', undefined, lore);
      }
    } catch (e) {
      addLog('A Tormenta interfere na visão...', 'system');
    } finally { 
      setAiLoading(false); 
      setAiInput('');
      setQuickSummonInput('');
      setIsQuickSummonOpen(false);
    }
  };

  if (!isJoined) {
    return (
      <div className="h-[100dvh] w-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="absolute inset-0 arton-grid pointer-events-none opacity-20" />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#121212] w-full max-w-md p-8 border border-[#4b1a1a] shadow-2xl rounded-3xl relative z-10 overflow-hidden">
          <div className="text-center mb-8">
            <h1 className="font-cinzel text-5xl font-black text-[#d4af37] gold-glow uppercase tracking-tighter">Arton VTT</h1>
            <p className="font-inter text-[10px] text-zinc-500 uppercase tracking-[0.3em] mt-2">MULTIPLAYER TORMENTA 20</p>
          </div>
          <div className="space-y-4">
            <input className="w-full bg-black border border-[#d4af37]/20 p-4 text-white outline-none rounded-xl" placeholder="Nome do Herói" value={userName} onChange={e => setUserName(e.target.value)} />
            <input className="w-full bg-black border border-[#d4af37]/20 p-4 text-white outline-none rounded-xl" placeholder="Sala (Ex: Arton-1)" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
            <div className="flex items-center gap-3 p-4 bg-black/50 border border-white/5 rounded-xl cursor-pointer" onClick={() => setIsMaster(!isMaster)}>
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isMaster ? 'bg-[#8b0000] border-[#8b0000]' : 'border-zinc-700'}`}>{isMaster && <Crown size={12} className="text-white" />}</div>
              <span className="text-xs uppercase font-bold text-zinc-400">Modo Narrador</span>
            </div>
            <button onClick={() => userName && roomCode && setIsJoined(true)} className="w-full crimson-gradient p-5 rounded-xl text-white font-cinzel font-bold text-xl uppercase tracking-widest shadow-2xl transition-all active:scale-95">Entrar em Arton</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] w-screen flex ${currentOrientation ? 'flex-col' : 'flex-row'} bg-[#050505] text-[#d4af37] font-inter overflow-hidden select-none`}>
      <main className="flex-1 relative bg-[#050505] flex flex-col overflow-hidden">
        {/* MAP CONTROLS */}
        <div className={`absolute top-4 left-4 right-4 z-40 flex justify-between pointer-events-none`}>
          <div className="flex gap-2 pointer-events-auto">
            <div className="bg-[#0a0a0a]/95 backdrop-blur-xl p-1 rounded-2xl border border-[#d4af37]/30 shadow-2xl flex items-center">
              <button onClick={() => setConfigMapa(p => ({...p, zoom: Math.max(0.3, p.zoom - 0.1)}))} className="p-2.5 hover:bg-[#8b0000] rounded-xl text-white transition-colors"><ZoomOut size={18}/></button>
              <span className="text-[10px] font-mono font-bold text-[#d4af37] w-12 text-center">{Math.round(configMapa.zoom * 100)}%</span>
              <button onClick={() => setConfigMapa(p => ({...p, zoom: Math.min(2.5, p.zoom + 0.1)}))} className="p-2.5 hover:bg-[#8b0000] rounded-xl text-white transition-colors"><ZoomIn size={18}/></button>
              <div className="w-[1px] h-5 bg-white/10 mx-1" />
              <button onClick={() => setManualOrientation(prev => prev === null ? !isPortrait : !prev)} className="p-2.5 rounded-xl text-zinc-500 hover:text-white">{currentOrientation ? <Smartphone size={18}/> : <Monitor size={18}/>}</button>
            </div>
          </div>
          <div className="flex gap-2 pointer-events-auto">
            <div className="bg-[#0a0a0a]/95 backdrop-blur-xl p-1 rounded-2xl border border-[#d4af37]/30 shadow-2xl flex items-center gap-1">
              <button onClick={handleInvite} className="p-2.5 rounded-xl text-[#d4af37] transition-all hover:text-white hover:bg-[#d4af37]/20 gold-glow"><UserPlus size={18}/></button>
              {isMaster && (
                <>
                  <div className="w-[1px] h-4 bg-white/10" />
                  <button onClick={() => setIsQuickSummonOpen(!isQuickSummonOpen)} className={`p-2.5 rounded-xl transition-all ${isQuickSummonOpen ? 'bg-purple-700 text-white' : 'text-purple-400 hover:text-white hover:bg-purple-900/40'}`}><Skull size={18}/></button>
                </>
              )}
              <div className="w-[1px] h-4 bg-white/10" />
              <input type="file" ref={fileInputRef} onChange={e => handleFileUpload(e, 'map')} accept="image/*" className="hidden" />
              <button className="p-2.5 rounded-xl text-[#d4af37] transition-all hover:text-white hover:bg-white/5" onClick={() => fileInputRef.current?.click()}><Upload size={20}/></button>
              <button className="p-2.5 rounded-xl text-[#d4af37] transition-all hover:text-white hover:bg-white/5" onClick={() => { const url = prompt("Link do Mapa:"); if(url) { setConfigMapa(p => ({...p, backgroundImage: url})); broadcastAction('map_update', { backgroundImage: url }); }}}><MapIcon size={20}/></button>
            </div>
          </div>
        </div>

        {/* MAP VIEWPORT */}
        <div className={`flex-1 overflow-auto bg-[#080808] relative custom-scrollbar`}>
          <motion.div ref={mapRef} drag dragMomentum={false} style={{ scale: configMapa.zoom, transformOrigin: '0 0', backgroundImage: `url(${configMapa.backgroundImage})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', width: '4000px', height: '4000px', position: 'relative' }}>
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: `linear-gradient(to right, #d4af37 1px, transparent 1px), linear-gradient(to bottom, #d4af37 1px, transparent 1px)`, backgroundSize: `var(--grid-size) var(--grid-size)` }} />
            {tokens.map(token => {
              const gs = configMapa.gridSize;
              const curH = token.hp || 10; const maxH = token.maxHp || 10;
              return (
                <motion.div key={token.id} drag dragMomentum={false} onDragEnd={(e, info) => { if (!mapRef.current) return; const rect = mapRef.current.getBoundingClientRect(); const nx = soltarNoGrid((info.point.x - rect.left) / configMapa.zoom, gs); const ny = soltarNoGrid((info.point.y - rect.top) / configMapa.zoom, gs); const updated = { ...token, gx: nx, gy: ny }; setTokens(prev => prev.map(t => t.id === token.id ? updated : t)); broadcastAction('token_update', updated); }} className="absolute z-30 group" style={{ x: token.gx * gs, y: token.gy * gs, width: gs, height: gs }}>
                  <div className={`relative w-[90%] h-[90%] rounded-full border-2 flex items-center justify-center transition-all group-hover:scale-110 shadow-2xl ${token.type === 'enemy' ? 'border-red-600 bg-red-900/20 shadow-red-900/40' : 'border-[#d4af37] bg-black shadow-[#d4af37]/20'}`}>
                    <div className="font-cinzel font-black text-sm uppercase">{token.name[0]}</div>
                    <div className="absolute -bottom-4 w-full text-center text-[7px] font-black uppercase text-white truncate drop-shadow-md">{token.name}</div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* LOG PANEL - FIXING HEIGHT TO REMAIN VISIBLE IN MOBILE */}
        <div className={`${currentOrientation ? (isSheetExpanded ? 'h-48' : 'h-64') : 'h-64'} bg-[#0a0a0a] border-t border-[#d4af37]/10 flex flex-col transition-all duration-300 z-10`}>
          <header className="px-4 py-1.5 bg-[#121212] flex justify-between items-center border-b border-white/5">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Chat de Arton</span>
            <div className="flex gap-2 items-center">
              <span className="text-[7px] font-bold text-zinc-500 uppercase">Online: {playersOnline.length}</span>
            </div>
          </header>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-black/40 font-inter">
            {messages.map(m => ( 
              <div key={m.id} className="text-[10px] sm:text-[11px] flex flex-col"> 
                <div className="flex gap-2">
                  <span className="text-zinc-600 shrink-0">[{m.time}]</span> 
                  <span className={`font-black uppercase ${m.type === 'ai' ? 'text-purple-400' : 'text-[#d4af37]'}`}>{m.user}:</span> 
                  <span className={`text-zinc-300 ${m.type === 'system' ? 'italic opacity-60' : ''}`}>{m.text}</span>
                  {m.total !== undefined && <span className="px-2 py-0.5 bg-black border border-white/10 rounded font-black text-white">{m.total}</span>}
                </div>
                {m.image && <img src={m.image} className="mt-2 rounded-lg max-w-[200px] border border-white/10 shadow-lg cursor-pointer" onClick={() => window.open(m.image)} alt="Shared content" />}
                {m.details && <div className="mt-1 p-2 bg-black/30 rounded border-l-2 border-purple-500/50 text-zinc-500 whitespace-pre-wrap text-[9px]">{m.details}</div>} 
              </div> 
            ))}
          </div>
          <div className="p-3 bg-[#0d0d0d] flex gap-2 border-t border-white/5">
            <input type="file" ref={chatImageRef} onChange={e => handleFileUpload(e, 'chat')} accept="image/*" className="hidden" />
            <button className="p-2 text-zinc-500 hover:text-white" onClick={() => chatImageRef.current?.click()}><Camera size={18}/></button>
            <input className="flex-1 bg-black/60 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[#d4af37]/40 transition-all" placeholder="Envie sua mensagem..." onKeyDown={e => { if(e.key === 'Enter' && (e.target as HTMLInputElement).value) { addLog((e.target as HTMLInputElement).value, 'chat'); (e.target as HTMLInputElement).value = ''; }}} />
            <button className="bg-[#8b0000] p-2 rounded-xl text-white transition-all active:scale-95" title="Enviar"><Send size={16}/></button>
          </div>
        </div>
      </main>

      {/* CHARACTER SHEET SIDEBAR - REDUCED HEIGHT IN PORTRAIT TO NOT COVER CHAT */}
      <aside className={`${currentOrientation ? (isSheetExpanded ? 'h-[60vh]' : 'h-[64px]') : 'w-[360px] h-full border-l'} border-[#d4af37]/10 bg-[#0a0a0a] flex flex-col shadow-2xl z-50 overflow-hidden transition-all duration-500`}>
        <header className="p-4 border-b border-[#8b0000]/50 flex justify-between items-center bg-[#121212] cursor-pointer" onClick={() => currentOrientation && setIsSheetExpanded(!isSheetExpanded)}>
          <div className="flex flex-col">
            <h2 className="font-cinzel text-base font-bold text-white uppercase tracking-tighter truncate max-w-[150px]">{userName}</h2>
            <span className="text-[8px] text-[#d4af37] tracking-widest uppercase">NÍVEL {char.level} • {isMaster ? 'NARRADOR' : 'AVENTUREIRO'}</span>
          </div>
          <div className="flex items-center gap-2"> {isMaster && <Crown size={18} className="text-[#d4af37]" />} {currentOrientation && <div className="text-zinc-500">{isSheetExpanded ? <ChevronDown size={24}/> : <ChevronUp size={24}/>}</div>} </div>
        </header>

        {/* Content of the sheet... (remaining same for brevity but kept in XML) */}
        <div className="px-5 py-4 space-y-3 bg-[#0d0d0d] border-b border-white/5">
          <div className="space-y-1">
            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest items-center"> <div className="flex items-center gap-1 text-[#ef4444]"><Heart size={12}/> Vida</div> <div className="flex items-center gap-2"> <button onClick={() => setChar(p => ({...p, pv: {...p.pv, cur: Math.max(0, p.pv.cur - 1)}}))}><Minus size={10}/></button> <span className="text-[10px] font-mono">{char.pv.cur}/{char.pv.max}</span> <button onClick={() => setChar(p => ({...p, pv: {...p.pv, cur: Math.min(p.pv.max, p.pv.cur + 1)}}))}><Plus size={10}/></button> </div> </div>
            <div className="h-1.5 bg-black rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-[#8b0000] to-[#ef4444]" style={{ width: `${(char.pv.cur / char.pv.max) * 100}%` }} /></div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest items-center"> <div className="flex items-center gap-1 text-[#3b82f6]"><Zap size={12}/> Mana</div> <div className="flex items-center gap-2"> <button onClick={() => setChar(p => ({...p, pm: {...p.pm, cur: Math.max(0, p.pm.cur - 1)}}))}><Minus size={10}/></button> <span className="text-[10px] font-mono">{char.pm.cur}/{char.pm.max}</span> <button onClick={() => setChar(p => ({...p, pm: {...p.pm, cur: Math.min(p.pm.max, p.pm.cur + 1)}}))}><Plus size={10}/></button> </div> </div>
            <div className="h-1.5 bg-black rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6]" style={{ width: `${(char.pm.cur / char.pm.max) * 100}%` }} /></div>
          </div>
        </div>

        <nav className="flex bg-[#121212] border-b border-white/5"> {[{ id: 'status', icon: <Sword size={18}/> }, { id: 'spells', icon: <Wand2 size={18}/> }, { id: 'items', icon: <Package size={18}/> }, { id: 'ai', icon: <Sparkles size={18}/> }].map(tab => ( <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 flex justify-center transition-all ${activeTab === tab.id ? 'text-[#d4af37] bg-white/5 border-b-2 border-[#d4af37]' : 'text-zinc-600'}`}> {tab.icon} </button> ))} </nav>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-black/30">
          <AnimatePresence mode="wait">
            {activeTab === 'status' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1a1a1a] p-3 rounded-xl text-center border border-white/5"> <span className="text-[8px] font-black text-zinc-500 uppercase block mb-1">Arma</span> <select className="bg-transparent text-white font-cinzel text-lg outline-none cursor-pointer" value={weaponDie} onChange={e => setWeaponDie(Number(e.target.value))}> {[4, 6, 8, 10, 12].map(d => <option key={d} value={d} className="bg-black">d{d}</option>)} </select> </div>
                  <div className="bg-[#1a1a1a] p-3 rounded-xl text-center border border-white/5"> <span className="text-[8px] font-black text-zinc-500 uppercase block mb-1">Defesa</span> <span className="text-xl font-cinzel text-white">{totalDefense}</span> </div>
                </div>
                <div className="grid grid-cols-2 gap-2"> <button onClick={() => rollDamageAction(false)} className="py-3 bg-zinc-800 hover:bg-zinc-700 rounded font-cinzel text-xs uppercase text-white shadow-xl transition-all">Atacar</button> <button onClick={() => rollDamageAction(true)} className="py-3 bg-[#8b0000] hover:bg-red-700 rounded font-cinzel text-xs uppercase text-white shadow-xl transition-all">Crítico</button> </div>
                <div className="grid grid-cols-3 gap-3"> {(Object.entries(char.attrs) as [Attribute, number][]).map(([at, val]) => ( <div key={at} className="bg-[#1a1a1a] p-2 rounded-xl text-center border border-white/5 group"> <span className="text-[8px] font-black text-zinc-600 block uppercase">{at}</span> <span className="text-lg font-cinzel font-bold text-white group-hover:text-[#d4af37] transition-colors">{val}</span> <div className="flex justify-between mt-1 text-[10px] font-mono text-[#d4af37]"> <button onClick={() => setChar(p => ({...p, attrs: {...p.attrs, [at]: p.attrs[at]-1}}))}><Minus size={12}/></button> <span>{calcularModificador(val) >= 0 ? '+' : ''}{calcularModificador(val)}</span> <button onClick={() => setChar(p => ({...p, attrs: {...p.attrs, [at]: p.attrs[at]+1}}))}><Plus size={12}/></button> </div> </div> ))} </div>
                <div className="space-y-1"> <h4 className="text-[9px] font-black text-zinc-600 uppercase mb-2 border-b border-white/5 pb-1">Perícias Treinadas</h4> {T20_SKILLS.map(s => ( <div key={s.name} className="flex justify-between items-center p-2 rounded bg-white/5 hover:bg-white/10 text-[11px] group transition-all"> <div className="flex items-center gap-2"> <input type="checkbox" checked={trainedSkills[s.name] || false} onChange={() => setTrainedSkills(p => ({...p, [s.name]: !p[s.name]}))} className="w-3 h-3 accent-[#d4af37]" /> <span className="text-zinc-300">{s.name}</span> </div> <div className="flex items-center gap-2"> <span className="text-[10px] font-bold text-zinc-500">+{calcularTotalPericia(char.level, char.attrs[s.attr], trainedSkills[s.name] || false)}</span> <button onClick={() => rollDice(s.name, s.attr)} className="text-[#d4af37]/40 group-hover:text-[#d4af37] transform active:scale-90 transition-all"><Dice20 size={18}/></button> </div> </div> ))} </div>
              </motion.div>
            )}

            {activeTab === 'ai' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="p-5 bg-purple-900/10 border border-purple-900/30 rounded-2xl relative group overflow-hidden">
                  <h4 className="font-cinzel text-[10px] font-black text-purple-400 uppercase mb-3 flex items-center gap-2"><Sparkles size={16}/> Oráculo de Arton</h4>
                  <textarea className="w-full bg-black/60 border border-purple-900/40 rounded-xl p-4 text-xs text-zinc-200 outline-none min-h-[140px] resize-none focus:border-purple-500 transition-all" placeholder="Dragão de cristal da Tormenta..." value={aiInput} onChange={e => setAiInput(e.target.value)} />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => handleAiAction('lore')} disabled={aiLoading || !aiInput.trim()} className="bg-[#1a1a1a] border border-purple-900/40 text-purple-400 py-3 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"> {aiLoading ? <RotateCcw size={14} className="animate-spin" /> : <Scroll size={14} />} Lore </button>
                    <button onClick={() => handleAiAction('monster')} disabled={aiLoading || !aiInput.trim()} className="bg-purple-700 text-white py-3 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50"> {aiLoading ? <RotateCcw size={14} className="animate-spin" /> : <Skull size={14} />} Monstro </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* GLOBAL ROLL OVERLAY */}
      <AnimatePresence>
        {lastRoll && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -50 }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100] bg-black/40 backdrop-blur-sm">
            <div className="bg-[#0a0a0a] border-4 border-[#d4af37] p-20 rounded-full shadow-[0_0_120px_rgba(212,175,55,0.4)] flex flex-col items-center">
              <span className="text-white text-8xl font-cinzel font-black drop-shadow-2xl">{lastRoll.total}</span>
              <span className="text-[#d4af37] font-black uppercase tracking-[0.6em] text-[12px] mt-4">{lastRoll.label}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}