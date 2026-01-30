import React from "react";
import { Menu, Badge, Text, Group, Stack } from "@mantine/core";
import { LEVELS } from "../../constants/skillLevels";

interface BulkLevelMenuProps {
  label: string;
  onSelectLevel: (level: number) => void;
  children: React.ReactNode;
}

export const BulkLevelMenu: React.FC<BulkLevelMenuProps> = ({
  label,
  onSelectLevel,
  children,
}) => {
  return (
    <Menu shadow="md" width="auto">
      <Menu.Target>{children}</Menu.Target>
      <Menu.Dropdown p="sm">
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            {label}
          </Text>
          <Group gap="xs">
            {LEVELS.map((lvl) => (
              <Badge
                key={lvl.value}
                color={lvl.value === -1 ? "gray.3" : lvl.color}
                variant={lvl.value <= 0 ? "light" : "filled"}
                onClick={() => onSelectLevel(lvl.value)}
                style={{
                  cursor: "pointer",
                  minWidth: 42,
                  fontSize: "10px",
                  opacity: lvl.value === -1 ? 0.6 : 1,
                  border:
                    lvl.value === -1
                      ? "1px dashed var(--mantine-color-default-border)"
                      : "none",
                }}
              >
                {lvl.label}
              </Badge>
            ))}
          </Group>
        </Stack>
      </Menu.Dropdown>
    </Menu>
  );
};
