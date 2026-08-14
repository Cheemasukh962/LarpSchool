/* ================================================================
   LARP EXO GAME — Full Design Source
   ================================================================
   1 file · drop into any React + Tailwind project

   DEPENDENCIES
   ------------
   npm install lucide-react
   (Tailwind CSS must already be set up)

   FONTS — add to <head> or @import in your CSS:
   -----------------------------------------------
   https://fonts.googleapis.com/css2?family=Press+Start+2P
     &family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700
     &display=swap

   USAGE
   -----
   import { LarpBattleFlow } from './LarpBattleFlow';
   // Wrap in a 390×910 container for the mobile preview size:
   <div style={{ width:390, height:910, overflow:'hidden' }}>
     <LarpBattleFlow />
   </div>

   SCREENS INCLUDED
   ----------------
   · Cover / splash  (PRESS START)
   · Battles tab  →  type-select  →  LARP Battle flow
   · YC Company Trivia  (8 questions, earn +1 token on correct)
   · Rewards tab  →  Fortune Slots  →  Loot Chest (CS:GO reel)
   · Store / Inventory tab
================================================================ */

import { useState, useEffect, useRef, useCallback } from "react";
import { Swords, Gift, ShoppingBag, Coins, RotateCcw, ChevronRight, Check, Shuffle, Zap, Package, Star } from "lucide-react";

/* ════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
type Screen    = "cover" | "app";
type Tab       = "battles" | "rewards" | "store";
type BattleStep = "type-select" | "enter" | "profile" | "challenger-select" | "pick" | "faceoff" | "result" | "trivia";
type RewardView = "hub" | "slots" | "chest";
type Rarity    = "common" | "uncommon" | "rare" | "epic" | "legendary";

/* ════════════════════════════════════════════════════════════════
   SLOT SYMBOLS
═══════════════════════════════════════════════════════════════ */
interface SlotSymbol { id: string; icon: string; name: string; mult: number; prob: number; color: string; }

const SLOT_SYMBOLS: SlotSymbol[] = [
  { id:"jester", icon:"🃏", name:"JESTER", mult:2,  prob:38, color:"#888888" },
  { id:"sword",  icon:"⚔️", name:"SWORD",  mult:3,  prob:28, color:"#4a9eff" },
  { id:"shield", icon:"🛡️", name:"SHIELD", mult:5,  prob:18, color:"#a855f7" },
  { id:"crown",  icon:"👑", name:"CROWN",  mult:10, prob:12, color:"#ec4899" },
  { id:"star",   icon:"⭐", name:"STAR",   mult:0,  prob:4,  color:"#ffd700" },
];

function pickSymbol(): SlotSymbol {
  let r = Math.random() * 100;
  for (const s of SLOT_SYMBOLS) { r -= s.prob; if (r <= 0) return s; }
  return SLOT_SYMBOLS[0];
}

/* ════════════════════════════════════════════════════════════════
   CHEST ITEMS
═══════════════════════════════════════════════════════════════ */
interface ChestItem { id: number; name: string; icon: string; rarity: Rarity; border: string; bg: string; glow: string; }

const CHEST_ITEMS: ChestItem[] = [
  { id:1,  name:"PEASANT SCROLL", icon:"📜", rarity:"common",    border:"#666",    bg:"#111",    glow:"#66666633" },
  { id:2,  name:"WOODEN SWORD",   icon:"🗡️", rarity:"common",    border:"#666",    bg:"#111",    glow:"#66666633" },
  { id:3,  name:"LEATHER CAP",    icon:"🪖", rarity:"common",    border:"#666",    bg:"#111",    glow:"#66666633" },
  { id:4,  name:"TAVERN COIN",    icon:"🪙", rarity:"common",    border:"#666",    bg:"#111",    glow:"#66666633" },
  { id:5,  name:"ROPE & HOOK",    icon:"🪝", rarity:"common",    border:"#666",    bg:"#111",    glow:"#66666633" },
  { id:6,  name:"SILVER DAGGER",  icon:"⚔️", rarity:"uncommon",  border:"#4a9eff", bg:"#05111f", glow:"#4a9eff44" },
  { id:7,  name:"MAGIC MAP",      icon:"🗺️", rarity:"uncommon",  border:"#4a9eff", bg:"#05111f", glow:"#4a9eff44" },
  { id:8,  name:"ENCHANT WAND",   icon:"🪄", rarity:"uncommon",  border:"#4a9eff", bg:"#05111f", glow:"#4a9eff44" },
  { id:9,  name:"SHADOW CLOAK",   icon:"🦇", rarity:"rare",      border:"#a855f7", bg:"#0e0518", glow:"#a855f755" },
  { id:10, name:"DRAGON EGG",     icon:"🥚", rarity:"rare",      border:"#a855f7", bg:"#0e0518", glow:"#a855f755" },
  { id:11, name:"ARCANE TOME",    icon:"📕", rarity:"rare",      border:"#a855f7", bg:"#0e0518", glow:"#a855f755" },
  { id:12, name:"VOID CRYSTAL",   icon:"💎", rarity:"epic",      border:"#ec4899", bg:"#1a0511", glow:"#ec489966" },
  { id:13, name:"PHOENIX PLUME",  icon:"🔥", rarity:"epic",      border:"#ec4899", bg:"#1a0511", glow:"#ec489966" },
  { id:14, name:"CHAOS SHARD",    icon:"⚡", rarity:"epic",      border:"#ec4899", bg:"#1a0511", glow:"#ec489966" },
  { id:15, name:"CROWN OF REALM", icon:"👑", rarity:"legendary", border:"#ffd700", bg:"#140d00", glow:"#ffd70077" },
  { id:16, name:"DRAGON HEART",   icon:"❤️‍🔥", rarity:"legendary", border:"#ffd700", bg:"#140d00", glow:"#ffd70077" },
];

const RARITY_WEIGHTS: Record<Rarity, number> = { common:50, uncommon:28, rare:14, epic:6, legendary:2 };

function weightedChestItem(): ChestItem {
  const total = Object.values(RARITY_WEIGHTS).reduce((a,b)=>a+b,0);
  let r = Math.random()*total;
  for (const [rar, w] of Object.entries(RARITY_WEIGHTS) as [Rarity,number][]) {
    r -= w; if (r<=0) { const pool=CHEST_ITEMS.filter(i=>i.rarity===rar); return pool[~~(Math.random()*pool.length)]; }
  }
  return CHEST_ITEMS[0];
}

/* chest reel constants */
const REEL_LEN=70, WINNER_IDX=55, ITEM_W=80, ITEM_GAP=6, ITEM_STRIDE=ITEM_W+ITEM_GAP, CONTAINER_W=390;
function buildReel(winner: ChestItem): ChestItem[] {
  const arr=Array.from({length:REEL_LEN},()=>weightedChestItem()); arr[WINNER_IDX]=winner; return arr;
}
function finalTX(jitter=0){ return -((WINNER_IDX*ITEM_STRIDE+ITEM_W/2)-(CONTAINER_W/2)+jitter); }

