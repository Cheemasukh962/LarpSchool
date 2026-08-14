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

  switch (battleStep) {
    case "claim":
      return <ClaimScreen />;
    case "profile":
      return <ProfileScreen />;
    case "challenger-select":
      return <ChallengerSelectScreen />;
    case "pick":
      return <PickChallengerScreen />;
    case "faceoff":
      return <FaceoffScreen />;
    case "result":
      return <ResultScreen />;
    case "trivia":
      return <TriviaScreen />;
    case "type-select":
    default:
      return <TypeSelectScreen />;
  }
}
