import React from "react";
import { Tooltip, Box, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

interface InfoTooltipProps {
  title: string;
  description?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  description,
}) => {
  if (!description) return null;
  return (
    <Tooltip
      multiline
      w={250}
      withArrow
      label={
        <Box p={2}>
          <Text fw={700} size="xs" mb={2}>
            {title}
          </Text>
          <Text size="xs" style={{ lineHeight: 1.4 }}>
            {description}
          </Text>
        </Box>
      }
    >
      <Box style={{ cursor: "help", display: "flex", alignItems: "center" }}>
        <IconInfoCircle size={15} color="#adb5bd" />
      </Box>
    </Tooltip>
  );
};
