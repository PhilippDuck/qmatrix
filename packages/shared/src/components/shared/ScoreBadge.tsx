import React from "react";
import { Badge, Text } from "@mantine/core";
import { getScoreColor } from "../../utils/skillCalculations";

interface ScoreBadgeProps {
  score: number | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "filled" | "light" | "outline";
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  size = "xs",
  variant = "filled",
}) => {
  return (
    <Badge size={size} variant={variant} color={getScoreColor(score)}>
      {score === null ? "N/A" : `${score}%`}
    </Badge>
  );
};

interface ScoreTextProps {
  score: number | null;
  size?: string;
  fw?: number;
}

export const ScoreText: React.FC<ScoreTextProps> = ({
  score,
  size = "xs",
  fw = 500,
}) => {
  return (
    <Text size={size} fw={fw} c={getScoreColor(score)}>
      {score === null ? "N/A" : `${score}%`}
    </Text>
  );
};
