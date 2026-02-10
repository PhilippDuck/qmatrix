import React, { useState, useEffect } from "react";
import { Badge, Text, HoverCard, Stack, Group, Divider, ThemeIcon, Box, SimpleGrid, Tooltip, ActionIcon, Menu } from "@mantine/core";
import { IconBuilding, IconHistory, IconTrendingUp, IconTrendingDown, IconMinus, IconPencil, IconPlus, IconDotsVertical, IconCertificate } from "@tabler/icons-react";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import { getScoreColor } from "../../utils/skillCalculations";
import { Employee, Skill, Assessment, useData, AssessmentLogEntry } from "../../context/DataContext";
import { getIconByName } from "../shared/RoleIconPicker";
import { usePrivacy } from "../../context/PrivacyContext";
import { useEmployeeMetrics } from "../../hooks/useEmployeeMetrics";

import { MatrixColumn } from "./types";

interface MatrixHeaderProps {
  columns: MatrixColumn[];
  employees: Employee[];
  focusEmployeeId: string | null;
  hoveredEmployeeId: string | null;
  onFocusChange: (employeeId: string | null) => void;
  onHoverChange: (employeeId: string | null) => void;
  calculateEmployeeAverage: (employeeId: string) => number | null;
  skills: Skill[];
  getAssessment: (empId: string, skillId: string) => Assessment | undefined;
  onEditEmployee: (employeeId: string) => void;
  showMaxValues: boolean;
  isEditMode: boolean;
  onAddEmployee: () => void;
  onNavigate?: (tab: string, params?: any) => void;
  labelWidth?: number;
}

