import React from "react";
import {
  Box,
  HoverCard,
  Stack,
  Text,
  Group,
  Badge,
  Divider,
  ActionIcon,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { LEVELS } from "../../constants/skillLevels";

const TriangleIndicator: React.FC<{
  color: string;
  position: "top" | "bottom";
}> = ({ color, position }) => (
  <div
    style={{
      width: 0,
      height: 0,
      borderLeft: "8px solid transparent",
      ...(position === "bottom"
        ? { borderBottom: `8px solid ${color}` }
        : { borderTop: `8px solid ${color}` }),
    }}
  />
);

const DotIndicator: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{
      width: 8,
      height: 8,
      borderRadius: "50%",
      backgroundColor: color,
    }}
  />
);

export const MatrixLegend: React.FC<{ trigger?: React.ReactNode }> = ({ trigger }) => {
  return (
    <HoverCard width={340} shadow="md" position="bottom-end" openDelay={200} closeDelay={150}>
      <HoverCard.Target>
        {trigger || (
          <ActionIcon variant="light" color="gray" size="lg">
            <IconInfoCircle size={20} />
          </ActionIcon>
        )}
      </HoverCard.Target>
      <HoverCard.Dropdown style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <Stack gap="md">
          {/* Kompetenzstufen */}
          <Box>
            <Text size="xs" fw={700} c="dimmed" mb="xs" tt="uppercase">
              Kompetenzstufen
            </Text>
            <Stack gap="xs">
              {LEVELS.filter((l) => l.value > 0).map((l) => (
                <Group key={l.value} wrap="nowrap" align="flex-start">
                  <Badge
                    color={l.color}
                    size="sm"
                    style={{ minWidth: "55px" }}
                  >
                    {l.value}%
                  </Badge>
                  <Box>
                    <Text size="xs" fw={700}>
                      {l.title}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {l.description}
                    </Text>
                  </Box>
                </Group>
              ))}
            </Stack>
          </Box>

          <Divider variant="dashed" />

          {/* Status-Werte */}
          <Box>
            <Text size="xs" fw={700} c="dimmed" mb="xs" tt="uppercase">
              Status-Werte
            </Text>
            <Stack gap="xs">
              <Group wrap="nowrap" align="flex-start">
                <Badge color="gray" size="sm" style={{ minWidth: "55px" }}>
                  0%
                </Badge>
                <Box>
                  <Text size="xs" fw={700}>
                    Keine Kenntnisse
                  </Text>
                  <Text size="xs" c="dimmed">
                    Bisher keine Erfahrung vorhanden.
                  </Text>
                </Box>
              </Group>
              <Group wrap="nowrap" align="flex-start">
                <Badge color="gray.6" size="sm" style={{ minWidth: "55px" }}>
                  N/A
                </Badge>
                <Box>
                  <Text size="xs" fw={700}>
                    Nicht relevant (N/A)
                  </Text>
                  <Text size="xs" c="dimmed">
                    Wird bei der Berechnung ignoriert.
                  </Text>
                </Box>
              </Group>
            </Stack>
          </Box>

          <Divider variant="dashed" />

          {/* Zell-Indikatoren */}
          <Box>
            <Text size="xs" fw={700} c="dimmed" mb="xs" tt="uppercase">
              Zell-Indikatoren
            </Text>
            <Stack gap="sm">
              {/* Individuelles Soll */}
              <Box>
                <Text size="xs" fw={600} mb={4}>Individuelles Soll</Text>
                <Stack gap={4}>
                  <Group wrap="nowrap" gap="xs">
                    <Box style={{ width: 20, display: "flex", justifyContent: "center" }}>
                      <TriangleIndicator color="var(--mantine-color-orange-filled)" position="bottom" />
                    </Box>
                    <Text size="xs" c="dimmed">Unter individuellem Ziel (Defizit)</Text>
                  </Group>
                  <Group wrap="nowrap" gap="xs">
                    <Box style={{ width: 20, display: "flex", justifyContent: "center" }}>
                      <TriangleIndicator color="var(--mantine-color-green-filled)" position="bottom" />
                    </Box>
                    <Text size="xs" c="dimmed">Individuelles Ziel erreicht</Text>
                  </Group>
                </Stack>
              </Box>

              {/* Rollen-Soll */}
              <Box>
                <Text size="xs" fw={600} mb={4}>Rollen-Soll</Text>
                <Stack gap={4}>
                  <Group wrap="nowrap" gap="xs">
                    <Box style={{ width: 20, display: "flex", justifyContent: "center" }}>
                      <TriangleIndicator color="var(--mantine-color-orange-filled)" position="top" />
                    </Box>
                    <Text size="xs" c="dimmed">Unter Rollen-Anforderung (Defizit)</Text>
                  </Group>
                  <Group wrap="nowrap" gap="xs">
                    <Box style={{ width: 20, display: "flex", justifyContent: "center" }}>
                      <TriangleIndicator color="var(--mantine-color-green-filled)" position="top" />
                    </Box>
                    <Text size="xs" c="dimmed">Rollen-Anforderung erfüllt</Text>
                  </Group>
                </Stack>
              </Box>

              {/* Schulung */}
              <Box>
                <Text size="xs" fw={600} mb={4}>Schulungsmaßnahmen</Text>
                <Stack gap={4}>
                  <Group wrap="nowrap" gap="xs">
                    <Box style={{ width: 20, display: "flex", justifyContent: "center" }}>
                      <DotIndicator color="var(--mantine-color-blue-filled)" />
                    </Box>
                    <Text size="xs" c="dimmed">Schulung läuft</Text>
                  </Group>
                  <Group wrap="nowrap" gap="xs">
                    <Box style={{ width: 20, display: "flex", justifyContent: "center" }}>
                      <DotIndicator color="var(--mantine-color-gray-5)" />
                    </Box>
                    <Text size="xs" c="dimmed">Schulung geplant</Text>
                  </Group>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};
