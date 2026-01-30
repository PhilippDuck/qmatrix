import React from "react";
import { Menu } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
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
    <Menu shadow="md" width={200}>
      <Menu.Target>{children}</Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{label}</Menu.Label>
        {LEVELS.map((lvl) => (
          <Menu.Item
            key={lvl.value}
            leftSection={<IconCheck size={14} color={lvl.color} />}
            onClick={() => onSelectLevel(lvl.value)}
          >
            Alle auf {lvl.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
};
