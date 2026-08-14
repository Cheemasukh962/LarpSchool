"use client";

/**
 * Single state container for the game.
 *
 * The original design source kept 21 useState calls and every screen's markup in one
 * 1100-line component. Splitting the screens out means they need shared state from
 * somewhere, and a context is that somewhere. Keeping it in one file also means Phase 3
 * can swap token math from local to server-authoritative by editing this file alone.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { resolveBattle } from "./battle";
import { loadGameData, randomCard, shuffledDeck, type GameData } from "./cards";
import {
  buildReel,
  finalTranslateX,
  weightedChestItem,
  CHEST_COST,
  CHEST_ITEMS,
  type ChestItem,
} from "./chest";
import { drawSpin, evaluateSpin, pickSymbol, SLOT_SYMBOLS, JACKPOT_SEED, type SlotSymbol } from "./slots";
import type { BattleResult, Card, Question } from "./types";

export type Screen = "cover" | "app";
export type Tab = "battles" | "rewards" | "store";
export type BattleStep =
  | "type-select"
  | "claim"
  | "profile"
  | "challenger-select"
  | "pick"
  | "faceoff"
  | "result"
  | "trivia";
export type RewardView = "hub" | "slots" | "chest";
export type SlotPhase = "idle" | "spinning" | "result";
export type ChestPhase = "idle" | "opening" | "spinning" | "reveal";

export interface OwnedItem extends ChestItem {
  uid: string;
  equipped: boolean;
}

interface GameContextValue {
  /* data */
  data: GameData | null;
  loading: boolean;
  error: string | null;
  retryLoad: () => void;

  /* navigation */
  screen: Screen;
  setScreen: (s: Screen) => void;
  tab: Tab;
  setTab: (t: Tab) => void;

  /* wallet */
  tokens: number;
  jackpot: number;
  addTokens: (n: number) => void;

  /* player */
  playerCard: Card | null;
  claimCard: (card: Card) => void;
  clearCard: () => void;

  /* battle */
  battleStep: BattleStep;
  setBattleStep: (s: BattleStep) => void;
  challenger: Card | null;
  chooseChallenger: (card: Card) => void;
  chooseRandomChallenger: () => void;
  guessId: string | null;
  submitGuess: (id: string) => void;
  battleResult: BattleResult | null;
  guessedRight: boolean | null;
  battlesWon: number;
  restartBattle: () => void;

  /* trivia */
  question: Question | null;
  triviaAns: number | null;
  triviaAnswered: number;
  triviaCorrect: number;
  startTrivia: () => void;
  answerTrivia: (index: number) => void;
  nextQuestion: () => void;

  /* rewards */
  rewardView: RewardView;
  setRewardView: (v: RewardView) => void;

  /* slots */
  bet: number;
  setBet: (n: number) => void;
  reels: SlotSymbol[];
  slotPhase: SlotPhase;
  lastWin: number | null;
  isJackpot: boolean;
  spinSlots: () => void;
  resetSlots: () => void;

  /* chest */
  chestPhase: ChestPhase;
  chestOpen: boolean;
  reelItems: ChestItem[];
  wonItem: ChestItem | null;
  reelRef: RefObject<HTMLDivElement | null>;
  openChest: () => void;
  resetChest: () => void;

  /* inventory */
  inventory: OwnedItem[];
  toggleEquip: (uid: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}

const SPIN_TICK_MS = 80;
const SPIN_STOPS = [14, 22, 30];
const CHEST_ROLL_MS = 5200;

