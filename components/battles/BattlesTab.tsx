"use client";

import { useGame } from "@/lib/game-store";
import { ChallengerSelectScreen } from "./ChallengerSelectScreen";
import { ClaimScreen } from "./ClaimScreen";
import { FaceoffScreen } from "./FaceoffScreen";
import { PickChallengerScreen } from "./PickChallengerScreen";
import { ProfileScreen } from "./ProfileScreen";
import { ResultScreen } from "./ResultScreen";
import { TriviaScreen } from "./TriviaScreen";
import { TypeSelectScreen } from "./TypeSelectScreen";

export function BattlesTab() {
  const { battleStep } = useGame();

  let screen;
  switch (battleStep) {
    case "claim":
      screen = <ClaimScreen />;
      break;
    case "profile":
      screen = <ProfileScreen />;
      break;
    case "challenger-select":
      screen = <ChallengerSelectScreen />;
      break;
    case "pick":
      screen = <PickChallengerScreen />;
      break;
    case "faceoff":
      screen = <FaceoffScreen />;
      break;
    case "result":
      screen = <ResultScreen />;
      break;
    case "trivia":
      screen = <TriviaScreen />;
      break;
    case "type-select":
    default:
      screen = <TypeSelectScreen />;
  }

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{screen}</div>;
}
