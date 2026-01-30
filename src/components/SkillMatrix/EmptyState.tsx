import React from "react";
import { Box, Card, Center, Stack, Text, Title } from "@mantine/core";
import { IconDatabaseOff } from "@tabler/icons-react";

export const EmptyState: React.FC = () => {
  return (
    <Box p="xl">
      <Title order={2} mb="lg">
        Qualifizierungsmatrix
      </Title>
      <Card
        withBorder
        radius="md"
        p={50}
        style={{ borderStyle: "dashed" }}
      >
        <Center>
          <Stack align="center" gap="xs">
            <IconDatabaseOff
              size={50}
              style={{ color: "var(--mantine-color-dimmed)" }}
              stroke={1.5}
            />
            <Text fw={700} size="lg" c="dimmed">
              Keine Daten verfügbar
            </Text>
            <Text size="sm" c="dimmed" ta="center" style={{ maxWidth: 400 }}>
              Damit die Matrix angezeigt werden kann, müssen zuerst
              **Mitarbeiter** und **Kategorien/Skills** in den entsprechenden
              Menüpunkten angelegt werden.
            </Text>
          </Stack>
        </Center>
      </Card>
    </Box>
  );
};
