import React, { useState, useEffect } from "react";
import { Badge, Text, HoverCard, Stack, Group, Divider, ThemeIcon, Box } from "@mantine/core";
import { IconBuilding, IconBadge, IconHistory, IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import { getScoreColor } from "../../utils/skillCalculations";
import { Employee, Skill, Assessment, useData, AssessmentLogEntry } from "../../context/DataContext";

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
  const { getHistory, categories, subcategories } = useData();
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

  // Calculate KPIs
  const employeeSkills = skills
    .map((skill) => ({
      skill,
      assessment: getAssessment(emp.id!, skill.id!)
    }))
    .filter((item) => item.assessment && item.assessment.level > 0);

  const totalAssessed = employeeSkills.length;
  const topSkills = [...employeeSkills]
    .sort((a, b) => (b.assessment?.level || 0) - (a.assessment?.level || 0))
    .slice(0, 3);

  // Calculate Deviation (Gap)
  let totalDeviation = 0;
  let deviationCount = 0;

  skills.forEach(skill => {
    const assessment = getAssessment(emp.id!, skill.id!);
    if (assessment && assessment.targetLevel !== undefined) {
      const val = assessment.level;
      const target = assessment.targetLevel;
      totalDeviation += (val - target);
      deviationCount++;
    }
  });

  const avgDeviation = deviationCount > 0 ? Math.round(totalDeviation / deviationCount) : null;

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="start" wrap="nowrap">
        <Box>
          <Text fw={700} size="lg">
            {emp.name}
          </Text>
          <Stack gap={4} mt={6}>
            {emp.department && (
              <Group gap={6}>
                <IconBuilding size={12} color="gray" />
                <Text size="xs" c="dimmed">{emp.department}</Text>
              </Group>
            )}
            {emp.role && (
              <Group gap={6}>
                <IconBadge size={12} color="gray" />
                <Text size="xs" c="dimmed">{emp.role}</Text>
              </Group>
            )}
          </Stack>
        </Box>
        <Stack gap={0} align="center">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Ø Level</Text>
          <Badge size="xl" variant="light" color={getScoreColor(avg)}>
            {avg === null ? "0" : avg}%
          </Badge>
        </Stack>
      </Group>

      <Divider />

      <Group grow>
        <Stack gap={0} align="center">
          <Text size="lg" fw={700}>{totalAssessed}</Text>
          <Text size="xs" c="dimmed">Skill Bew.</Text>
        </Stack>
        <Stack gap={0} align="center">
          <Text size="lg" fw={700} c={avgDeviation === null ? "dimmed" : (avgDeviation! >= 0 ? "green" : "red")}>
            {avgDeviation === null ? "-" : (avgDeviation! > 0 ? `+${avgDeviation}` : avgDeviation)}%
          </Text>
          <Text size="xs" c="dimmed">Ø Abw.</Text>
        </Stack>
      </Group>

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
                    {emp.name}
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
