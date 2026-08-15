"use client";

import { Check, Coins } from "lucide-react";

import { useGame } from "@/lib/game-store";
import { ScreenHeader, TokenPill, monoS, pxS } from "../pixel";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function TriviaScreen() {
  const { question, triviaAns, triviaAnswered, triviaCorrect, answerTrivia, nextQuestion, setBattleStep, tokens, rewardError } =
    useGame();

  if (!question) return null;

  const answered = triviaAns !== null;
  const correct = triviaAns === question.correct;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <ScreenHeader
        title="YC TRIVIA"
        onBack={() => setBattleStep("type-select")}
        right={<TokenPill tokens={tokens} />}
      />

      <div className="flex shrink-0 items-center justify-between border-b border-[#ffd700]/10 px-5 py-2">
        <div style={pxS("5px")} className="text-white/30">
          CORRECT {triviaCorrect}/{triviaAnswered}
        </div>
        {/* Deliberately not showing question.kind: "trap" would give the trick away. */}
        <div style={pxS("5px")} className="text-[#ffd700]/50">
          {question.company.toUpperCase()}
        </div>
      </div>
      {rewardError && (
        <div style={pxS("5px")} className="px-5 pt-2 text-[#ef4444]">
          {rewardError}
        </div>
      )}

      <div className="flex flex-col gap-5 px-5 py-5">
        {/* company card */}
        <div
          className="flex flex-col items-center gap-4 border-2 p-5"
          style={{ borderColor: question.color + "66", background: question.bg, boxShadow: `0 0 24px ${question.color}22` }}
        >
          <div
            className="flex h-20 w-20 items-center justify-center border-2 font-mono font-black text-white"
            style={{
              borderColor: question.color,
              background: question.color + "22",
              fontSize: 36,
              boxShadow: `0 0 16px ${question.color}55, 4px 4px 0 ${question.color}44`,
            }}
          >
            {question.initial}
          </div>
          <div className="text-center">
            <div style={pxS("13px")} className="leading-snug text-white">
              {question.company.toUpperCase()}
            </div>
            {question.tagline && (
              <div
                style={pxS("5px")}
                className={`mt-2 leading-loose ${answered ? "text-white/40" : "text-white/20"}`}
              >
                {answered ? question.tagline.toUpperCase() : "WHAT DO THEY BUILD?"}
              </div>
            )}
          </div>
        </div>

        {/* question */}
        <div className="border-l-2 border-[#ffd700] pl-4">
          <div style={monoS(12)} className="leading-relaxed text-white">
            {question.question}
          </div>
        </div>

        {/* options */}
        <div className="flex flex-col gap-2">
          {question.options.map((opt, i) => {
            const isSelected = triviaAns === i;
            const isCorrect = i === question.correct;
            let borderCol = "#ffd70030";
            let bgCol = "#0a0a0a";
            let textCol = "#ffffff99";
            if (answered) {
              if (isCorrect) {
                borderCol = "#22c55e";
                bgCol = "#001a08";
                textCol = "#22c55e";
              } else if (isSelected) {
                borderCol = "#ef4444";
                bgCol = "#1a0000";
                textCol = "#ef4444";
              } else {
                borderCol = "#ffd70015";
                textCol = "#ffffff30";
              }
            } else if (isSelected) {
              borderCol = "#ffd700";
              bgCol = "#140d00";
              textCol = "#ffd700";
            }

            return (
              <button
                key={i}
                data-testid="trivia-option"
                disabled={answered}
                onClick={() => answerTrivia(i)}
                className="flex items-center gap-3 border-2 px-4 py-3 text-left transition active:scale-[.98]"
                style={{
                  borderColor: borderCol,
                  background: bgCol,
                  boxShadow:
                    answered && isCorrect
                      ? "0 0 12px #22c55e44"
                      : answered && isSelected
                        ? "0 0 8px #ef444433"
                        : "none",
                }}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-xs font-bold"
                  style={{ borderColor: textCol, color: textCol }}
                >
                  {LETTERS[i]}
                </div>
                <div style={{ ...monoS(10), color: textCol, lineHeight: 1.5 }}>{opt}</div>
                {answered && isCorrect && <Check size={14} className="ml-auto shrink-0 text-[#22c55e]" />}
              </button>
            );
          })}
        </div>

        {/* feedback */}
        {answered && (
          <div
            className={`flex flex-col items-center gap-3 border-2 p-4 text-center ${
              correct ? "border-[#22c55e]/40 bg-[#001a08]" : "border-[#ef4444]/30 bg-[#1a0000]"
            }`}
          >
            {correct ? (
              <>
                <div style={pxS("10px")} className="text-[#22c55e]">
                  CORRECT!
                </div>
                <div className="flex items-center gap-2 text-[#ffd700]" style={pxS("9px")}>
                  <Coins size={14} /> +1 TOKEN EARNED
                </div>
              </>
            ) : (
              <div style={pxS("9px")} className="text-[#ef4444]">
                WRONG ANSWER
              </div>
            )}

            {question.explain && (
              <div style={monoS(10)} className="leading-relaxed text-white/45">
                {question.explain}
              </div>
            )}

            <div className="mt-1 flex w-full gap-3">
              <button
                onClick={nextQuestion}
                className="flex-1 border-2 border-[#ffd700]/40 py-3 text-white/60 transition hover:border-[#ffd700] hover:text-white"
                style={pxS("6px")}
              >
                NEXT
              </button>
              <button
                onClick={() => setBattleStep("type-select")}
                className="flex-1 py-3 text-[#0a0a0a]"
                style={{ ...pxS("6px"), background: "#ffd700", boxShadow: "3px 3px 0 #b8860b" }}
              >
                DONE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