/* ════════════════════════════════════════════════════════════════
   CHALLENGERS
═══════════════════════════════════════════════════════════════ */
const challengers = [
  { id:1, initials:"MV", gradient:"from-rose-400 to-orange-400",    name:"Mara of the Velvet Quill", company:"Dragon & Partners LLC",   role:"Senior Dragon Negotiator",  tagline:"Closed 14 inter-realm trade deals. Fluent in Wyrmish." },
  { id:2, initials:"IT", gradient:"from-cyan-400 to-blue-600",      name:"Ivo the Clockwork Oracle", company:"Temporal Insights Co.",    role:"VP of Fate Analytics",       tagline:"Predicted 3 cataclysms. Currently in stealth." },
  { id:3, initials:"JV", gradient:"from-lime-400 to-emerald-600",   name:"Juniper Vale",             company:"Greenroot Covenant",       role:"Chief Moss Officer",         tagline:"Grew a sentient forest from seed round to Series B." },
  { id:4, initials:"RX", gradient:"from-violet-400 to-fuchsia-600", name:"Rex of the Iron Carnival", company:"Chaos & Chaos",            role:"Chaos Merchant (Founding)",  tagline:"10x chaos at scale. Disrupting disruption itself." },
  { id:5, initials:"SA", gradient:"from-amber-400 to-red-500",      name:"Selene Ashveil",           company:"Night Court Ventures",     role:"Ambassador-at-Large",        tagline:"Raised $2M in moonlight. 0 dilution. Don't ask how." },
  { id:6, initials:"BO", gradient:"from-teal-400 to-cyan-600",      name:"Baron Orvyn",              company:"The Orvyn Group",          role:"Bureaucratic Sorcerer",      tagline:"Filed 1,200 enchanted forms. Rejected zero." },
  { id:7, initials:"PK", gradient:"from-pink-400 to-purple-600",    name:"Priya Kestrel",            company:"Skybound Syndicate",       role:"Head of Avian Logistics",    tagline:"Scaled a messenger hawk network to 47 kingdoms." },
  { id:8, initials:"DW", gradient:"from-yellow-300 to-orange-500",  name:"Duke Wrenmore",            company:"Wren & Associates",        role:"Artisanal Strategist",       tagline:"Bespoke strategies for the discerning warlord." },
];

/* ════════════════════════════════════════════════════════════════
   YC COMPANY TRIVIA
═══════════════════════════════════════════════════════════════ */
interface TriviaQ {
  company: string; initial: string; color: string; bg: string;
  tagline: string; question: string; options: string[]; correct: number;
}

const YC_TRIVIA: TriviaQ[] = [
  { company:"Stripe",   initial:"S", color:"#635bff", bg:"#0d0c1d",
    tagline:"Online payments infrastructure",
    question:"Stripe was founded by which pair of brothers?",
    options:["Jeff & Mark Bezos","Patrick & John Collison","Brian & Greg Chesky","Ben & Marc Horowitz"],
    correct:1 },
  { company:"Airbnb",   initial:"A", color:"#ff5a5f", bg:"#1a0808",
    tagline:"Home sharing marketplace",
    question:"How did Airbnb's founders raise early money to keep the company alive?",
    options:["Crowdfunding on Kickstarter","Sold limited-edition cereal boxes","Won a startup competition","Angel investor cold email"],
    correct:1 },
  { company:"Dropbox",  initial:"D", color:"#0061ff", bg:"#000d1a",
    tagline:"Cloud file storage",
    question:"What was Dropbox's legendary early growth hack?",
    options:["Free t-shirts at college campuses","Referral program giving free storage","Super Bowl ad in 2008","Partnership with Apple"],
    correct:1 },
  { company:"Twitch",   initial:"T", color:"#9147ff", bg:"#0e0520",
    tagline:"Live game streaming",
    question:"What was Twitch originally called before pivoting to gaming?",
    options:["StreamOn","GameCast","Justin.tv","LiveArc"],
    correct:2 },
  { company:"DoorDash", initial:"D", color:"#ff3008", bg:"#1a0500",
    tagline:"On-demand food delivery",
    question:"Where did DoorDash do its very first delivery test?",
    options:["San Francisco, CA","Austin, TX","Palo Alto, CA","New York, NY"],
    correct:2 },
  { company:"Reddit",   initial:"R", color:"#ff4500", bg:"#1a0800",
    tagline:"The front page of the internet",
    question:"How did Reddit seed its content in the earliest days?",
    options:["Paid writers","Scraped Digg posts","Founders posted under fake accounts","Partnered with blogs"],
    correct:2 },
  { company:"OpenAI",   initial:"O", color:"#10a37f", bg:"#011a14",
    tagline:"AI research & deployment",
    question:"OpenAI was originally founded in 2015 as what type of entity?",
    options:["A public company","A nonprofit","A university spinout","A DARPA project"],
    correct:1 },
  { company:"Coinbase", initial:"C", color:"#0052ff", bg:"#000d1a",
    tagline:"Cryptocurrency exchange",
    question:"Coinbase made history in 2021 by becoming the first major crypto company to do what?",
    options:["Accept PayPal","Go public on Nasdaq","Issue a credit card","Partner with the SEC"],
    correct:1 },
];

function buildProfile(name: string) {
  const seed = name.length % 5;
  return {
    role:    ["Knight-Errant","Lore Keeper","Battle Scribe","Realm Architect","Shadow Consul"][seed],
    company: ["House of the Gilded Quill","Errant & Co.","The Wandering Accord","Liminal Guild HQ","Void Consultancy"][seed],
    tagline: ["Built three empires. Burned two. Learning.","Open to quests. DMs closed (except ravens).","Currently available for freelance heroism.","Narrative-driven. Results-oriented. Lightly cursed.","Ex-lich. Reformed. Available for advisory roles."][seed],
  };
}

/* ════════════════════════════════════════════════════════════════
   SHARED PRIMITIVES
═══════════════════════════════════════════════════════════════ */
const PixelStripe = ({ flip=false }: { flip?: boolean }) => (
  <div className="relative overflow-hidden shrink-0" style={{ transform:flip?"scaleY(-1)":undefined }}>
    <div className="h-1 w-full bg-[#ffd700]" />
    <div className="flex bg-[#120f00]">
      {Array.from({length:49}).map((_,i)=>(
        <div key={i} style={{ width:8, height:8, background:i%3===0?"#ffd700":i%3===1?"#b8860b":"#0a0a0a" }} />
      ))}
    </div>
    <div className="h-px w-full bg-[#ffd700]/20" />
  </div>
);

function PixelBorder({ children, className="", gold=false, style }: { children:React.ReactNode; className?:string; gold?:boolean; style?: React.CSSProperties }) {
  return <div className={`border-2 ${gold?"border-[#ffd700]":"border-[#ffd700]/35"} bg-[#0a0a0a] ${className}`}
    style={{ boxShadow:gold?"4px 4px 0 #b8860b":"2px 2px 0 #b8860b44", ...style }}>{children}</div>;
}

