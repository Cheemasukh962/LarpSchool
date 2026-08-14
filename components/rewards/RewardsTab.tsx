"use client";

import { useGame } from "@/lib/game-store";
import { ChestScreen } from "./ChestScreen";
import { RewardsHub } from "./RewardsHub";
import { SlotsScreen } from "./SlotsScreen";

export function RewardsTab() {
  const { rewardView } = useGame();

  switch (rewardView) {
    case "slots":
      return <SlotsScreen />;
    case "chest":
      return <ChestScreen />;
    case "hub":
    default:
      return <RewardsHub />;
  }
}