export function GameProvider({ children }: { children: ReactNode }) {
  /* ── data ── */
  const [data, setData] = useState<GameData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadNonce, setLoadNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    loadGameData().then(
      (d) => alive && setData(d),
      (err) => alive && setError(err instanceof Error ? err.message : String(err))
    );
    return () => {
      alive = false;
    };
  }, [loadNonce]);

  const retryLoad = useCallback(() => {
    setError(null);
    setLoadNonce((n) => n + 1);
  }, []);

  /* ── navigation ── */
  const [screen, setScreen] = useState<Screen>("cover");
  const [tab, setTab] = useState<Tab>("battles");

  /* ── wallet ── */
  const [tokens, setTokens] = useState(3);
  const [jackpot, setJackpot] = useState(JACKPOT_SEED);
  const addTokens = useCallback((n: number) => setTokens((t) => Math.max(0, t + n)), []);

  /* ── player ── */
  const [playerCard, setPlayerCard] = useState<Card | null>(null);

  /* ── battle ── */
  const [battleStep, setBattleStep] = useState<BattleStep>("type-select");
  const [challenger, setChallenger] = useState<Card | null>(null);
  const [guessId, setGuessId] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [guessedRight, setGuessedRight] = useState<boolean | null>(null);
  const [battlesWon, setBattlesWon] = useState(0);

  const claimCard = useCallback((card: Card) => {
    setPlayerCard(card);
    setBattleStep("profile");
  }, []);

  const clearCard = useCallback(() => {
    setPlayerCard(null);
    setChallenger(null);
    setBattleResult(null);
    setBattleStep("claim");
  }, []);

  const chooseChallenger = useCallback((card: Card) => {
    setChallenger(card);
    setGuessId(null);
    setBattleResult(null);
    setGuessedRight(null);
    setBattleStep("faceoff");
  }, []);

  const chooseRandomChallenger = useCallback(() => {
    if (!data) return;
    chooseChallenger(randomCard(data.cards, playerCard?.id));
  }, [data, playerCard, chooseChallenger]);

  /**
   * The design asks "who performed better?" and lets you tap a side. With real scores that
   * tap becomes a prediction: the rubric decides the winner, and we tell you if you called it.
   */
  const submitGuess = useCallback(
    (id: string) => {
      if (!playerCard || !challenger) return;
      const result = resolveBattle(playerCard, challenger);
      const playerWon = result.winner_id === playerCard.id;
      setGuessId(id);
      setGuessedRight(id === result.winner_id);
      setBattleResult({ ...result, player_won: playerWon });
      if (playerWon) setBattlesWon((n) => n + 1);
      // One token per resolved fight, credited once here rather than per button tap.
      setTokens((t) => t + 1);
      setBattleStep("result");
    },
    [playerCard, challenger]
  );

  const restartBattle = useCallback(() => {
    setChallenger(null);
    setGuessId(null);
    setBattleResult(null);
    setGuessedRight(null);
    setBattleStep(playerCard ? "challenger-select" : "claim");
  }, [playerCard]);

  /* ── trivia ── */
  const [deck, setDeck] = useState<number[]>([]);
  const [deckPos, setDeckPos] = useState(0);
  const [triviaAns, setTriviaAns] = useState<number | null>(null);
  const [triviaAnswered, setTriviaAnswered] = useState(0);
  const [triviaCorrect, setTriviaCorrect] = useState(0);

  const question = useMemo(() => {
    if (!data || deck.length === 0) return null;
    return data.questions[deck[deckPos % deck.length]] ?? null;
  }, [data, deck, deckPos]);

  const startTrivia = useCallback(() => {
    if (!data) return;
    setDeck(shuffledDeck(data.questions.length));
    setDeckPos(0);
    setTriviaAns(null);
    setBattleStep("trivia");
  }, [data]);

  const answerTrivia = useCallback(
    (index: number) => {
      if (!question || triviaAns !== null) return;
      setTriviaAns(index);
      setTriviaAnswered((n) => n + 1);
      if (index === question.correct) {
        setTriviaCorrect((n) => n + 1);
        setTokens((t) => t + 1);
      }
    },
    [question, triviaAns]
  );

  const nextQuestion = useCallback(() => {
    setDeckPos((p) => p + 1);
    setTriviaAns(null);
  }, []);

  /* ── rewards ── */
  const [rewardView, setRewardView] = useState<RewardView>("hub");

  /* ── slots ── */
  const [bet, setBet] = useState(1);
  const [reels, setReels] = useState<SlotSymbol[]>([SLOT_SYMBOLS[0], SLOT_SYMBOLS[0], SLOT_SYMBOLS[0]]);
  const [slotPhase, setSlotPhase] = useState<SlotPhase>("idle");
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [isJackpot, setIsJackpot] = useState(false);
  const spinTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const resetSlots = useCallback(() => {
    setSlotPhase("idle");
    setLastWin(null);
    setIsJackpot(false);
  }, []);

  const spinSlots = useCallback(() => {
    if (slotPhase !== "idle" || tokens < bet) return;

    setTokens((t) => t - bet);
    setJackpot((j) => j + Math.ceil(bet / 2));
    setSlotPhase("spinning");
    setLastWin(null);
    setIsJackpot(false);

    const outcome = drawSpin(bet, jackpot);
    let count = 0;
    const tick = setInterval(() => {
      count++;
      setReels([
        count > SPIN_STOPS[0] ? outcome.reels[0] : pickSymbol(),
        count > SPIN_STOPS[1] ? outcome.reels[1] : pickSymbol(),
        count > SPIN_STOPS[2] ? outcome.reels[2] : pickSymbol(),
      ]);
      if (count > SPIN_STOPS[2]) {
        clearInterval(tick);
        setReels(outcome.reels);
        const settle = setTimeout(() => {
          // Recompute against the pot at payout time so a concurrent grow can't shortchange.
          const final = evaluateSpin(outcome.reels, bet, jackpot);
          if (final.jackpot) setJackpot(JACKPOT_SEED);
          if (final.win > 0) setTokens((t) => t + final.win);
          setLastWin(final.win);
          setIsJackpot(final.jackpot);
          setSlotPhase("result");
        }, 400);
        spinTimers.current.push(settle);
      }
    }, SPIN_TICK_MS);
    spinTimers.current.push(tick as unknown as ReturnType<typeof setTimeout>);
  }, [slotPhase, tokens, bet, jackpot]);

  /* ── chest ── */
  const [chestPhase, setChestPhase] = useState<ChestPhase>("idle");
  const [chestOpen, setChestOpen] = useState(false);
  const [reelItems, setReelItems] = useState<ChestItem[]>([]);
  const [wonItem, setWonItem] = useState<ChestItem | null>(null);
  const reelRef = useRef<HTMLDivElement | null>(null);
  const chestTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const [inventory, setInventory] = useState<OwnedItem[]>([]);

  const resetChest = useCallback(() => {
    setChestPhase("idle");
    setChestOpen(false);
    setWonItem(null);
    setReelItems([]);
    if (reelRef.current) {
      reelRef.current.style.transition = "none";
      reelRef.current.style.transform = "translateX(0px)";
    }
  }, []);

  const openChest = useCallback(() => {
    if (tokens < CHEST_COST || chestPhase !== "idle") return;

    const winner = weightedChestItem();
    const jitter = (Math.random() - 0.5) * 20;

    setTokens((t) => t - CHEST_COST);
    setWonItem(winner);
    setReelItems(buildReel(winner));
    setChestPhase("opening");
    setChestOpen(true);

    const lid = setTimeout(() => {
      setChestPhase("spinning");
      const el = reelRef.current;
      if (el) {
        el.style.transition = "none";
        el.style.transform = "translateX(0px)";
        el.getBoundingClientRect(); // force reflow so the next transition actually runs
        el.style.transition = "transform 5s cubic-bezier(0.05,0,0.18,1)";
        el.style.transform = `translateX(${finalTranslateX(jitter)}px)`;
      }
      const reveal = setTimeout(() => {
        setChestPhase("reveal");
        setInventory((inv) => [
          ...inv,
          { ...winner, uid: Math.random().toString(36).slice(2), equipped: false },
        ]);
      }, CHEST_ROLL_MS);
      chestTimers.current.push(reveal);
    }, 450);
    chestTimers.current.push(lid);
  }, [tokens, chestPhase]);

  const toggleEquip = useCallback((uid: string) => {
    setInventory((inv) => inv.map((i) => (i.uid === uid ? { ...i, equipped: !i.equipped } : i)));
  }, []);

  /* Timers outlive a screen change, so clear them when the provider goes away. */
  useEffect(() => {
    const spins = spinTimers.current;
    const chests = chestTimers.current;
    return () => {
      spins.forEach(clearTimeout);
      spins.forEach((t) => clearInterval(t as unknown as number));
      chests.forEach(clearTimeout);
    };
  }, []);

  const value: GameContextValue = {
    data,
    loading: !data && !error,
    error,
    retryLoad,

    screen,
    setScreen,
    tab,
    setTab,

    tokens,
    jackpot,
    addTokens,

    playerCard,
    claimCard,
    clearCard,

    battleStep,
    setBattleStep,
    challenger,
    chooseChallenger,
    chooseRandomChallenger,
    guessId,
    submitGuess,
    battleResult,
    guessedRight,
    battlesWon,
    restartBattle,

    question,
    triviaAns,
    triviaAnswered,
    triviaCorrect,
    startTrivia,
    answerTrivia,
    nextQuestion,

    rewardView,
    setRewardView,

    bet,
    setBet,
    reels,
    slotPhase,
    lastWin,
    isJackpot,
    spinSlots,
    resetSlots,

    chestPhase,
    chestOpen,
    reelItems: reelItems.length ? reelItems : Array.from({ length: 10 }, () => CHEST_ITEMS[0]),
    wonItem,
    reelRef,
    openChest,
    resetChest,

    inventory,
    toggleEquip,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
