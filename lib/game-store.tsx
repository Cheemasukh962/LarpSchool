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
  reelStopX,
  weightedChestItem,
  CHEST_COST,
  PREVIEW_REEL,
  WINNER_IDX,
  type ChestItem,
  type OwnedItem,
} from "./chest";
import { clampEquipped, dropItem, payoutMultiplier, sumGear, toggleEquipped, type GearBonus } from "./gear";
import {
  fetchMe,
  postBattleCredit,
  postChest,
  postClaim,
  postDrop,
  postEquip,
  postGuest,
  postRelease,
  postSpin,
  postTriviaCredit,
  postVerdict,
} from "./session-client";
import type { FlavorVerdict } from "./flavor-types";
import { guestCard, isGuestId } from "./adapt";
import { drawSpin, evaluateSpin, pickSymbol, symbolById, SLOT_SYMBOLS, JACKPOT_SEED, type SlotSymbol } from "./slots";
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

export type { OwnedItem } from "./chest";

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
  rewardError: string | null;

  /* player */
  playerCard: Card | null;
  claimCard: (card: Card) => void;
  enterGuest: (name: string) => void;
  clearCard: () => void;
  claimError: string | null;
  persistOn: boolean;
  gear: GearBonus;

  /* battle */
  battleStep: BattleStep;
  setBattleStep: (s: BattleStep) => void;
  challenger: Card | null;
  chooseChallenger: (card: Card) => void;
  chooseRandomChallenger: () => void;
  guessId: string | null;
  submitGuess: (id: string) => void;
  battleResult: BattleResult | null;
  flavor: FlavorVerdict | null;
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
  tossItem: (uid: string) => void;
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