function CircleAvatar({ initials, gradient, size=56 }: { initials:string; gradient?:string; size?:number }) {
  return (
    <div style={{ width:size, height:size }} className="relative shrink-0 rounded-full">
      {gradient
        ? <><div className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient}`}/><div className="absolute inset-0 flex items-center justify-center rounded-full font-mono font-bold text-white" style={{ fontSize:size*.22 }}>{initials}</div></>
        : <><div className="absolute inset-0 rounded-full border-2 border-dashed border-[#ffd700]/40 bg-[#1a1400]"/><div className="absolute inset-0 flex items-center justify-center rounded-full font-mono font-bold text-[#ffd700]/50" style={{ fontSize:size*.22 }}>{initials}</div></>
      }
    </div>
  );
}

function PixelKnight() {
  const sprite = ["___YYYYY__","__YYYYYYY_","__YWWWWYY_","__YWWWWYY_","_KYYYYYYYK","__YYYYYYY_","_YYYYYYYY_","YYYYYYYYYY","_YYYYYYYY_","__YY_YYY__","__YY_YYY__","__WW_WWW__"];
  return <div style={{ imageRendering:"pixelated", filter:"drop-shadow(0 0 12px #ffd70088)" }}>
    {sprite.map((row,i)=><div key={i} className="flex">{row.split("").map((c,j)=>(
      <div key={j} style={{ width:8, height:8, background:c==="Y"?"#ffd700":c==="W"?"#fff":c==="K"?"#111":"transparent" }}/>
    ))}</div>)}
  </div>;
}

function PixelChest({ open }: { open:boolean }) {
  const S=8, col: Record<string,string> = { Y:"#b8860b", G:"#6b4c00", K:"#3a2800", O:"#ffd700" };
  const lid=["YYYYYYYYYYYYYYY","YGGGGGGGGGGGGYY","YYYYYYYYYYYYYYY"];
  const body=["YYYYYYYYYYYYYYY","YGGGKKKKKKKGYYY","YGGGKOOOOKKGYYY","YGGGKOOOOKKGYYY","YGGGKKKKKKKGYYY","YYYYYYYYYYYYYYY","YYYYYYYYYYYYYYY"];
  return (
    <div style={{ imageRendering:"pixelated", filter:"drop-shadow(0 0 16px #ffd70066)" }}>
      <div style={{ transform:open?"translateY(-80%) scaleY(0.6)":"none", transformOrigin:"bottom center", transition:"transform 0.4s ease-out" }}>
        {lid.map((row,i)=><div key={i} className="flex">{row.split("").map((c,j)=>(
          <div key={j} style={{ width:S, height:S, background:col[c]??"transparent" }}/>
        ))}</div>)}
      </div>
      <div>{body.map((row,i)=><div key={i} className="flex">{row.split("").map((c,j)=>(
        <div key={j} style={{ width:S, height:S, background:col[c]??"transparent" }}/>
      ))}</div>)}</div>
    </div>
  );
}

function pxS(size: string): React.CSSProperties { return { fontFamily:"'Press Start 2P',monospace", fontSize:size }; }

/* ════════════════════════════════════════════════════════════════
   BOTTOM NAV
═══════════════════════════════════════════════════════════════ */
function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t:Tab)=>void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id:"battles", label:"BATTLES",  icon:<Swords size={18}/> },
    { id:"rewards", label:"REWARDS",  icon:<Gift size={18}/> },
    { id:"store",   label:"STORE",    icon:<ShoppingBag size={18}/> },
  ];
  return (
    <div className="relative z-30 shrink-0 border-t border-[#ffd700]/20 bg-[#0a0a0a]">
      <div className="flex">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex flex-1 flex-col items-center gap-1 py-3 transition ${tab===t.id?"text-[#ffd700]":"text-white/25 hover:text-white/50"}`}>
            {t.icon}
            <span style={pxS("5px")}>{t.label}</span>
            {tab===t.id && <div className="h-0.5 w-6 bg-[#ffd700]"/>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export function LarpBattleFlow() {
  /* ── global state ── */
  const [screen, setScreen]     = useState<Screen>("cover");
  const [tab, setTab]           = useState<Tab>("battles");
  const [tokens, setTokens]     = useState(3); // start with 3 for demo
  const [jackpot, setJackpot]   = useState(50);
  const [blink, setBlink]       = useState(true);
  const [inventory, setInventory] = useState<Array<ChestItem & { uid: string; equipped: boolean }>>([]);

  /* ── battle state ── */
  const [name, setName]         = useState("");
  const [battleStep, setBattleStep] = useState<BattleStep>("type-select");
  const [challenger, setChallenger] = useState(challengers[0]);
  const [triviaIdx, setTriviaIdx]   = useState(0);
  const [triviaAns, setTriviaAns]   = useState<number|null>(null);

  /* ── slots state ── */
  const [rewardView, setRewardView] = useState<RewardView>("hub");
  const [bet, setBet]           = useState(1);
  const [reels, setReels]       = useState<SlotSymbol[]>([SLOT_SYMBOLS[0], SLOT_SYMBOLS[0], SLOT_SYMBOLS[0]]);
  const [slotPhase, setSlotPhase] = useState<"idle"|"spinning"|"result">("idle");
  const [lastWin, setLastWin]   = useState<number|null>(null);
  const [isJackpot, setIsJackpot] = useState(false);

  /* ── chest state ── */
  const [chestPhase, setChestPhase] = useState<"idle"|"opening"|"spinning"|"reveal">("idle");
  const [chestOpen, setChestOpen]   = useState(false);
  const [reelItems, setReelItems]   = useState<ChestItem[]>([]);
  const [wonItem, setWonItem]       = useState<ChestItem|null>(null);
  const reelRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ const iv=setInterval(()=>setBlink(b=>!b),530); return ()=>clearInterval(iv); },[]);

  const profile = buildProfile(name||"Hero");
  const initials = ((name.split(" ")[0]?.[0]??"?")+(name.split(" ")[1]?.[0]??"")).toUpperCase()||"ME";

  /* ── slot spin ── */
  const spinSlots = useCallback(() => {
    if (slotPhase!=="idle" || tokens<bet) return;
    setTokens(t=>t-bet);
    setJackpot(j=>j+Math.ceil(bet/2)); // jackpot grows
    setSlotPhase("spinning");
    setLastWin(null);
    setIsJackpot(false);

    // spin reels, stop left→right with delays
    const results = [pickSymbol(), pickSymbol(), pickSymbol()];
    const delays = [1200, 2200, 3300];
    const temp = [...SLOT_SYMBOLS];

    let tickId: ReturnType<typeof setInterval>;
    let count = 0;
    tickId = setInterval(()=>{
      count++;
      setReels(cur => [
        count>14 ? results[0] : pickSymbol(),
        count>22 ? results[1] : pickSymbol(),
        count>30 ? results[2] : pickSymbol(),
      ]);
      if (count>30) {
        clearInterval(tickId);
        setReels(results);
        setTimeout(()=>{
          // calculate win
          const [a,b2,c] = results;
          let win = 0;
          let jp = false;
          if (a.id===b2.id && b2.id===c.id) {
            if (a.id==="star") { win=jackpot; jp=true; setJackpot(50); }
            else win = bet * a.mult;
          } else if (a.id===b2.id || b2.id===c.id || a.id===c.id) {
            win = bet; // return bet on pair
          }
          setLastWin(win>0 ? win : 0);
          setIsJackpot(jp);
          if (win>0) setTokens(t=>t+win);
          setSlotPhase("result");
        }, 400);
      }
    }, 80);
  }, [slotPhase, tokens, bet, jackpot]);

  /* ── chest open ── */
  const openChest = useCallback(()=>{
    if (tokens<1 || chestPhase!=="idle") return;
    const winner = weightedChestItem();
    const reel   = buildReel(winner);
    const jitter = (Math.random()-.5)*20;
    setTokens(t=>t-1);
    setWonItem(winner);
    setReelItems(reel);
    setChestPhase("opening");
    setChestOpen(true);
    setTimeout(()=>{
      setChestPhase("spinning");
      if (reelRef.current) {
        reelRef.current.style.transition="none";
        reelRef.current.style.transform="translateX(0px)";
        reelRef.current.getBoundingClientRect();
        reelRef.current.style.transition="transform 5s cubic-bezier(0.05,0,0.18,1)";
        reelRef.current.style.transform=`translateX(${finalTX(jitter)}px)`;
      }
      setTimeout(()=>{
        setChestPhase("reveal");
        if (winner) setInventory(inv=>[...inv, { ...winner, uid:Math.random().toString(36).slice(2), equipped:false }]);
      }, 5200);
    }, 450);
  }, [tokens, chestPhase]);

  const resetChest = ()=>{ setChestPhase("idle"); setChestOpen(false); setWonItem(null); setReelItems([]);
    if(reelRef.current){ reelRef.current.style.transition="none"; reelRef.current.style.transform="translateX(0px)"; } };

  /* ── page shell ── */
  const Shell = ({ children, noNav=false }: { children:React.ReactNode; noNav?:boolean }) => (
    <div className="relative flex min-h-screen flex-col bg-[#0a0a0a] text-white" style={{ fontFamily:"'Space Mono',monospace" }}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.055]"
        style={{ backgroundImage:"linear-gradient(#ffd700 1px,transparent 1px),linear-gradient(90deg,#ffd700 1px,transparent 1px)", backgroundSize:"32px 32px" }}/>
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.13) 2px,rgba(0,0,0,.13) 4px)" }}/>
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">{children}</div>
      {!noNav && screen==="app" && <BottomNav tab={tab} setTab={setTab}/>}
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     COVER
  ═══════════════════════════════════════════════════════════ */
  if (screen==="cover") return (
    <Shell noNav>
      {["top-3 left-3","top-3 right-3","bottom-3 left-3","bottom-3 right-3"].map(pos=>(
        <div key={pos} className={`absolute z-20 text-[#ffd700]/30 pointer-events-none ${pos}`} style={pxS("10px")}>+</div>
      ))}
      <div className="flex flex-1 flex-col items-center justify-between px-6 py-10 text-center">
        <div style={pxS("7px")} className="text-[#ffd700]/50">HI-SCORE &nbsp;<span className="text-white">004800</span></div>
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-32 w-32 rounded-full bg-[#ffd700]/10 blur-2xl"/>
            <div className="absolute h-20 w-20 rounded-full border border-[#ffd700]/20"/>
            <PixelKnight/>
          </div>
          <div className="flex flex-col items-center gap-1">
            {["LARP","EXO","GAME"].map((word,i)=>(
              <div key={word} style={{ ...pxS("clamp(20px,7vw,30px)"), color:i===1?"#fff":"#ffd700",
                textShadow:i===1?"3px 3px 0 #444,5px 5px 0 rgba(0,0,0,.5)":"3px 3px 0 #b8860b,5px 5px 0 rgba(0,0,0,.5)", lineHeight:1.3 }}>
                {word}
              </div>
            ))}
          </div>
          <button onClick={()=>setScreen("app")} className="mt-2 transition active:scale-95"
            style={{ ...pxS("9px"), opacity:blink?1:0, color:"#ffd700", transition:"opacity .1s" }}>
            PRESS START
          </button>
        </div>
        <div style={pxS("6px")} className="text-[#ffffff30] leading-loose">PLAY-ONLY TOKENS<br/>NO CASH VALUE</div>
      </div>
    </Shell>
  );

  /* ════════════════════════════════════════════════════════════
     APP — BATTLES TAB
  ═══════════════════════════════════════════════════════════ */
  const renderBattles = () => {

    /* ── TYPE SELECT ── */
    if (battleStep==="type-select") return (
      <div className="flex flex-1 flex-col px-5 pt-8 pb-5 gap-5 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <div style={pxS("7px")} className="text-[#ffd700]">CHOOSE BATTLE TYPE</div>
          <div style={pxS("5px")} className="text-white/30 leading-loose">PICK YOUR CHALLENGE MODE</div>
        </div>

        {/* LARP BATTLE */}
        <button onClick={()=>setBattleStep("enter")} className="group active:scale-[.98] transition">
          <PixelBorder gold className="w-full">
            <div className="flex flex-col gap-4 bg-[#0a0a0a] p-5 group-hover:bg-[#ffd700]/8 transition">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-[#ffd700] bg-[#140d00]"
                  style={{ boxShadow:"3px 3px 0 #b8860b" }}>
                  <span style={{ fontSize:26 }}>⚔️</span>
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <div style={pxS("10px")} className="text-[#ffd700]">LARP BATTLE</div>
                  <div style={pxS("5px")} className="text-white/40 leading-relaxed">Create your character<br/>and duel another LARP persona</div>
                </div>
                <ChevronRight size={16} className="ml-auto text-[#ffd700]/40 shrink-0 group-hover:text-[#ffd700]"/>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["PERSONA","FACE-OFF","TOKENS"].map(tag=>(
                  <div key={tag} className="px-2 py-0.5 border border-[#ffd700]/25 text-[#ffd700]/50" style={pxS("4px")}>{tag}</div>
                ))}
              </div>
            </div>
          </PixelBorder>
        </button>

        {/* YC TRIVIA */}
        <button onClick={()=>{ setTriviaIdx(~~(Math.random()*YC_TRIVIA.length)); setTriviaAns(null); setBattleStep("trivia"); }}
          className="group active:scale-[.98] transition">
          <PixelBorder className="w-full">
            <div className="flex flex-col gap-4 bg-[#0a0a0a] p-5 group-hover:bg-[#ffd700]/8 transition">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-[#4a9eff]/50 bg-[#030d1a]"
                  style={{ boxShadow:"3px 3px 0 #1a3a6644" }}>
                  <span style={{ fontSize:26 }}>🏢</span>
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <div style={pxS("10px")} className="text-white">YC COMPANY TRIVIA</div>
                  <div style={pxS("5px")} className="text-white/40 leading-relaxed">Test your startup knowledge<br/>Answer right to earn tokens</div>
                </div>
                <ChevronRight size={16} className="ml-auto text-white/20 shrink-0 group-hover:text-white/50"/>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["TRIVIA","STARTUPS","EARN TOKENS"].map(tag=>(
                  <div key={tag} className="px-2 py-0.5 border border-white/10 text-white/30" style={pxS("4px")}>{tag}</div>
                ))}
              </div>
            </div>
          </PixelBorder>
        </button>

        {/* Coming soon placeholder */}
        <div className="border border-dashed border-[#ffd700]/10 p-4 text-center">
          <div style={pxS("5px")} className="text-[#ffd700]/20 leading-loose">MORE MODES<br/>COMING SOON...</div>
        </div>
      </div>
    );

    /* ── YC TRIVIA SCREEN ── */
    if (battleStep==="trivia") {
      const q = YC_TRIVIA[triviaIdx];
      const answered = triviaAns !== null;
      const correct  = triviaAns === q.correct;

      return (
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* header */}
          <div className="flex items-center justify-between border-b border-[#ffd700]/20 px-5 py-3 shrink-0">
            <button onClick={()=>setBattleStep("type-select")} style={pxS("6px")} className="text-white/30 hover:text-white">← BACK</button>
            <div style={pxS("7px")} className="text-white">YC TRIVIA</div>
            <div className="flex items-center gap-1 text-[#ffd700]" style={pxS("7px")}><Coins size={11}/> {tokens}</div>
          </div>

          <div className="flex flex-col gap-5 px-5 py-5">
            {/* company card */}
            <div className="flex flex-col items-center gap-4 p-5 border-2"
              style={{ borderColor:q.color+"66", background:q.bg, boxShadow:`0 0 24px ${q.color}22` }}>
              {/* logo */}
              <div className="flex h-20 w-20 items-center justify-center border-2 font-mono font-black text-white"
                style={{ borderColor:q.color, background:q.color+"22", fontSize:36, boxShadow:`0 0 16px ${q.color}55, 4px 4px 0 ${q.color}44` }}>
                {q.initial}
              </div>
              <div className="text-center">
                <div style={pxS("13px")} className="text-white leading-snug">{q.company.toUpperCase()}</div>
                <div style={pxS("5px")} className="text-white/40 mt-2 leading-loose">{q.tagline.toUpperCase()}</div>
              </div>
            </div>

            {/* question */}
            <div className="border-l-2 border-[#ffd700] pl-4">
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12 }} className="text-white leading-relaxed">
                {q.question}
              </div>
            </div>

            {/* options */}
            <div className="flex flex-col gap-2">
              {q.options.map((opt, i) => {
                const letter = ["A","B","C","D"][i];
                const isSelected = triviaAns === i;
                const isCorrect  = i === q.correct;
                let borderCol = "#ffd70030";
                let bgCol     = "#0a0a0a";
                let textCol   = "#ffffff99";
                if (answered) {
                  if (isCorrect)              { borderCol="#22c55e"; bgCol="#001a08"; textCol="#22c55e"; }
                  else if (isSelected)        { borderCol="#ef4444"; bgCol="#1a0000"; textCol="#ef4444"; }
                  else                        { borderCol="#ffd70015"; textCol="#ffffff30"; }
                } else if (isSelected)        { borderCol="#ffd700"; bgCol="#140d00"; textCol="#ffd700"; }

                return (
                  <button key={i} disabled={answered}
                    onClick={()=>{ setTriviaAns(i); if(i===q.correct) setTokens(t=>t+1); }}
                    className="flex items-center gap-3 border-2 px-4 py-3 text-left transition active:scale-[.98]"
                    style={{ borderColor:borderCol, background:bgCol, boxShadow:answered&&isCorrect?"0 0 12px #22c55e44":answered&&isSelected?"0 0 8px #ef444433":"none" }}>
                    <div className="shrink-0 flex h-7 w-7 items-center justify-center border font-mono font-bold text-xs"
                      style={{ borderColor:textCol, color:textCol }}>{letter}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:textCol, lineHeight:1.5 }}>{opt}</div>
                    {answered && isCorrect && <Check size={14} className="ml-auto shrink-0 text-[#22c55e]"/>}
                  </button>
                );
              })}
            </div>

            {/* result feedback */}
            {answered && (
              <div className={`flex flex-col items-center gap-3 border-2 p-4 text-center ${correct?"border-[#22c55e]/40 bg-[#001a08]":"border-[#ef4444]/30 bg-[#1a0000]"}`}>
                {correct
                  ? <>
                      <div style={pxS("10px")} className="text-[#22c55e]">CORRECT! 🎉</div>
                      <div className="flex items-center gap-2 text-[#ffd700]" style={pxS("9px")}><Coins size={14}/> +1 TOKEN EARNED</div>
                    </>
                  : <div style={pxS("9px")} className="text-[#ef4444]">WRONG ANSWER</div>
                }
                <div className="flex gap-3 w-full mt-1">
                  <button
                    onClick={()=>{ setTriviaIdx(i=>(i+1)%YC_TRIVIA.length); setTriviaAns(null); }}
                    className="flex-1 py-3 border-2 border-[#ffd700]/40 text-white/60 hover:text-white hover:border-[#ffd700] transition"
                    style={pxS("6px")}>
                    NEXT QUESTION
                  </button>
                  <button
                    onClick={()=>setBattleStep("type-select")}
                    className="flex-1 py-3 text-[#0a0a0a]"
                    style={{ ...pxS("6px"), background:"#ffd700", boxShadow:"3px 3px 0 #b8860b" }}>
                    DONE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (battleStep==="enter") return (
      <>
        <PixelStripe/>
        <div className="flex flex-1 flex-col px-6 pt-10 pb-4 gap-5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div style={pxS("6px")} className="text-[#ffd700]">PLAYER 1</div>
                <div className="h-2 w-2 rounded-sm bg-[#ffd700]" style={{ animation:"pulse 1s infinite" }}/>
              </div>
              <div style={pxS("14px")} className="text-white leading-snug">ENTER<br/>YOUR NAME</div>
            </div>
            <div className="flex items-center gap-1.5 text-[#ffd700]" style={pxS("8px")}><Coins size={13}/> {tokens}</div>
          </div>
          <div className="flex flex-col gap-3">
            <PixelBorder gold>
              <input value={name} onChange={e=>setName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&name.trim()&&setBattleStep("profile")}
                placeholder="e.g. LORD VEXOR" maxLength={22}
                className="w-full bg-[#0a0a0a] px-4 py-3 uppercase tracking-wider text-[#ffd700] placeholder:text-[#ffd700]/25 focus:outline-none"
                style={pxS("8px")}/>
            </PixelBorder>
            <button disabled={!name.trim()} onClick={()=>setBattleStep("profile")}
              className="w-full py-4 text-[#0a0a0a] transition active:scale-95 disabled:opacity-25"
              style={{ ...pxS("9px"), background:"#ffd700", boxShadow:"4px 4px 0 #b8860b" }}>
              ⚔ NEXT
            </button>
          </div>
          {/* mini fighters */}
          <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-2">
            <div className="flex items-end justify-center gap-10">
              <div style={{ imageRendering:"pixelated", filter:"drop-shadow(0 0 10px #ffd70099)" }}>
                {["___YY___","__YYYY__","__YYYY__","_YYYYYY_","__YYYY__","_YY__YY_","_YY__YY_","_WW__WW_"].map((row,i)=>(
                  <div key={i} className="flex">{row.split("").map((c,j)=>(
                    <div key={j} style={{ width:6, height:6, background:c==="Y"?"#ffd700":c==="W"?"#fff":"transparent" }}/>
                  ))}</div>
                ))}
              </div>
              <div className="flex h-9 w-9 items-center justify-center border-2 border-[#ffd700] bg-[#0a0a0a] text-[#ffd700] mb-1" style={{ ...pxS("8px"), boxShadow:"2px 2px 0 #b8860b" }}>VS</div>
              <div style={{ imageRendering:"pixelated", filter:"drop-shadow(0 0 10px #ffffff55)", transform:"scaleX(-1)" }}>
                {["___WW___","__WWWW__","__WWWW__","_WWWWWW_","__WWWW__","_WW__WW_","_WW__WW_","_GG__GG_"].map((row,i)=>(
                  <div key={i} className="flex">{row.split("").map((c,j)=>(
                    <div key={j} style={{ width:6, height:6, background:c==="W"?"#fff":c==="G"?"#888":"transparent" }}/>
                  ))}</div>
                ))}
              </div>
            </div>
            <div className="flex w-full">{Array.from({length:49}).map((_,i)=>(
              <div key={i} style={{ width:8, height:4, background:i%2===0?"#ffd700":"#0a0a0a" }}/>
            ))}</div>
            <div className="w-full flex flex-col gap-2">
              {[{label:"STR",val:78,color:"#ffd700"},{label:"WIT",val:62,color:"#fff"},{label:"LRP",val:91,color:"#ffd700"}].map(({label,val,color})=>(
                <div key={label} className="flex items-center gap-3">
                  <div style={{ ...pxS("5px"), color, width:28, flexShrink:0 }}>{label}</div>
                  <div className="flex-1 h-2 bg-[#1a1a1a] border border-[#ffd700]/15">
                    <div style={{ width:`${val}%`, height:"100%", background:color, opacity:.7 }}/>
                  </div>
                  <div style={{ ...pxS("5px"), color:"#ffffff40", width:22, textAlign:"right" }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <PixelStripe flip/>
      </>
    );

    if (battleStep==="profile") return (
      <div className="flex flex-1 flex-col px-6 py-6 gap-5 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div style={pxS("7px")} className="text-[#ffd700]">YOUR PROFILE</div>
          <button onClick={()=>setBattleStep("enter")} style={pxS("6px")} className="text-white/30 hover:text-white">← BACK</button>
        </div>
        <div style={pxS("9px")} className="text-white leading-relaxed">IS THIS YOU?</div>
        <PixelBorder gold className="w-full">
          <div className="flex flex-col gap-4 bg-[#0a0a0a] p-5">
            <div className="flex items-start gap-4">
              <CircleAvatar initials={initials} gradient="from-[#ffd700] to-amber-500" size={60}/>
              <div className="flex flex-col gap-1">
                <div style={pxS("8px")} className="text-white leading-relaxed">{(name||"HERO").toUpperCase()}</div>
                <div style={pxS("6px")} className="text-[#ffd700]/70">{profile.role.toUpperCase()}</div>
                <div style={pxS("5px")} className="text-white/35">{profile.company.toUpperCase()}</div>
              </div>
            </div>
            <div className="border-t border-[#ffd700]/10 pt-3">
              <p style={{ fontFamily:"'Space Mono',monospace", fontSize:10 }} className="text-white/50 leading-relaxed italic">"{profile.tagline}"</p>
            </div>
          </div>
        </PixelBorder>
        <div className="flex flex-col gap-3 mt-auto">
          <button onClick={()=>setBattleStep("challenger-select")}
            className="flex w-full items-center justify-center gap-2 py-4 text-[#0a0a0a] transition active:scale-95"
            style={{ ...pxS("9px"), background:"#ffd700", boxShadow:"4px 4px 0 #b8860b" }}>
            <Check size={14}/> YES, LET'S BATTLE
          </button>
        </div>
      </div>
    );

    if (battleStep==="challenger-select") return (
      <div className="flex flex-1 flex-col px-6 py-6 gap-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div style={pxS("7px")} className="text-[#ffd700]">PICK CHALLENGER</div>
          <button onClick={()=>setBattleStep("profile")} style={pxS("6px")} className="text-white/30 hover:text-white">← BACK</button>
        </div>
        <button onClick={()=>{ setChallenger(challengers[~~(Math.random()*challengers.length)]); setBattleStep("faceoff"); }}
          className="w-full active:scale-[.98]" style={{ boxShadow:"6px 6px 0 #b8860b" }}>
          <div className="bg-[#ffd700] border-2 border-[#ffd700] p-5 flex items-center justify-center gap-3">
            <Shuffle size={18} className="text-[#0a0a0a]"/>
            <div style={pxS("12px")} className="text-[#0a0a0a]">RANDOM</div>
          </div>
        </button>
        <div className="flex items-center gap-3"><div className="flex-1 h-px bg-[#ffd700]/20"/><div style={pxS("7px")} className="text-[#ffd700]/40">OR</div><div className="flex-1 h-px bg-[#ffd700]/20"/></div>
        <button onClick={()=>setBattleStep("pick")} className="w-full active:scale-[.98]">
          <PixelBorder gold className="w-full">
            <div className="bg-[#0a0a0a] p-5 flex flex-col items-center gap-3 hover:bg-[#ffd700]/8 transition">
              <div className="flex -space-x-2">{challengers.slice(0,5).map(c=>(
                <div key={c.id} className={`w-9 h-9 rounded-full bg-gradient-to-br ${c.gradient} border-2 border-[#0a0a0a] flex items-center justify-center`}>
                  <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:"bold", color:"#fff" }}>{c.initials}</span>
                </div>
              ))}<div className="w-9 h-9 rounded-full bg-[#1a1400] border-2 border-[#ffd700]/30 flex items-center justify-center"><span style={pxS("7px")} className="text-[#ffd700]/50">+3</span></div></div>
              <div style={pxS("12px")} className="text-white">CHOOSE</div>
            </div>
          </PixelBorder>
        </button>
      </div>
    );

    if (battleStep==="pick") return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-[#ffd700]/20 bg-[#0a0a0a] px-5 py-3 flex items-center justify-between">
          <div style={pxS("7px")} className="text-[#ffd700]">CHALLENGERS</div>
          <button onClick={()=>setBattleStep("challenger-select")} style={pxS("6px")} className="text-white/30 hover:text-white">← BACK</button>
        </div>
        {challengers.map(c=>(
          <button key={c.id} onClick={()=>{ setChallenger(c); setBattleStep("faceoff"); }}
            className="flex items-center gap-4 border-b border-[#ffd700]/10 px-5 py-4 text-left hover:bg-[#ffd700]/5 active:scale-[.98] transition">
            <CircleAvatar initials={c.initials} gradient={c.gradient} size={52}/>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div style={pxS("7px")} className="text-white truncate">{c.name.toUpperCase()}</div>
              <div style={pxS("5px")} className="text-[#ffd700]/60">{c.role.toUpperCase()}</div>
              <div style={pxS("5px")} className="text-white/30 truncate">{c.company.toUpperCase()}</div>
            </div>
            <ChevronRight size={16} className="text-[#ffd700]/35 shrink-0"/>
          </button>
        ))}
      </div>
    );

    if (battleStep==="faceoff") return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-[#ffd700]/20 px-5 py-3" style={pxS("7px")}><span className="text-[#ffd700]">WHO PERFORMED BETTER?</span></div>
        <div className="flex flex-1 flex-col gap-3 px-4 py-4 overflow-hidden">
          <button onClick={()=>setBattleStep("result")} className="group flex-1 active:scale-[.98]">
            <PixelBorder gold className="h-full w-full">
              <div className="flex h-full flex-col gap-3 bg-[#0a0a0a] p-4 text-left group-hover:bg-[#ffd700]/8 transition">
                <CircleAvatar initials={initials} gradient="from-[#ffd700] to-amber-500" size={48}/>
                <div><div style={pxS("6px")} className="text-[#ffd700] mb-1">YOU</div>
                  <div style={pxS("8px")} className="text-white">{(name||"HERO").toUpperCase()}</div>
                  <div style={pxS("5px")} className="text-[#ffd700]/50 mt-1">{profile.role.toUpperCase()}</div></div>
              </div>
            </PixelBorder>
          </button>
          <div className="flex items-center gap-3"><div className="flex-1 h-px bg-[#ffd700]/20"/><span style={pxS("11px")} className="text-[#ffd700]">VS</span><div className="flex-1 h-px bg-[#ffd700]/20"/></div>
          <button onClick={()=>setBattleStep("result")} className="group flex-1 active:scale-[.98]">
            <PixelBorder className="h-full w-full">
              <div className="flex h-full flex-col gap-3 bg-[#0a0a0a] p-4 text-left group-hover:bg-[#ffd700]/8 transition">
                <CircleAvatar initials={challenger.initials} gradient={challenger.gradient} size={48}/>
                <div><div style={pxS("6px")} className="text-white/40 mb-1">CHALLENGER</div>
                  <div style={pxS("8px")} className="text-white">{challenger.name.toUpperCase()}</div>
                  <div style={pxS("5px")} className="text-[#ffd700]/50 mt-1">{challenger.role.toUpperCase()}</div></div>
              </div>
            </PixelBorder>
          </button>
        </div>
        <div className="px-5 pb-3 text-center text-white/25" style={pxS("6px")}>TAP TO VOTE</div>
      </div>
    );

    // result
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div style={{ ...pxS("clamp(18px,5vw,24px)"), color:"#ffd700", textShadow:"3px 3px 0 #b8860b" }}>YOU WIN!</div>
        <PixelBorder gold>
          <div className="flex flex-col items-center gap-2 bg-[#0a0a0a] px-8 py-5">
            <Coins size={26} className="text-[#ffd700]"/>
            <div style={{ ...pxS("28px"), color:"#ffd700", textShadow:"2px 2px 0 #b8860b" }}>+1</div>
            <div style={pxS("6px")} className="text-white/40">TOKEN EARNED</div>
          </div>
        </PixelBorder>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button onClick={()=>{ setTokens(t=>t+1); setRewardView("chest"); resetChest(); setTab("rewards"); }}
            className="flex w-full items-center justify-center gap-2 py-4 text-[#0a0a0a] transition active:scale-95"
            style={{ ...pxS("9px"), background:"#ffd700", boxShadow:"4px 4px 0 #b8860b" }}>
            <Package size={14}/> OPEN CHEST
          </button>
          <button onClick={()=>{ setTokens(t=>t+1); setRewardView("slots"); setSlotPhase("idle"); setTab("rewards"); }}
            className="flex w-full items-center justify-center gap-2 border-2 border-[#ffd700]/40 py-4 text-white/60 hover:border-[#ffd700] hover:text-white transition active:scale-95"
            style={pxS("9px")}>
            <Zap size={14}/> SLOTS
          </button>
          <button onClick={()=>{ setTokens(t=>t+1); setBattleStep("enter"); }}
            className="flex items-center justify-center gap-2 py-2 text-white/30 hover:text-white"
            style={pxS("7px")}>
            <RotateCcw size={12}/> AGAIN
          </button>
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════
     REWARDS TAB
  ═══════════════════════════════════════════════════════════ */
  const renderRewards = () => {
    /* hub */
    if (rewardView==="hub") return (
      <div className="flex flex-1 flex-col gap-4 px-5 py-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div style={pxS("8px")} className="text-[#ffd700]">REWARDS</div>
          <div className="flex items-center gap-1.5 text-[#ffd700]" style={pxS("8px")}><Coins size={13}/> {tokens}</div>
        </div>
        <button onClick={()=>setRewardView("slots")} className="active:scale-[.98]">
          <PixelBorder gold className="w-full">
            <div className="flex items-center gap-4 bg-[#0a0a0a] p-5 hover:bg-[#ffd700]/8 transition">
              <div className="text-3xl">🎰</div>
              <div className="flex flex-col gap-1 text-left">
                <div style={pxS("10px")} className="text-[#ffd700]">FORTUNE SLOTS</div>
                <div style={pxS("6px")} className="text-white/40 leading-relaxed">Bet tokens · win big<br/>JACKPOT: 🪙 {jackpot}</div>
              </div>
              <ChevronRight size={16} className="ml-auto text-[#ffd700]/40"/>
            </div>
          </PixelBorder>
        </button>
        <button onClick={()=>{ setRewardView("chest"); resetChest(); }} className="active:scale-[.98]">
          <PixelBorder className="w-full">
            <div className="flex items-center gap-4 bg-[#0a0a0a] p-5 hover:bg-[#ffd700]/8 transition">
              <div className="text-3xl">📦</div>
              <div className="flex flex-col gap-1 text-left">
                <div style={pxS("10px")} className="text-white">LOOT CHEST</div>
                <div style={pxS("6px")} className="text-white/40 leading-relaxed">Spend 1 token · earn<br/>rare LARP gear</div>
              </div>
              <ChevronRight size={16} className="ml-auto text-[#ffd700]/40"/>
            </div>
          </PixelBorder>
        </button>
        <div className="mt-1 border border-[#ffd700]/10 p-4">
          <div style={pxS("6px")} className="text-[#ffd700]/50 mb-3">PLAY-ONLY — NO CASH VALUE</div>
          <div className="flex flex-col gap-1.5" style={pxS("5px")}>
            <div className="flex justify-between text-white/30"><span>BATTLES WON</span><span className="text-[#ffd700]/60">—</span></div>
            <div className="flex justify-between text-white/30"><span>ITEMS COLLECTED</span><span className="text-[#ffd700]/60">{inventory.length}</span></div>
            <div className="flex justify-between text-white/30"><span>TOKENS</span><span className="text-[#ffd700]/60">{tokens}</span></div>
          </div>
        </div>
      </div>
    );

    /* ── SLOTS ── */
    if (rewardView==="slots") return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between border-b border-[#ffd700]/20 px-5 py-3 shrink-0">
          <button onClick={()=>setRewardView("hub")} style={pxS("6px")} className="text-white/35 hover:text-white">← BACK</button>
          <div style={pxS("8px")} className="text-[#ffd700]">SLOTS</div>
          <div className="flex items-center gap-1 text-[#ffd700]" style={pxS("7px")}><Coins size={11}/> {tokens}</div>
        </div>

        {/* jackpot meter */}
        <div className="relative shrink-0 border-b border-[#ffd700]/20 bg-[#0d0900] px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-[#ffd700] fill-[#ffd700]"/>
              <div style={pxS("7px")} className="text-[#ffd700]">JACKPOT</div>
            </div>
            <div style={{ ...pxS("16px"), color:"#ffd700", textShadow:"2px 2px 0 #b8860b" }}>🪙 {jackpot}</div>
          </div>
          <div className="mt-2 h-2 bg-[#1a1a1a] border border-[#ffd700]/20 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#ffd700] to-amber-400 transition-all" style={{ width:`${Math.min(100, (jackpot/200)*100)}%` }}/>
          </div>
          <div style={pxS("5px")} className="text-white/25 mt-1">GROWS EVERY SPIN · RESETS ON HIT</div>
        </div>

        <div className="flex flex-1 flex-col items-center gap-4 px-5 py-4 overflow-y-auto">

          {/* reels */}
          <PixelBorder gold className="w-full">
            <div className="relative bg-[#060606] px-3 py-4">
              {/* win flash */}
              {slotPhase==="result" && lastWin!==null && lastWin>0 && (
                <div className="absolute inset-0 animate-pulse pointer-events-none"
                  style={{ background:`${isJackpot?"#ffd70018":"#ffffff08"}`, border:`1px solid ${isJackpot?"#ffd70066":"#ffffff22"}` }}/>
              )}
              <div className="flex justify-center gap-3">
                {reels.map((sym,i)=>(
                  <div key={i} className="flex flex-col items-center justify-center gap-1 shrink-0"
                    style={{ width:78, height:86, background:"#0a0a0a", border:`2px solid ${slotPhase==="result"&&lastWin&&lastWin>0?sym.color:"#ffd70030"}`,
                      boxShadow:slotPhase==="result"&&lastWin&&lastWin>0?`0 0 12px ${sym.color}44`:"none", transition:"border-color .3s, box-shadow .3s" }}>
                    <div style={{ fontSize:30 }}>{sym.icon}</div>
                    <div style={{ ...pxS("5px"), color:sym.color }}>{sym.name}</div>
                  </div>
                ))}
              </div>
              {/* paylines indicator */}
              <div className="flex justify-center gap-1 mt-2">
                {[0,1,2].map(i=>(
                  <div key={i} className="h-0.5 w-6 bg-[#ffd700]/20"/>
                ))}
              </div>
            </div>
          </PixelBorder>

          {/* win/result display */}
          <div className="h-12 flex items-center justify-center">
            {slotPhase==="result" && lastWin!==null && (
              isJackpot
                ? <div style={{ ...pxS("12px"), textShadow:"2px 2px 0 #b8860b" }} className="text-center text-[#ffd700] animate-bounce">⭐ JACKPOT! +{lastWin} 🪙</div>
                : lastWin>0
                  ? <div style={pxS("10px")} className="text-white">WIN! +{lastWin} 🪙</div>
                  : <div style={pxS("8px")} className="text-white/30">NO MATCH — TRY AGAIN</div>
            )}
            {slotPhase==="spinning" && <div style={pxS("8px")} className="text-[#ffd700] animate-pulse">SPINNING...</div>}
          </div>

          {/* bet selector */}
          <div className="w-full">
            <div style={pxS("6px")} className="text-white/40 mb-2 text-center">BET AMOUNT</div>
            <div className="flex gap-2">
              {[1,2,5].map(b=>(
                <button key={b} onClick={()=>setBet(b)} disabled={slotPhase==="spinning"}
                  className="flex-1 py-3 transition active:scale-95"
                  style={{
                    ...pxS("9px"),
                    background: bet===b?"#ffd700":"#0a0a0a",
                    color: bet===b?"#0a0a0a":"#ffd700",
                    border: `2px solid ${bet===b?"#ffd700":"#ffd70040"}`,
                    boxShadow: bet===b?"3px 3px 0 #b8860b":"none",
                  }}>
                  {b}×
                </button>
              ))}
            </div>
          </div>

          {/* paytable */}
          <PixelBorder className="w-full">
            <div className="bg-[#0a0a0a] p-3">
              <div style={pxS("5px")} className="text-[#ffd700]/50 mb-2 text-center">PAYTABLE</div>
              <div className="flex flex-col gap-1.5">
                {SLOT_SYMBOLS.slice().reverse().map(s=>(
                  <div key={s.id} className="flex items-center gap-2">
                    <span style={{ fontSize:14 }}>{s.icon}{s.icon}{s.icon}</span>
                    <div style={{ ...pxS("5px"), color:s.color, flex:1 }}>
                      {s.id==="star" ? "JACKPOT 🪙" : `× ${s.mult} BET`}
                    </div>
                    <div style={{ ...pxS("4px"), color:s.color+"99" }}>
                      {s.id==="star" ? `🪙${jackpot}` : `+${bet*s.mult} 🪙`}
                    </div>
                  </div>
                ))}
                <div className="border-t border-[#ffd700]/10 pt-1.5 flex items-center gap-2">
                  <span style={{ fontSize:14 }}>🎭🎭</span>
                  <div style={{ ...pxS("5px"), color:"#888", flex:1 }}>ANY PAIR</div>
                  <div style={{ ...pxS("4px"), color:"#88888899" }}>+{bet} 🪙</div>
                </div>
              </div>
            </div>
          </PixelBorder>

          {/* spin button */}
          <button disabled={slotPhase==="spinning"||tokens<bet} onClick={spinSlots}
            className="w-full py-4 flex items-center justify-center gap-2 text-[#0a0a0a] transition active:scale-95 disabled:opacity-30"
            style={{ ...pxS("10px"), background:"#ffd700", boxShadow:slotPhase==="spinning"||tokens<bet?"none":"4px 4px 0 #b8860b" }}>
            <Zap size={16}/>
            {slotPhase==="spinning" ? "SPINNING..." : tokens<bet ? "NOT ENOUGH 🪙" : `SPIN — ${bet} TOKEN${bet>1?"S":""}`}
          </button>
          {slotPhase==="result" && (
            <button onClick={()=>setSlotPhase("idle")} className="text-white/30 hover:text-white" style={pxS("7px")}>RESET</button>
          )}
        </div>
      </div>
    );

    /* ── CHEST ── */
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#ffd700]/20 px-5 py-3 shrink-0">
          <button onClick={()=>setRewardView("hub")} style={pxS("6px")} className="text-white/35 hover:text-white">← BACK</button>
          <div style={pxS("8px")} className="text-[#ffd700]">LOOT CHEST</div>
          <div className="flex items-center gap-1 text-[#ffd700]" style={pxS("7px")}><Coins size={11}/> {tokens}</div>
        </div>
        <div className="flex flex-1 flex-col items-center overflow-hidden">
          {/* reel */}
          <div className="relative w-full mt-6 shrink-0">
            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none"/>
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none"/>
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
              <div style={{ width:0, height:0, borderLeft:"8px solid transparent", borderRight:"8px solid transparent", borderTop:"12px solid #ffd700" }}/>
              <div className="flex-1 w-px bg-[#ffd700]"/>
              <div style={{ width:0, height:0, borderLeft:"8px solid transparent", borderRight:"8px solid transparent", borderBottom:"12px solid #ffd700" }}/>
            </div>
            <div className="overflow-hidden w-full py-2" style={{ height:104 }}>
              <div ref={reelRef} className="flex gap-[6px] pl-[195px]" style={{ willChange:"transform" }}>
                {(reelItems.length?reelItems:Array.from({length:10},()=>CHEST_ITEMS[0])).map((item,i)=>(
                  <div key={i} className="shrink-0 flex flex-col items-center justify-center gap-1"
                    style={{ width:ITEM_W, height:88, background:item.bg, border:`2px solid ${item.border}`, boxShadow:`0 0 8px ${item.glow}` }}>
                    <div style={{ fontSize:26 }}>{item.icon}</div>
                    <div style={{ ...pxS("4px"), color:item.border, textAlign:"center", lineHeight:1.4, padding:"0 4px" }}>{item.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* rarity legend */}
          <div className="flex gap-2 mt-2 flex-wrap justify-center px-4 shrink-0">
            {(["common","uncommon","rare","epic","legendary"] as Rarity[]).map(r=>{
              const s=CHEST_ITEMS.find(i=>i.rarity===r)!;
              return <div key={r} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-sm" style={{ background:s.border }}/><span style={{ ...pxS("4px"), color:s.border }}>{r.toUpperCase()}</span>
              </div>;
            })}
          </div>
          {/* chest + controls */}
          <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-4 px-6">
            <div className="relative">
              {chestOpen && <div className="absolute -bottom-3 w-28 h-6 rounded-full blur-xl" style={{ background:"#ffd70033" }}/>}
              <PixelChest open={chestOpen}/>
            </div>
            {chestPhase==="idle" && (
              <div className="flex flex-col items-center gap-3 w-full">
                <button disabled={tokens<1} onClick={openChest}
                  className="w-full py-4 text-[#0a0a0a] transition active:scale-95 disabled:opacity-25"
                  style={{ ...pxS("9px"), background:"#ffd700", boxShadow:"4px 4px 0 #b8860b" }}>
                  OPEN — 1 TOKEN
                </button>
                {tokens<1 && <div style={pxS("6px")} className="text-white/25 text-center leading-loose">WIN BATTLES<br/>TO EARN TOKENS</div>}
              </div>
            )}
            {(chestPhase==="opening"||chestPhase==="spinning") && (
              <div style={pxS("8px")} className="text-[#ffd700] animate-pulse">
                {chestPhase==="opening"?"OPENING...":"ROLLING..."}
              </div>
            )}
            {chestPhase==="reveal" && wonItem && (
              <div className="flex flex-col items-center gap-3 w-full">
                <div style={{ ...pxS("6px"), color:wonItem.border }}>{wonItem.rarity.toUpperCase()} DROP!</div>
                <div className="flex flex-col items-center justify-center gap-2 px-5 py-4"
                  style={{ border:`3px solid ${wonItem.border}`, background:wonItem.bg, boxShadow:`0 0 20px ${wonItem.glow}`, minWidth:130 }}>
                  <div style={{ fontSize:36 }}>{wonItem.icon}</div>
                  <div style={{ ...pxS("6px"), color:wonItem.border, textAlign:"center", lineHeight:1.8 }}>{wonItem.name}</div>
                </div>
                <div className="flex gap-3 w-full">
                  <button onClick={resetChest} className="flex-1 py-3 border-2 border-[#ffd700]/35 text-white/50 hover:text-white transition" style={pxS("6px")}>AGAIN</button>
                  <button onClick={()=>setRewardView("hub")} className="flex-1 py-3 text-[#0a0a0a]" style={{ ...pxS("6px"), background:"#ffd700", boxShadow:"3px 3px 0 #b8860b" }}>DONE</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════
     STORE TAB
  ═══════════════════════════════════════════════════════════ */
  const renderStore = () => (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* profile header */}
      <div className="border-b border-[#ffd700]/20 px-5 py-5">
        <div className="flex items-center gap-4">
          <CircleAvatar initials={initials||"??"} gradient={name?"from-[#ffd700] to-amber-500":undefined} size={60}/>
          <div className="flex flex-col gap-1">
            <div style={pxS("8px")} className="text-white">{(name||"ANONYMOUS").toUpperCase()}</div>
            <div style={pxS("5px")} className="text-[#ffd700]/60">{name?profile.role.toUpperCase():"SET NAME IN BATTLES"}</div>
            <div className="flex items-center gap-1 mt-1 text-[#ffd700]" style={pxS("6px")}><Coins size={10}/> {tokens} TOKENS</div>
          </div>
        </div>
      </div>
      {/* inventory */}
      <div className="px-5 py-4">
        <div style={pxS("7px")} className="text-[#ffd700] mb-3">INVENTORY ({inventory.length})</div>
        {inventory.length===0
          ? <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="text-4xl opacity-30">📦</div>
              <div style={pxS("6px")} className="text-white/25 leading-loose">OPEN CHESTS<br/>TO COLLECT ITEMS</div>
              <button onClick={()=>{ setRewardView("chest"); resetChest(); setTab("rewards"); }}
                className="mt-2 px-5 py-3 text-[#0a0a0a]" style={{ ...pxS("7px"), background:"#ffd700", boxShadow:"3px 3px 0 #b8860b" }}>
                OPEN CHEST
              </button>
            </div>
          : <div className="grid grid-cols-3 gap-2">
              {inventory.map(item=>(
                <button key={item.uid}
                  onClick={()=>setInventory(inv=>inv.map(i=>i.uid===item.uid?{...i,equipped:!i.equipped}:i))}
                  className="flex flex-col items-center gap-1 p-2 transition active:scale-95"
                  style={{ border:`2px solid ${item.equipped?item.border:item.border+"55"}`,
                    background: item.equipped?item.bg:"#0a0a0a",
                    boxShadow: item.equipped?`0 0 10px ${item.glow}`:"none" }}>
                  <div style={{ fontSize:24 }}>{item.icon}</div>
                  <div style={{ ...pxS("4px"), color:item.border, textAlign:"center", lineHeight:1.5 }}>{item.name}</div>
                  {item.equipped && <div style={{ ...pxS("4px"), color:"#ffd700" }}>EQUIPPED</div>}
                </button>
              ))}
            </div>
        }
      </div>
      {inventory.length>0 && (
        <div className="px-5 pb-4">
          <div style={pxS("6px")} className="text-white/25 leading-loose text-center">TAP AN ITEM TO EQUIP / UNEQUIP</div>
        </div>
      )}
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     APP SHELL
  ═══════════════════════════════════════════════════════════ */
  return (
    <Shell>
      {/* tab header */}
      <div className="shrink-0 border-b border-[#ffd700]/20 px-5 py-3 flex items-center justify-between">
        <div style={pxS("8px")} className={tab==="battles"?"text-[#ffd700]":tab==="rewards"?"text-[#ffd700]":"text-[#ffd700]"}>
          {tab==="battles"?"⚔ BATTLES":tab==="rewards"?"🎁 REWARDS":"🏪 STORE"}
        </div>
        <div className="flex items-center gap-1.5 text-[#ffd700]" style={pxS("7px")}><Coins size={11}/> {tokens}</div>
      </div>
      {/* content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {tab==="battles" && renderBattles()}
        {tab==="rewards" && renderRewards()}
        {tab==="store"   && renderStore()}
      </div>
    </Shell>
  );
}
