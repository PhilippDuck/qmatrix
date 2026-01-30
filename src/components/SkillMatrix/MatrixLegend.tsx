import React from "react";
import {
  Box,
  Button,
  Collapse,
  Card,
  Stack,
  Text,
  Group,
  Badge,
  Divider,
} from "@mantine/core";
import { LEVELS } from "../../constants/skillLevels";

interface MatrixLegendProps {
  opened: boolean;
  onToggle: () => void;
}

export const MatrixLegend: React.FC<MatrixLegendProps> = ({
  opened,
  onToggle,
}) => {
  return (
    <Box mt="md">
      <Button variant="subtle" size="xs" onClick={onToggle}>
        Legende {opened ? "ausblenden" : "einblenden"}
      </Button>
      <Collapse in={opened} mt="xs">
        <Card withBorder p="md" shadow="sm">
          <Stack gap="md">
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
                  <Badge color="gray.3" size="sm" style={{ minWidth: "55px" }}>
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
          </Stack>
        </Card>
      </Collapse>
    </Box>
  );
};
