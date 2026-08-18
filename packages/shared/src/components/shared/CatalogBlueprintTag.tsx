import React from "react";
import { Badge, Tooltip } from "@mantine/core";
import { isBlueprintEntity } from "../../utils/catalogVisibility";

export const CatalogBlueprintTag: React.FC<{
  entity?: { catalogSource?: string };
}> = ({ entity }) => {
  if (!isBlueprintEntity(entity)) return null;
  return (
    <Tooltip
      label="Nicht in der Matrix. Als Vorschlag nach SkillGrid Manage exportieren."
      withArrow
      multiline
      w={240}
    >
      <Badge size="xs" variant="light" color="grape" style={{ flexShrink: 0 }}>
        Blaupause
      </Badge>
    </Tooltip>
  );
};
