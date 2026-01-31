import React, { useState, useEffect } from "react";
import { Badge, Text, HoverCard, Stack, Group, Divider, ThemeIcon, Box, SimpleGrid, Tooltip } from "@mantine/core";
import { IconBuilding, IconHistory, IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import { getScoreColor } from "../../utils/skillCalculations";
import { Employee, Skill, Assessment, useData, AssessmentLogEntry } from "../../context/DataContext";
import { getIconByName } from "../shared/RoleIconPicker";
import { usePrivacy } from "../../context/PrivacyContext";

interface MatrixHeaderProps {
  employees: Employee[];
  focusEmployeeId: string | null;
  hoveredEmployeeId: string | null;
  onFocusChange: (employeeId: string | null) => void;
  onHoverChange: (employeeId: string | null) => void;
  calculateEmployeeAverage: (employeeId: string) => number | null;
  skills: Skill[];
  getAssessment: (empId: string, skillId: string) => Assessment | undefined;
}

const EmployeeInfoCard: React.FC<{
  emp: Employee;
  avg: number | null;
  skills: Skill[];
  getAssessment: (empId: string, skillId: string) => Assessment | undefined
}> = ({ emp, avg, skills, getAssessment }) => {
  const { getHistory, categories, subcategories, roles } = useData();
  const { anonymizeName } = usePrivacy();
  const [history, setHistory] = useState<AssessmentLogEntry[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    getHistory(emp.id!).then(data => {
      setHistory(data.sort((a, b) => b.timestamp - a.timestamp).slice(0, 3));
      setLoadingHistory(false);
    });
  }, [emp.id, getHistory]);

  const resolveContext = (skill: Skill) => {
    const sub = subcategories.find((s) => s.id === skill.subCategoryId);
    const cat = sub ? categories.find((c) => c.id === sub.categoryId) : null;
    return {
      catName: cat?.name || "-",
      subName: sub?.name || "-",
    };
  };

  // 1. Vielseitigkeit (Active Skills > 0)
  const employeeSkills = skills
    .map((skill) => ({
      skill,
      assessment: getAssessment(emp.id!, skill.id!)
    }))
    .filter((item) => item.assessment && item.assessment.level > 0);

  const activeSkillCount = employeeSkills.length; // Vielseitigkeit

  // 2. XP (Wissens-Volumen)
  const totalXP = employeeSkills.reduce((sum, item) => sum + (item.assessment?.level || 0), 0);

  // 3. Soll-Erfüllungsgrad
  let totalTarget = 0;
  let totalActualForTarget = 0;

  skills.forEach(skill => {
    const assessment = getAssessment(emp.id!, skill.id!);
    const target = assessment?.targetLevel;
    if (target !== undefined && target > 0) {
      totalTarget += target;
      totalActualForTarget += (assessment?.level || 0);
    }
  });

  const fulfillment = totalTarget > 0 ? Math.round((totalActualForTarget / totalTarget) * 100) : null;

  // Top Skills sorted by level
  const topSkills = [...employeeSkills]
    .sort((a, b) => (b.assessment?.level || 0) - (a.assessment?.level || 0))
    .slice(0, 3);

  // Learning Needs (Gaps) - Skills below target
  const learningNeeds = skills
    .map((skill) => {
      const assessment = getAssessment(emp.id!, skill.id!);
      const target = assessment?.targetLevel || 0;
      const level = assessment?.level || 0;
      return { skill, level, target, gap: level - target };
    })
    .filter(item => item.gap < 0 && item.target > 0)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 3);

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="start" wrap="nowrap">
        <Box>
          <Text fw={700} size="lg">
            {anonymizeName(emp.name, emp.id)}
          </Text>
          <Stack gap={4} mt={6}>
            {emp.department && (
              <Group gap={6}>
                <IconBuilding size={12} color="gray" />
                <Text size="xs" c="dimmed">{emp.department}</Text>
              </Group>
            )}
            {emp.role && (
              (() => {
                const role = roles.find(r => r.name === emp.role);
                const RoleIcon = getIconByName(role?.icon);
                return (
                  <Group gap={6}>
                    <RoleIcon size={12} color="gray" />
                    <Text size="xs" c="dimmed">{emp.role}</Text>
                  </Group>
                );
              })()
            )}
          </Stack>
        </Box>
      </Group>

      <Divider />

      <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
        <Tooltip
          label="Durchschnitt der aktiven Themen. Zeigt die aktuelle Qualität der Arbeit in den bekannten Feldern."
          multiline
          w={220}
          withArrow
          transitionProps={{ duration: 200 }}
        >
          <Box p="xs" bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))" style={{ borderRadius: 8, cursor: 'help' }}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Expertise</Text>
            <Text size="lg" fw={700} c={getScoreColor(avg)}>{avg || 0}%</Text>
            <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>Qualität</Text>
          </Box>
        </Tooltip>

        <Tooltip
          label="Anzahl der Themen mit Score > 0%. Zeigt die Flexibilität und Einsatzbreite."
          multiline
          w={220}
          withArrow
        >
          <Box p="xs" bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))" style={{ borderRadius: 8, cursor: 'help' }}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Vielseitigkeit</Text>
            <Text size="lg" fw={700}>{activeSkillCount}</Text>
            <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>Aktive Themen</Text>
          </Box>
        </Tooltip>

        <Tooltip
          label="Summe aller Prozentpunkte. Belohnt Breite und Einsatzbereitschaft."
          multiline
          w={220}
          withArrow
        >
          <Box p="xs" bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))" style={{ borderRadius: 8, cursor: 'help' }}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Volumen (XP)</Text>
            <Text size="lg" fw={700} c="blue">{totalXP}</Text>
            <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>Punkte Summe</Text>
          </Box>
        </Tooltip>

        <Tooltip
          label="Ist-Werte im Verhältnis zur Soll-Vorgabe. Relativiert die Leistung an den Zielen."
          multiline
          w={220}
          withArrow
        >
          <Box p="xs" bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))" style={{ borderRadius: 8, cursor: 'help' }}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Ziel-Erfüllung</Text>
            <Text size="lg" fw={700} c={fulfillment && fulfillment >= 100 ? "teal" : "orange"}>
              {fulfillment !== null ? `${fulfillment}%` : "-"}
            </Text>
            <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>Ist / Soll</Text>
          </Box>
        </Tooltip>
      </SimpleGrid>

      {topSkills.length > 0 && (
        <>
          <Divider />
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">
            Top Skills
          </Text>
          <Stack gap={8}>
            {topSkills.map((item) => {
              const ctx = resolveContext(item.skill);
              return (
                <Group
                  key={item.skill.id}
                  justify="space-between"
                  wrap="nowrap"
                  align="center"
                >
                  <Box style={{ flex: 1, overflow: "hidden" }}>
                    <Text size="sm" truncate fw={500}>
                      {item.skill.name}
                    </Text>
                    <Text size="10px" c="dimmed" truncate>
                      {ctx.catName} • {ctx.subName}
                    </Text>
                  </Box>
                  <Badge size="sm" variant="outline">
                    {item.assessment?.level}%
                  </Badge>
                </Group>
              );
            })}
          </Stack>
        </>
      )}

      {learningNeeds.length > 0 && (
        <>
          <Divider />
          <Tooltip
            label="Skills mit negativer Abweichung zum definierten Soll-Wert. Diese sollten priorisiert werden."
            multiline
            w={220}
            withArrow
          >
            <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ cursor: 'help' }}>
              Lernbedarf
            </Text>
          </Tooltip>
          <Stack gap={8}>
            {learningNeeds.map((item) => {
              const ctx = resolveContext(item.skill);
              return (
                <Group
                  key={item.skill.id}
                  justify="space-between"
                  wrap="nowrap"
                  align="center"
                >
                  <Box style={{ flex: 1, overflow: "hidden" }}>
                    <Text size="sm" truncate fw={500}>
                      {item.skill.name}
                    </Text>
                    <Text size="10px" c="dimmed" truncate>
                      {ctx.catName} • {ctx.subName}
                    </Text>
                  </Box>
                  <Group gap={4} wrap="nowrap">
                    <Badge size="xs" variant="light" color="red">{item.level}%</Badge>
                    <Text size="xs" c="dimmed">/</Text>
                    <Badge size="xs" variant="light" color="teal">{item.target}%</Badge>
                  </Group>
                </Group>
              );
            })}
          </Stack>
        </>
      )}

      {history.length > 0 && (
        <>
          <Divider />
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Historie</Text>
          </Group>
          <Stack gap={8}>
            {history.map(entry => {
              const skill = skills.find(s => s.id === entry.skillId);
              const ctx = skill ? resolveContext(skill) : { catName: '-', subName: '-' };

              return (
                <Group key={entry.id} justify="space-between" wrap="nowrap">
                  <Group gap={6} wrap="nowrap" style={{ overflow: 'hidden', flex: 1 }}>
                    {entry.newLevel > entry.previousLevel ? <IconTrendingUp size={14} color="green" style={{ flexShrink: 0 }} /> :
                      entry.newLevel < entry.previousLevel ? <IconTrendingDown size={14} color="red" style={{ flexShrink: 0 }} /> :
                        <IconMinus size={14} color="gray" style={{ flexShrink: 0 }} />}
                    <Box style={{ overflow: 'hidden' }}>
                      <Text size="xs" truncate fw={500}>{skill?.name || 'Unbekannt'}</Text>
                      <Text size="10px" c="dimmed" truncate style={{ lineHeight: 1.1 }}>
                        {ctx.catName} • {ctx.subName}
                      </Text>
                    </Box>
                  </Group>
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap', fontSize: '10px' }}>
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </Text>
                </Group>
              );
            })}
          </Stack>
        </>
      )}
    </Stack>
  );
}