function walletMsg(err: unknown): string {
  const code = err instanceof Error ? err.message : String(err);
  if (code === "insufficient") return "NOT ENOUGH TOKENS";
  if (code === "rate_limited") return "TOO FAST — WAIT A BEAT";
  if (code === "missing_rpc") return "RUN PHASE 3 SQL IN SUPABASE";
  if (code === "no_claim") return "CLAIM A CARD FIRST";
  if (code.includes("QUEUED") || code.includes("OFFLINE")) return "OFFLINE — QUEUED";
  return code.replace(/_/g, " ").toUpperCase();
}

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
  const [inventory, setInventory] = useState<OwnedItem[]>([]);
  const inventoryRef = useRef<OwnedItem[]>([]);
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [persistOn, setPersistOn] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const gear = useMemo(() => sumGear(inventory.filter((i) => i.equipped === true)), [inventory]);

  /* ── battle ── */
  const [battleStep, setBattleStep] = useState<BattleStep>("type-select");
  const [challenger, setChallenger] = useState<Card | null>(null);
  const [guessId, setGuessId] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [flavor, setFlavor] = useState<FlavorVerdict | null>(null);
  const [guessedRight, setGuessedRight] = useState<boolean | null>(null);
  const [battlesWon, setBattlesWon] = useState(0);

  const claimCard = useCallback((card: Card) => {
    setClaimError(null);
    void postClaim(card.id).then(
      () => {
        setPlayerCard(card);
        setBattleStep("profile");
      },
      (err) => setClaimError(err instanceof Error ? err.message : String(err))
    );
  }, []);

  const enterGuest = useCallback((name: string) => {
    setClaimError(null);
    void postGuest(name).then(
      (me) => {
        setPlayerCard(guestCard(name, me.battlerId ?? undefined));
        setBattleStep("profile");
      },
      (err) => setClaimError(err instanceof Error ? err.message : String(err))
    );
  }, []);

  const clearCard = useCallback(() => {
    setPlayerCard(null);
    setChallenger(null);
    setBattleResult(null);
    setClaimError(null);
    setBattleStep("claim");
    void postRelease().catch(() => undefined);
  }, []);

  const chooseChallenger = useCallback((card: Card) => {
    setChallenger(card);
    setGuessId(null);
    setBattleResult(null);
    setFlavor(null);
    setGuessedRight(null);
    setBattleStep("faceoff");
  }, []);

  const chooseRandomChallenger = useCallback(() => {
    if (!data) return;
    chooseChallenger(randomCard(data.cards, playerCard?.id));
  }, [data, playerCard, chooseChallenger]);

  /**
   * Face-off is a bet, not a vote that changes the rubric. The LinkedIn scores still
   * decide who actually won the LARP. YOU WIN / the token follow whether you called
   * that side — so betting on a stronger opponent can pay, and betting on yourself
   * when they outscore you does not.
   */
  const submitGuess = useCallback(
    (id: string) => {
      if (!playerCard || !challenger || !sessionReady) return;
      const fighter =
        gear.flex > 0 ? { ...playerCard, flex_score: playerCard.flex_score + gear.flex } : playerCard;
      const result = resolveBattle(fighter, challenger);
      const playerWon = result.winner_id === playerCard.id;
      const called = id === result.winner_id;
      setGuessId(id);
      setGuessedRight(called);
      setBattleResult({ ...result, player_won: playerWon, bet_won: called, gear_flex: gear.flex });
      setFlavor(null);
      setBattleStep("result");
      setRewardError(null);
      void postVerdict({
        winnerId: result.winner_id,
        loserId: result.loser_id,
        winnerName: result.winner_name,
        loserName: result.loser_name,
        winnerScore: result.winner_score,
        loserScore: result.loser_score,
        margin: result.margin,
        photoFinish: result.photo_finish,
        tiebreak: result.tiebreak,
      }).then(
        (row) => {
          if (row.source === "groq") setFlavor(row);
        },
        () => undefined
      );
      if (persistOn) {
        void postBattleCredit({
          challengerId: challenger.id,
          guessId: id,
          key: crypto.randomUUID(),
        }).then(
          (row) => {
            setTokens(row.tokens);
            setBattlesWon(row.battlesWon);
          },
          (err) => setRewardError(walletMsg(err))
        );
      } else if (called) {
        setBattlesWon((n) => n + 1);
        setTokens((t) => t + 1);
      }
    },
    [playerCard, challenger, gear.flex, persistOn, sessionReady]
  );

  const restartBattle = useCallback(() => {
    setChallenger(null);
    setGuessId(null);
    setBattleResult(null);
    setFlavor(null);
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
      if (!question || triviaAns !== null || !sessionReady) return;
      setTriviaAns(index);
      if (persistOn) {
        void postTriviaCredit({
          questionId: question.id,
          answerIndex: index,
          key: crypto.randomUUID(),
        }).then(
          (row) => {
            setTokens(row.tokens);
            setTriviaCorrect(row.triviaCorrect);
            setTriviaAnswered(row.triviaAnswered);
          },
          (err) => setRewardError(walletMsg(err))
        );
      } else {
        setTriviaAnswered((n) => n + 1);
        if (index === question.correct) {
          setTriviaCorrect((n) => n + 1);
          setTokens((t) => t + 1);
        }
      }
    },
    [question, triviaAns, persistOn, sessionReady]
  );

  const nextQuestion = useCallback(() => {
    setDeckPos((p) => p + 1);
    setTriviaAns(null);
  }, []);

  useEffect(() => {
    if (!data) return;
    let alive = true;
    fetchMe()
      .then((me) => {
        if (!alive) return;
        setPersistOn(me.mode === "supabase");
        if (me.mode === "supabase") {
          setTokens(me.tokens);
          setJackpot(me.jackpot ?? JACKPOT_SEED);
          setInventory(clampEquipped(me.inventory ?? []));
          setBattlesWon(me.battlesWon);
          setTriviaCorrect(me.triviaCorrect);
          setTriviaAnswered(me.triviaAnswered);
          if (me.isGuest && me.displayName) {
            setPlayerCard(guestCard(me.displayName, me.battlerId ?? undefined));
            setBattleStep("challenger-select");
          } else if (me.battlerId && !isGuestId(me.battlerId)) {
            const card = data.byId.get(me.battlerId);
            if (card) {
              setPlayerCard(card);
              setBattleStep("challenger-select");
            }
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setSessionReady(true);
      });
    return () => {
      alive = false;
    };
  }, [data]);

  /* Phase 3: tokens / inventory / wins are written by the wallet APIs, not a debounce dump. */

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

  const playReel = useCallback(
    (outcomeReels: [SlotSymbol, SlotSymbol, SlotSymbol], paid: number, nextTokens: number, nextJackpot: number, hit: boolean) => {
      let count = 0;
      const tick = setInterval(() => {
        count++;
        setReels([
          count > SPIN_STOPS[0] ? outcomeReels[0] : pickSymbol(gear.luck),
          count > SPIN_STOPS[1] ? outcomeReels[1] : pickSymbol(gear.luck),
          count > SPIN_STOPS[2] ? outcomeReels[2] : pickSymbol(gear.luck),
        ]);
        if (count > SPIN_STOPS[2]) {
          clearInterval(tick);
          setReels(outcomeReels);
          const settle = setTimeout(() => {
            setJackpot(nextJackpot);
            setTokens(nextTokens);
            setLastWin(paid);
            setIsJackpot(hit);
            setSlotPhase("result");
          }, 400);
          spinTimers.current.push(settle);
        }
      }, SPIN_TICK_MS);
      spinTimers.current.push(tick as unknown as ReturnType<typeof setTimeout>);
    },
    [gear.luck]
  );

  const spinSlots = useCallback(() => {
    if (!sessionReady || slotPhase === "spinning" || tokens < bet) return;
    setRewardError(null);
    setSlotPhase("spinning");
    setLastWin(null);
    setIsJackpot(false);
    setTokens((t) => t - bet);

    if (persistOn) {
      const key = crypto.randomUUID();
      void postSpin({ bet, key }).then(
        (row) => {
          const outcomeReels: [SlotSymbol, SlotSymbol, SlotSymbol] = [
            symbolById(row.reels[0]),
            symbolById(row.reels[1]),
            symbolById(row.reels[2]),
          ];
          playReel(outcomeReels, row.win, row.tokens, row.jackpot, row.jackpotHit);
        },
        (err) => {
          setTokens((t) => t + bet);
          setSlotPhase("idle");
          setRewardError(walletMsg(err));
        }
      );
      return;
    }

    const nextJackpot = jackpot + Math.ceil(bet / 2);
    setJackpot(nextJackpot);
    const outcome = drawSpin(bet, jackpot, gear.luck);
    const final = evaluateSpin(outcome.reels, bet, jackpot);
    const paid = final.jackpot ? final.win : Math.floor(final.win * payoutMultiplier(gear.payout));
    playReel(outcome.reels, paid, tokens - bet + paid, final.jackpot ? JACKPOT_SEED : nextJackpot, final.jackpot);
  }, [slotPhase, tokens, bet, jackpot, gear.luck, gear.payout, persistOn, playReel, sessionReady]);

  /* ── chest ── */
  const [chestPhase, setChestPhase] = useState<ChestPhase>("idle");
  const [chestOpen, setChestOpen] = useState(false);
  const [reelItems, setReelItems] = useState<ChestItem[]>([]);
  const [wonItem, setWonItem] = useState<ChestItem | null>(null);
  const reelRef = useRef<HTMLDivElement | null>(null);
  const chestTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

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

  const rollChestTo = useCallback((winner: ChestItem, onReveal: () => void) => {
    setWonItem(winner);
    setReelItems(buildReel(winner));
    const lid = setTimeout(() => {
      setChestPhase("spinning");
      const el = reelRef.current;
      if (el) {
        el.style.transition = "none";
        el.style.transform = "translateX(0px)";
        el.getBoundingClientRect();
        const stopX = reelStopX(el, WINNER_IDX);
        el.style.transition = "transform 5s cubic-bezier(0.05,0,0.18,1)";
        el.style.transform = `translateX(${stopX}px)`;
      }
      const reveal = setTimeout(() => {
        setChestPhase("reveal");
        onReveal();
      }, CHEST_ROLL_MS);
      chestTimers.current.push(reveal);
    }, 450);
    chestTimers.current.push(lid);
  }, []);

  const openChest = useCallback(() => {
    if (!sessionReady || tokens < CHEST_COST || chestPhase !== "idle") return;
    setRewardError(null);
    setChestPhase("opening");
    setChestOpen(true);

    if (persistOn) {
      void postChest({ key: crypto.randomUUID() }).then(
        (row) => {
          setTokens(row.tokens);
          rollChestTo(row.item, () => setInventory(clampEquipped(row.inventory)));
        },
        (err) => {
          resetChest();
          setRewardError(walletMsg(err));
        }
      );
      return;
    }

    const winner = weightedChestItem(gear.luck);
    setTokens((t) => t - CHEST_COST);
    rollChestTo(winner, () => {
      setInventory((inv) => [...inv, { ...winner, uid: Math.random().toString(36).slice(2), equipped: false }]);
    });
  }, [tokens, chestPhase, gear.luck, persistOn, rollChestTo, resetChest, sessionReady]);

  const toggleEquip = useCallback(
    (uid: string) => {
      const next = toggleEquipped(inventoryRef.current, uid);
      inventoryRef.current = next;
      setInventory(next);
      if (!persistOn) return;
      const desired = next.find((i) => i.uid === uid)?.equipped === true;
      void postEquip(uid, desired).then(
        (row) => {
          const saved = clampEquipped(row.inventory);
          inventoryRef.current = saved;
          setInventory(saved);
        },
        (err) => setRewardError(walletMsg(err))
      );
    },
    [persistOn]
  );

  const tossItem = useCallback(
    (uid: string) => {
      const prev = inventoryRef.current;
      const next = dropItem(prev, uid);
      if (next.length === prev.length) return;
      inventoryRef.current = next;
      setInventory(next);
      if (!persistOn) return;
      void postDrop(uid).then(
        (row) => {
          const saved = clampEquipped(row.inventory);
          inventoryRef.current = saved;
          setInventory(saved);
        },
        (err) => {
          inventoryRef.current = prev;
          setInventory(prev);
          setRewardError(walletMsg(err));
        }
      );
    },
    [persistOn]
  );

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
    rewardError,

    playerCard,
    claimCard,
    enterGuest,
    clearCard,
    claimError,
    persistOn,
    gear,

    battleStep,
    setBattleStep,
    challenger,
    chooseChallenger,
    chooseRandomChallenger,
    guessId,
    submitGuess,
    battleResult,
    flavor,
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
    reelItems: reelItems.length ? reelItems : PREVIEW_REEL,
    wonItem,
    reelRef,
    openChest,
    resetChest,

    inventory,
    toggleEquip,
    tossItem,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