const EmployeeInfoCard: React.FC<{
  emp: Employee;
  avg: number | null;
  skills: Skill[];
  getAssessment: (empId: string, skillId: string) => Assessment | undefined;
  onEdit: () => void;
  onNavigate?: (tab: string, params?: any) => void;
}> = ({ emp, avg, skills, getAssessment, onEdit, onNavigate }) => {
  const { getHistory, categories, subcategories, roles, qualificationMeasures, qualificationPlans } = useData();
  const { anonymizeName } = usePrivacy();
  const [history, setHistory] = useState<AssessmentLogEntry[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Hook for metrics
  const {
    activeSkillCount,
    totalXP,
    fulfillment,
    topSkills,
    learningNeeds,
    activeMeasures,
    isPlanEnabled
  } = useEmployeeMetrics({
    employee: emp,
    skills,
    getAssessment,
    qualificationPlans,
    qualificationMeasures,
    roles
  });

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
            {emp.roles && emp.roles.length > 0 && (
              <Stack gap={2}>
                {emp.roles.map((roleName, idx) => {
                  const role = roles.find(r => r.name === roleName);
                  const RoleIcon = getIconByName(role?.icon);
                  return (
                    <Group key={idx} gap={6}>
                      <RoleIcon size={12} color="gray" />
                      <Text size="xs" c="dimmed">{roleName}</Text>
                    </Group>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Box>
        <Menu shadow="md" width={200} position="bottom-end" withinPortal={false}>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" title="Optionen">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={14} />} onClick={onEdit}>
              Mitarbeiter bearbeiten
            </Menu.Item>
            <Menu.Item
              leftSection={<IconCertificate size={14} />}
              onClick={() => onNavigate?.('qualification', { employeeId: emp.id })}
              disabled={!isPlanEnabled}
              title={!isPlanEnabled ? "Keine Defizite vorhanden" : undefined}
            >
              Qualifizierungsplan
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
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

      {/* Active Qualification Measures */}
      {activeMeasures.length > 0 && (
        <>
          <Divider />
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">
            Aktive Qualifizierung
          </Text>
          <Stack gap={8}>
            {activeMeasures.map(measure => {
              const skill = skills.find(s => s.id === measure.skillId);
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const ctx = skill ? resolveContext(skill) : { catName: '-', subName: '-' };
              return (
                <Group key={measure.id} justify="space-between" wrap="nowrap">
                  <Box style={{ flex: 1, overflow: "hidden" }}>
                    <Text size="xs" fw={500} truncate>{skill?.name || 'Unbekannt'}</Text>
                    <Text size="10px" c="dimmed" truncate>
                      {measure.type === "internal" ? "Intern" : "Extern"}: {measure.status === "in_progress" ? "Läuft" : "Geplant"}
                    </Text>
                  </Box>
                  <Badge size="xs" color={measure.status === "in_progress" ? "blue" : "gray"}>
                    {measure.currentLevel}% → {measure.targetLevel}%
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
  columns,
  employees,
  focusEmployeeId,
  hoveredEmployeeId,
  onFocusChange,
  onHoverChange,
  calculateEmployeeAverage,
  skills,
  getAssessment,
  onEditEmployee,
  showMaxValues,
  isEditMode,
  onAddEmployee,
  onNavigate,
  labelWidth,
}) => {
  const { anonymizeName } = usePrivacy();
  const { roles, qualificationPlans } = useData();
  const { cellSize, headerHeight } = MATRIX_LAYOUT;
  const effectiveLabelWidth = labelWidth || MATRIX_LAYOUT.labelWidth;

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
          width: effectiveLabelWidth,
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
          transition: "width 0.2s ease",
        }}
      >
        Struktur / Team
      </div>
      <div style={{ display: "flex", backgroundColor: "var(--mantine-color-body)" }}>
        {columns.map((col) => {
          if (col.type === 'group-summary') {
            const groupEmployees = employees.filter(e => col.employeeIds.includes(e.id!));

            // Calculate Group Average Coverage
            let totalAvg = 0;
            let countAvg = 0;
            groupEmployees.forEach(e => {
              const val = calculateEmployeeAverage(e.id!);
              if (val !== null) {
                totalAvg += val;
                countAvg++;
              }
            });
            const groupAvg = countAvg > 0 ? Math.round(totalAvg / countAvg) : null;

            // Calculate Group Average XP
            let totalXP = 0;
            groupEmployees.forEach(e => {
              const eXP = skills.reduce((sum, skill) => {
                const assessment = getAssessment(e.id!, skill.id!);
                const val = assessment?.level;
                return sum + (val && val > 0 ? val : 0);
              }, 0);
              totalXP += eXP;
            });
            const avgXP = groupEmployees.length > 0 ? Math.round(totalXP / groupEmployees.length) : 0;

            return (
              <div
                key={col.id}
                style={{
                  width: cellSize,
                  height: headerHeight,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingBottom: "12px",
                  borderBottom: "2px solid var(--mantine-color-default-border)",
                  borderRight: "2px solid var(--mantine-color-default-border)", // Thicker border for separator
                  backgroundColor: col.backgroundColor || "var(--mantine-color-body)",
                }}
              >
                {showMaxValues ? (
                  <Tooltip label={`Ø XP: ${avgXP}`} withArrow>
                    <Badge size="xs" variant="light" color="blue" mb="xs" mt={8} style={{ cursor: 'help' }}>
                      Ø {avgXP} XP
                    </Badge>
                  </Tooltip>
                ) : (
                  <Badge
                    size="xs"
                    variant="outline"
                    color={getScoreColor(groupAvg)}
                    mb="xs"
                  >
                    {groupAvg === null ? "N/A" : `Ø ${groupAvg}%`}
                  </Badge>
                )}
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    height: "80px",
                    cursor: "default",
                  }}
                >
                  {col.label}
                </Text>
              </div>
            );
          }

          const emp = col.employee;
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
                    backgroundColor: col.backgroundColor || (isColumnHovered
                      ? "var(--mantine-color-default-hover)"
                      : "transparent"),
                    position: "relative",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  {/* Toggle between Total XP and Average based on showMaxValues */}
                  {showMaxValues ? (
                    (() => {
                      const totalXP = skills.reduce((sum, skill) => {
                        const assessment = getAssessment(emp.id!, skill.id!);
                        const val = assessment?.level;
                        return sum + (val && val > 0 ? val : 0);
                      }, 0);
                      return (
                        <Tooltip label={`Gesamt-XP: ${totalXP}`} withArrow>
                          <Badge size="xs" variant="light" color="blue" mb="xs" mt={8} style={{ cursor: 'help' }}>
                            {totalXP} XP
                          </Badge>
                        </Tooltip>
                      );
                    })()
                  ) : (
                    <Badge
                      size="xs"
                      variant="outline"
                      color={getScoreColor(avg)}
                      mb="xs"
                    >
                      {avg === null ? "N/A" : `${avg}%`}
                    </Badge>
                  )}
                  <div
                    onClick={() => onFocusChange(isFocused ? null : emp.id!)}
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      height: "80px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Text
                      size="xs"
                      fw={isColumnHovered || isFocused ? 700 : 400}
                      style={{
                        color: isFocused ? "var(--mantine-color-blue-filled)" : undefined,
                      }}
                    >
                      {anonymizeName(emp.name, emp.id)}
                    </Text>
                    {emp.roles && emp.roles.length > 0 && (
                      <Group gap={2} wrap="nowrap" style={{ flexShrink: 0 }}>
                        {emp.roles.slice(0, 3).map((roleName, idx) => {
                          const role = roles.find(r => r.name === roleName);
                          const RoleIcon = getIconByName(role?.icon);
                          return (
                            <Tooltip key={idx} label={roleName} withArrow position="top">
                              <ThemeIcon size={14} variant="light" color="gray" radius="xl" style={{ transform: 'rotate(180deg)' }}>
                                <RoleIcon size={10} />
                              </ThemeIcon>
                            </Tooltip>
                          );
                        })}
                        {emp.roles.length > 3 && (
                          <Text size="8px" c="dimmed">+{emp.roles.length - 3}</Text>
                        )}
                      </Group>
                    )}
                  </div>
                </div>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <EmployeeInfoCard
                  emp={emp}
                  avg={avg}
                  skills={skills}
                  getAssessment={getAssessment}
                  onEdit={() => onEditEmployee(emp.id!)}
                  onNavigate={onNavigate}
                />
              </HoverCard.Dropdown>
            </HoverCard>
          );
        })}
        {/* Add Employee Button Column */}
        {isEditMode && (
          <div
            style={{
              width: cellSize,
              height: headerHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: "2px solid var(--mantine-color-default-border)",
              borderRight: "1px solid var(--mantine-color-default-border)",
            }}
          >
            <Tooltip label="Mitarbeiter hinzufügen">
              <ActionIcon variant="light" color="blue" onClick={onAddEmployee} size="lg">
                <IconPlus size={20} />
              </ActionIcon>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};