export const MatrixHeader: React.FC<MatrixHeaderProps> = ({
  employees,
  focusEmployeeId,
  hoveredEmployeeId,
  onFocusChange,
  onHoverChange,
  calculateEmployeeAverage,
  skills,
  getAssessment,
}) => {
  const { anonymizeName } = usePrivacy();
  const { cellSize, labelWidth, headerHeight } = MATRIX_LAYOUT;

  return (
    <div
      style={{
        display: "flex",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        style={{
          width: labelWidth,
          height: headerHeight,
          position: "sticky",
          left: 0,
          zIndex: 21,
          backgroundColor: "var(--mantine-color-body)",
          borderRight: "1px solid var(--mantine-color-default-border)",
          borderBottom: "2px solid var(--mantine-color-default-border)",
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
          color: "var(--mantine-color-dimmed)",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        Struktur / Team
      </div>
      <div style={{ display: "flex", backgroundColor: "var(--mantine-color-body)" }}>
        {employees.map((emp) => {
          const avg = calculateEmployeeAverage(emp.id!);
          const isColumnHovered = hoveredEmployeeId === emp.id;
          const isFocused = focusEmployeeId === emp.id;

          return (
            <HoverCard
              key={emp.id}
              width={320}
              shadow="md"
              withArrow
              openDelay={300}
              position="bottom"
            >
              <HoverCard.Target>
                <div
                  onMouseEnter={() => onHoverChange(emp.id!)}
                  onMouseLeave={() => onHoverChange(null)}
                  style={{
                    width: cellSize,
                    height: headerHeight,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingBottom: "12px",
                    borderBottom: "2px solid var(--mantine-color-default-border)",
                    borderRight: "1px solid var(--mantine-color-default-border)",
                    backgroundColor: isColumnHovered
                      ? "var(--mantine-color-default-hover)"
                      : "transparent",
                    position: "relative",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <Badge
                    size="xs"
                    variant="outline"
                    color={getScoreColor(avg)}
                    mb="xs"
                  >
                    {avg === null ? "N/A" : `${avg}%`}
                  </Badge>
                  <Text
                    size="xs"
                    fw={isColumnHovered || isFocused ? 700 : 400}
                    onClick={() => onFocusChange(isFocused ? null : emp.id!)}
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      height: "80px",
                      cursor: "pointer",
                      color: isFocused ? "var(--mantine-color-blue-filled)" : undefined,
                    }}
                  >
                    {anonymizeName(emp.name, emp.id)}
                  </Text>
                </div>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <EmployeeInfoCard emp={emp} avg={avg} skills={skills} getAssessment={getAssessment} />
              </HoverCard.Dropdown>
            </HoverCard>
          );
        })}
      </div>
    </div>
  );
};
