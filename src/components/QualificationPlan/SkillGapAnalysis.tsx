import React from "react";
import {
  Stack,
  Group,
  Text,
  Progress,
  Paper,
  Badge,
  ThemeIcon,
  Collapse,
  ActionIcon,
  Tooltip,
  Box,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronRight,
  IconArrowRight,
  IconTrendingUp,
} from "@tabler/icons-react";
import { SkillGap } from "../../context/DataContext";

interface SkillGapAnalysisProps {
  gaps: SkillGap[];
  employeeId: string;
  compact?: boolean;
}

interface GroupedGaps {
  categoryId: string;
  categoryName: string;
  subCategories: {
    subCategoryId: string;
    subCategoryName: string;
    gaps: SkillGap[];
  }[];
}

const GapProgressBar: React.FC<{ gap: SkillGap; compact?: boolean }> = ({
  gap,
  compact,
}) => {
  const currentPercent = gap.currentLevel;
  const targetPercent = gap.targetLevel;

  return (
    <Paper p={compact ? "xs" : "sm"} radius="sm" withBorder>
      <Group justify="space-between" mb={compact ? 4 : 8}>
        <Text size={compact ? "xs" : "sm"} fw={500}>
          {gap.skillName}
        </Text>
        <Group gap={4}>
          <Badge size="xs" color="gray" variant="light">
            {gap.currentLevel}%
          </Badge>
          <IconArrowRight size={12} />
          <Badge size="xs" color="blue" variant="light">
            {gap.targetLevel}%
          </Badge>
          <Badge size="xs" color="red" variant="outline">
            +{gap.gap}%
          </Badge>
        </Group>
      </Group>

      <Box pos="relative">
        {/* Background (Target) */}
        <Progress
          value={targetPercent}
          color="blue"
          size={compact ? "sm" : "md"}
          radius="xl"
          style={{ opacity: 0.3 }}
        />
        {/* Foreground (Current) */}
        <Progress
          value={currentPercent}
          color="green"
          size={compact ? "sm" : "md"}
          radius="xl"
          style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        />
      </Box>
    </Paper>
  );
};

const CategoryGroup: React.FC<{
  group: GroupedGaps;
  compact?: boolean;
  defaultExpanded?: boolean;
}> = ({ group, compact, defaultExpanded = true }) => {
  const [opened, { toggle }] = useDisclosure(defaultExpanded);
  const totalGaps = group.subCategories.reduce(
    (acc, sub) => acc + sub.gaps.length,
    0
  );

  return (
    <Paper p={compact ? "xs" : "sm"} radius="md" withBorder>
      <Group
        justify="space-between"
        style={{ cursor: "pointer" }}
        onClick={toggle}
      >
        <Group gap="xs">
          <ActionIcon variant="subtle" size="sm">
            {opened ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </ActionIcon>
          <Text fw={600} size={compact ? "sm" : "md"}>
            {group.categoryName}
          </Text>
        </Group>
        <Badge color="red" variant="light" size={compact ? "xs" : "sm"}>
          {totalGaps} Defizit{totalGaps !== 1 ? "e" : ""}
        </Badge>
      </Group>

      <Collapse in={opened}>
        <Stack gap="sm" mt="sm">
          {group.subCategories.map((subCat) => (
            <Box key={subCat.subCategoryId}>
              {group.subCategories.length > 1 && (
                <Text size="xs" c="dimmed" mb={4}>
                  {subCat.subCategoryName}
                </Text>
              )}
              <Stack gap="xs">
                {subCat.gaps.map((gap) => (
                  <GapProgressBar
                    key={gap.skillId}
                    gap={gap}
                    compact={compact}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Paper>
  );
};

export const SkillGapAnalysis: React.FC<SkillGapAnalysisProps> = ({
  gaps,
  employeeId,
  compact = false,
}) => {
  // Group gaps by category and subcategory
  const groupedGaps: GroupedGaps[] = [];

  gaps.forEach((gap) => {
    let categoryGroup = groupedGaps.find(
      (g) => g.categoryId === gap.categoryId
    );
    if (!categoryGroup) {
      categoryGroup = {
        categoryId: gap.categoryId,
        categoryName: gap.categoryName,
        subCategories: [],
      };
      groupedGaps.push(categoryGroup);
    }

    let subCategoryGroup = categoryGroup.subCategories.find(
      (s) => s.subCategoryId === gap.subCategoryId
    );
    if (!subCategoryGroup) {
      subCategoryGroup = {
        subCategoryId: gap.subCategoryId,
        subCategoryName: gap.subCategoryName,
        gaps: [],
      };
      categoryGroup.subCategories.push(subCategoryGroup);
    }

    subCategoryGroup.gaps.push(gap);
  });

  // Sort by total gap size (largest first)
  groupedGaps.sort((a, b) => {
    const aTotal = a.subCategories.reduce(
      (acc, sub) => acc + sub.gaps.reduce((acc2, g) => acc2 + g.gap, 0),
      0
    );
    const bTotal = b.subCategories.reduce(
      (acc, sub) => acc + sub.gaps.reduce((acc2, g) => acc2 + g.gap, 0),
      0
    );
    return bTotal - aTotal;
  });

  if (gaps.length === 0) {
    return (
      <Paper p="lg" radius="md" withBorder ta="center">
        <ThemeIcon variant="light" size="xl" radius="xl" color="green" mx="auto">
          <IconTrendingUp size={24} />
        </ThemeIcon>
        <Text mt="md" fw={500}>
          Keine Defizite gefunden
        </Text>
        <Text size="sm" c="dimmed">
          Der Mitarbeiter erfüllt alle Skill-Anforderungen der Zielrolle.
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap={compact ? "xs" : "sm"}>
      {!compact && (
        <Group justify="space-between">
          <Text fw={600}>Skill-Defizite</Text>
          <Tooltip label="Gesamtzahl der Skill-Lücken">
            <Badge color="red" size="lg">
              {gaps.length} Defizit{gaps.length !== 1 ? "e" : ""}
            </Badge>
          </Tooltip>
        </Group>
      )}

      {groupedGaps.map((group) => (
        <CategoryGroup
          key={group.categoryId}
          group={group}
          compact={compact}
          defaultExpanded={!compact || groupedGaps.length === 1}
        />
      ))}
    </Stack>
  );
};
