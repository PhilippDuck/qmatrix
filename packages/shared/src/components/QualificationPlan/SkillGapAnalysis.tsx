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
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronRight,
  IconArrowRight,
  IconTrendingUp,
  IconPlus, // Added import
} from "@tabler/icons-react";
import { SkillGap, QualificationMeasure } from "../../store/useStore";

interface SkillGapAnalysisProps {
  gaps: SkillGap[];
  employeeId: string;
  compact?: boolean;
  measures?: QualificationMeasure[];
  onAddMeasure?: (skillId: string) => void;
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

const GapChartRow: React.FC<{
  gap: SkillGap;
  compact?: boolean;
  measures?: QualificationMeasure[];
  onAddMeasure?: (skillId: string) => void;
}> = ({
  gap,
  compact,
  measures = [],
  onAddMeasure,
}) => {
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    // Find the highest target level among active/pending measures
    const activeMeasures = measures.filter(m => m.status === 'in_progress' || m.status === 'pending');
    const maxPlannedLevel = activeMeasures.reduce((max, m) => Math.max(max, m.targetLevel), 0);
    const hasMeasure = activeMeasures.length > 0;

    // Determine if fully planned
    const isFullyPlanned = maxPlannedLevel >= gap.targetLevel;
    const plannedGrowth = Math.max(0, maxPlannedLevel - gap.currentLevel);

    return (
      <Paper withBorder p="sm" radius="md" mb="xs" bg={isDark ? "var(--mantine-color-dark-6)" : "var(--mantine-color-body)"}>
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <Text size="sm" fw={700}>{gap.skillName}</Text>
            {hasMeasure && (
              <Badge size="xs" variant="light" color="blue" leftSection={<IconTrendingUp size={10} />}>
                Geplant: {maxPlannedLevel}%
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            <Badge size="sm" variant="dot" color={gap.currentLevel >= gap.targetLevel ? 'green' : 'blue'}>
              Ist: {gap.currentLevel}%
            </Badge>
            <Badge size="sm" variant="outline" color="blue">
              Soll: {gap.targetLevel}%
            </Badge>
            {!compact && onAddMeasure && (
              <ActionIcon
                variant="subtle"
                color="blue"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onAddMeasure(gap.skillId); }}
                title={isFullyPlanned ? "Bereits vollständig geplant" : "Maßnahme hinzufügen"}
                disabled={isFullyPlanned}
              >
                <IconPlus size={16} />
              </ActionIcon>
            )}
          </Group>
        </Group>

        <Box pos="relative" h={32} mt={8} style={{ borderRadius: 8, overflow: 'hidden', backgroundColor: isDark ? 'var(--mantine-color-dark-8)' : 'var(--mantine-color-gray-1)' }}>
          {/* Grid Lines */}
          {[25, 50, 75].map((tick) => (
            <Box
              key={tick}
              pos="absolute"
              left={`${tick}%`}
              h="100%"
              w={1}
              bg={isDark ? "var(--mantine-color-dark-4)" : "var(--mantine-color-gray-3)"}
              style={{ zIndex: 1, opacity: 0.5 }}
            />
          ))}

          {/* Bars Container */}
          <Box pos="absolute" top={0} left={0} right={0} bottom={0}>
            {/* Target Bar (Background/Marker) */}
            <Box
              pos="absolute"
              left={0}
              top={0}
              bottom={0}
              w={`${gap.targetLevel}%`}
              style={{
                borderRight: '2px dashed var(--mantine-color-blue-5)',
                backgroundColor: isDark ? 'rgba(34, 139, 230, 0.2)' : 'rgba(34, 139, 230, 0.1)',
                zIndex: 2,
              }}
            />

            {/* Planned Growth Bar (Ghost bar) */}
            {plannedGrowth > 0 && (
              <Box
                pos="absolute"
                left={`${gap.currentLevel}%`}
                top={4}
                bottom={4}
                w={`${plannedGrowth}%`}
                style={{
                  zIndex: 2, // Behind current bar if overlap, but actually current is start point
                  borderRadius: '0 4px 4px 0',
                  background: `repeating-linear-gradient(
                    45deg,
                    var(--mantine-color-blue-1),
                    var(--mantine-color-blue-1) 10px,
                    var(--mantine-color-blue-2) 10px,
                    var(--mantine-color-blue-2) 20px
                  )`,
                  opacity: 0.8
                }}
              />
            )}

            {/* Current Bar (Foreground) */}
            <Box
              pos="absolute"
              left={0}
              top={4}
              bottom={4}
              w={`${gap.currentLevel}%`}
              style={{
                zIndex: 3,
                borderRadius: '0 4px 4px 0',
                transition: 'width 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)',
                background: gap.currentLevel >= gap.targetLevel
                  ? 'linear-gradient(90deg, var(--mantine-color-green-4), var(--mantine-color-green-6))'
                  : 'linear-gradient(90deg, var(--mantine-color-blue-4), var(--mantine-color-blue-6))',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
          </Box>
        </Box>

        {/* Scale Labels */}
        <Box pos="relative" h={20} mt={4}>
          {[0, 25, 50, 75, 100].map((tick) => (
            <Text
              key={tick}
              pos="absolute"
              left={`${tick}%`}
              size="xs"
              c="dimmed"
              fw={500}
              style={{ transform: 'translateX(-50%)', fontSize: '11px' }}
            >
              {tick}%
            </Text>
          ))}
        </Box>
      </Paper>
    );
  };



const CategoryGroup: React.FC<{
  group: GroupedGaps;
  compact?: boolean;
  defaultExpanded?: boolean;
  measures: QualificationMeasure[];
  onAddMeasure?: (skillId: string) => void;
}> = ({ group, compact, defaultExpanded = true, measures, onAddMeasure }) => {
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
                  <GapChartRow
                    key={gap.skillId}
                    gap={gap}
                    compact={compact}
                    measures={measures.filter(m => m.skillId === gap.skillId)}
                    onAddMeasure={onAddMeasure}
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
  measures = [],
  onAddMeasure,
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
          <Group gap="xs">
            <Badge color="blue" variant="light" size="lg">
              {(() => {
                const allSkillIds = new Set(gaps.map(g => g.skillId));
                const plannedCount = measures.filter(m => allSkillIds.has(m.skillId) && (m.status === 'pending' || m.status === 'in_progress')).length;
                return `${plannedCount} Geplant`;
              })()}
            </Badge>
            <Tooltip label="Gesamtzahl der Skill-Lücken">
              <Badge color="red" size="lg">
                {gaps.length} Defizit{gaps.length !== 1 ? "e" : ""}
              </Badge>
            </Tooltip>
          </Group>
        </Group>
      )}

      {groupedGaps.map((group) => (
        <CategoryGroup
          key={group.categoryId}
          group={group}
          compact={compact}
          defaultExpanded={!compact || groupedGaps.length === 1}
          measures={measures}
          onAddMeasure={onAddMeasure}
        />
      ))}
    </Stack>
  );
};
