import React, { useMemo, useState, useEffect } from "react";
import {
  Badge,
  Group,
  Card,
  Text,
  Button,
  Collapse,
  Box,
  ActionIcon,
  Stack,
  Divider,
  Title,
  Tooltip,
  Menu,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconMinus,
  IconPlus,
  IconLayoutNavbarCollapse,
  IconSearch,
  IconX,
  IconCheck,
} from "@tabler/icons-react";
import { useData } from "../context/DataContext";

/**
 * Definition der Skill-Level.
 */
const LEVELS = [
  {
    value: 0,
    label: "0%",
    color: "gray",
    title: "Keine Kenntnisse",
    description: "Bisher keine Erfahrung oder Schulung.",
  },
  {
    value: -1,
    label: "N/A",
    color: "gray.3",
    title: "Nicht relevant (N/A)",
    description: "Wird für die Berechnung ignoriert.",
  },
  {
    value: 25,
    label: "25%",
    color: "orange",
    title: "Grundkenntnisse",
    description: "Theoretisch vertraut; erste Berührungspunkte.",
  },
  {
    value: 50,
    label: "50%",
    color: "yellow",
    title: "Anwender",
    description: "Setzt Aufgaben um; benötigt teils Unterstützung.",
  },
  {
    value: 75,
    label: "75%",
    color: "lime",
    title: "Fachkompetent",
    description: "Beherrscht den Standard sicher und eigenständig.",
  },
  {
    value: 100,
    label: "100%",
    color: "green",
    title: "Experte / Mentor",
    description: "Löst komplexe Probleme und gibt Wissen weiter.",
  },
];

const InfoTooltip: React.FC<{ title: string; description?: string }> = ({
  title,
  description,
}) => {
  if (!description) return null;
  return (
    <Tooltip
      multiline
      w={250}
      withArrow
      label={
        <Box p={2}>
          <Text fw={700} size="xs" mb={2}>
            {title}
          </Text>
          <Text size="xs" style={{ lineHeight: 1.4 }}>
            {description}
          </Text>
        </Box>
      }
    >
      <Box style={{ cursor: "help", display: "flex", alignItems: "center" }}>
        <IconInfoCircle size={15} color="#adb5bd" />
      </Box>
    </Tooltip>
  );
};

export const SkillMatrix: React.FC = () => {
  const {
    employees,
    categories,
    subcategories,
    skills,
    setAssessment,
    getAssessment,
  } = useData();
  const [legendOpened, setLegendOpened] = useState(false);
  const [focusEmployeeId, setFocusEmployeeId] = useState<string | null>(null);
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null);
  const [hoveredEmployeeId, setHoveredEmployeeId] = useState<string | null>(
    null,
  );

  const [collapsedStates, setCollapsedStates] = useState<
    Record<string, boolean>
  >(() => {
    const saved = localStorage.getItem("skill-matrix-collapsed");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(
      "skill-matrix-collapsed",
      JSON.stringify(collapsedStates),
    );
  }, [collapsedStates]);

  const displayedEmployees = useMemo(
    () =>
      focusEmployeeId
        ? employees.filter((e) => e.id === focusEmployeeId)
        : employees,
    [employees, focusEmployeeId],
  );

  const toggleItem = (id: string) =>
    setCollapsedStates((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleGlobalToggle = () => {
    const totalItems = categories.length + subcategories.length;
    const isEverythingCollapsed =
      Object.values(collapsedStates).filter((v) => v).length >= totalItems;
    setCollapsedStates(
      isEverythingCollapsed
        ? {}
        : Object.fromEntries(
            [...categories, ...subcategories].map((x) => [x.id!, true]),
          ),
    );
  };

  const calculateAverage = (
    skillIds: string[],
    specificEmployeeId?: string,
  ) => {
    if (skillIds.length === 0 || employees.length === 0) return 0;
    let totalScore = 0,
      relevantCount = 0,
      hasAnyRelevant = false;
    const targetEmps = specificEmployeeId
      ? employees.filter((e) => e.id === specificEmployeeId)
      : displayedEmployees;

    skillIds.forEach((sId) => {
      targetEmps.forEach((emp) => {
        const val = getAssessment(emp.id!, sId)?.level ?? 0;
        if (val !== -1) {
          totalScore += val;
          relevantCount++;
          hasAnyRelevant = true;
        }
      });
    });
    if (specificEmployeeId && !hasAnyRelevant) return null;
    return relevantCount === 0 ? 0 : Math.round(totalScore / relevantCount);
  };

  /**
   * Setzt alle Skills einer Gruppe auf einen bestimmten Wert.
   */
  const bulkSetLevel = async (
    empId: string,
    skillIds: string[],
    newLevel: number,
  ) => {
    for (const sId of skillIds) {
      await setAssessment(empId, sId, newLevel as any);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "gray.4";
    if (score >= 75) return "green";
    if (score >= 50) return "lime";
    if (score >= 25) return "yellow";
    if (score > 0) return "orange";
    return "gray";
  };

  const handleLevelChange = async (empId: string, sId: string, cur: number) => {
    const idx = LEVELS.findIndex((l) => l.value === cur);
    const next = (idx + 1) % LEVELS.length;
    await setAssessment(empId, sId, LEVELS[next].value as any);
  };

  const cellSize = 85;
  const labelWidth = 260;
  const headerHeight = 170;

  return (
    <Box
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      <Group mb="lg" justify="space-between">
        <Group gap="sm">
          <Title order={2}>Qualifizierungsmatrix</Title>
          <ActionIcon
            variant="light"
            color="gray"
            onClick={handleGlobalToggle}
            size="lg"
          >
            <IconLayoutNavbarCollapse size={20} />
          </ActionIcon>
        </Group>
        {focusEmployeeId && (
          <Button
            leftSection={<IconX size={16} />}
            variant="filled"
            color="red"
            onClick={() => setFocusEmployeeId(null)}
          >
            Fokus beenden
          </Button>
        )}
      </Group>

      <Card
        withBorder
        p={0}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ overflow: "auto", flex: 1 }}>
          <div
            style={{
              width: "max-content",
              display: "flex",
              flexDirection: "column",
              minWidth: "100%",
            }}
          >
            {/* Header mit Spalten-Highlighting */}
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
                  backgroundColor: "white",
                  borderRight: "1px solid #dee2e6",
                  borderBottom: "2px solid #dee2e6",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: "12px",
                  color: "#adb5bd",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                Struktur / Team
              </div>
              <div style={{ display: "flex", backgroundColor: "white" }}>
                {displayedEmployees.map((emp) => {
                  const avg = calculateAverage(
                    skills.map((s) => s.id!),
                    emp.id,
                  );
                  const isColumnHovered = hoveredEmployeeId === emp.id;
                  const isFocused = focusEmployeeId === emp.id;
                  return (
                    <div
                      key={emp.id}
                      onMouseEnter={() => setHoveredEmployeeId(emp.id!)}
                      onMouseLeave={() => setHoveredEmployeeId(null)}
                      style={{
                        width: cellSize,
                        height: headerHeight,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        paddingBottom: "12px",
                        borderBottom: "2px solid #dee2e6",
                        borderRight: "1px solid #f1f3f5",
                        backgroundColor: isColumnHovered
                          ? "#f8f9fa"
                          : "transparent",
                        position: "relative",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      <Box
                        style={{
                          height: "28px",
                          visibility:
                            isColumnHovered || isFocused ? "visible" : "hidden",
                        }}
                      >
                        <ActionIcon
                          variant={isFocused ? "filled" : "light"}
                          color={isFocused ? "blue" : "gray"}
                          size="sm"
                          onClick={() =>
                            setFocusEmployeeId(isFocused ? null : emp.id!)
                          }
                        >
                          <IconSearch size={14} />
                        </ActionIcon>
                      </Box>
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
                        style={{
                          writingMode: "vertical-rl",
                          transform: "rotate(180deg)",
                          height: "80px",
                        }}
                      >
                        {emp.name}
                      </Text>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matrix Content */}
            {categories.map((cat) => {
              const subIds = subcategories
                .filter((s) => s.categoryId === cat.id)
                .map((s) => s.id);
              const catSkills = skills
                .filter((s) => subIds.includes(s.subCategoryId))
                .map((s) => s.id!);
              const isCatCollapsed = collapsedStates[cat.id!];

              return (
                <div key={cat.id}>
                  <div
                    style={{
                      display: "flex",
                      backgroundColor: "#f8f9fa",
                      borderBottom: "1px solid #dee2e6",
                    }}
                  >
                    <div
                      style={{
                        width: labelWidth,
                        padding: "8px 12px",
                        position: "sticky",
                        left: 0,
                        zIndex: 15,
                        backgroundColor: "#f8f9fa",
                        borderRight: "1px solid #dee2e6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Group gap="xs">
                        <ActionIcon
                          size="xs"
                          variant="transparent"
                          onClick={() => toggleItem(cat.id!)}
                        >
                          {isCatCollapsed ? (
                            <IconPlus size={14} />
                          ) : (
                            <IconMinus size={14} />
                          )}
                        </ActionIcon>
                        <Text
                          fw={700}
                          size="xs"
                          style={{ cursor: "pointer" }}
                          onClick={() => toggleItem(cat.id!)}
                        >
                          {cat.name.toUpperCase()}
                        </Text>
                        <InfoTooltip
                          title={cat.name}
                          description={cat.description}
                        />
                      </Group>
                      <Badge
                        size="xs"
                        variant="filled"
                        color={getScoreColor(calculateAverage(catSkills))}
                      >
                        {calculateAverage(catSkills)}%
                      </Badge>
                    </div>
                    {displayedEmployees.map((emp) => {
                      const avg = calculateAverage(catSkills, emp.id);
                      return (
                        <Menu key={emp.id} shadow="md" width={200}>
                          <Menu.Target>
                            <div
                              onMouseEnter={() => setHoveredEmployeeId(emp.id!)}
                              onMouseLeave={() => setHoveredEmployeeId(null)}
                              style={{
                                width: cellSize,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor:
                                  hoveredEmployeeId === emp.id
                                    ? "#f1f3f5"
                                    : "transparent",
                                transition: "background-color 0.15s ease",
                              }}
                            >
                              <Text fw={700} size="xs" c={getScoreColor(avg)}>
                                {avg === null ? "N/A" : `${avg}%`}
                              </Text>
                            </div>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Label>
                              Alle "{cat.name}" setzen für {emp.name}
                            </Menu.Label>
                            {LEVELS.map((lvl) => (
                              <Menu.Item
                                key={lvl.value}
                                leftSection={
                                  <IconCheck size={14} color={lvl.color} />
                                }
                                onClick={() =>
                                  bulkSetLevel(emp.id!, catSkills, lvl.value)
                                }
                              >
                                Alle auf {lvl.label}
                              </Menu.Item>
                            ))}
                          </Menu.Dropdown>
                        </Menu>
                      );
                    })}
                  </div>

                  {!isCatCollapsed &&
                    subcategories
                      .filter((s) => s.categoryId === cat.id)
                      .map((sub) => {
                        const subSkills = skills
                          .filter((s) => s.subCategoryId === sub.id)
                          .map((s) => s.id!);
                        const isSubCollapsed = collapsedStates[sub.id!];
                        return (
                          <div key={sub.id}>
                            <div
                              style={{
                                display: "flex",
                                borderBottom: "1px solid #f1f3f5",
                                backgroundColor: "#fff",
                              }}
                            >
                              <div
                                style={{
                                  width: labelWidth,
                                  padding: "6px 12px 6px 24px",
                                  position: "sticky",
                                  left: 0,
                                  zIndex: 10,
                                  backgroundColor: "white",
                                  borderRight: "1px solid #dee2e6",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <Group gap="xs">
                                  <ActionIcon
                                    size="xs"
                                    variant="transparent"
                                    onClick={() => toggleItem(sub.id!)}
                                  >
                                    {isSubCollapsed ? (
                                      <IconPlus size={12} />
                                    ) : (
                                      <IconMinus size={12} />
                                    )}
                                  </ActionIcon>
                                  <Text
                                    fw={500}
                                    size="xs"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => toggleItem(sub.id!)}
                                  >
                                    {sub.name}
                                  </Text>
                                  <InfoTooltip
                                    title={sub.name}
                                    description={sub.description}
                                  />
                                </Group>
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color={getScoreColor(
                                    calculateAverage(subSkills),
                                  )}
                                >
                                  {calculateAverage(subSkills)}%
                                </Badge>
                              </div>
                              {displayedEmployees.map((emp) => {
                                const avg = calculateAverage(subSkills, emp.id);
                                return (
                                  <Menu key={emp.id} shadow="md" width={200}>
                                    <Menu.Target>
                                      <div
                                        onMouseEnter={() =>
                                          setHoveredEmployeeId(emp.id!)
                                        }
                                        onMouseLeave={() =>
                                          setHoveredEmployeeId(null)
                                        }
                                        style={{
                                          width: cellSize,
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          backgroundColor:
                                            hoveredEmployeeId === emp.id
                                              ? "#f8f9fa"
                                              : "transparent",
                                          transition:
                                            "background-color 0.15s ease",
                                        }}
                                      >
                                        <Text
                                          size="xs"
                                          fw={500}
                                          c={getScoreColor(avg)}
                                        >
                                          {avg === null ? "N/A" : `${avg}%`}
                                        </Text>
                                      </div>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                      <Menu.Label>
                                        Alle "{sub.name}" setzen für {emp.name}
                                      </Menu.Label>
                                      {LEVELS.map((lvl) => (
                                        <Menu.Item
                                          key={lvl.value}
                                          leftSection={
                                            <IconCheck
                                              size={14}
                                              color={lvl.color}
                                            />
                                          }
                                          onClick={() =>
                                            bulkSetLevel(
                                              emp.id!,
                                              subSkills,
                                              lvl.value,
                                            )
                                          }
                                        >
                                          Alle auf {lvl.label}
                                        </Menu.Item>
                                      ))}
                                    </Menu.Dropdown>
                                  </Menu>
                                );
                              })}
                            </div>

                            {!isSubCollapsed &&
                              skills
                                .filter((s) => s.subCategoryId === sub.id)
                                .map((skill) => {
                                  const isRowHovered =
                                    hoveredSkillId === skill.id;
                                  return (
                                    <div
                                      key={skill.id}
                                      style={{ display: "flex" }}
                                    >
                                      <div
                                        style={{
                                          width: labelWidth,
                                          padding: "6px 12px 6px 44px",
                                          position: "sticky",
                                          left: 0,
                                          zIndex: 5,
                                          backgroundColor: isRowHovered
                                            ? "#f1f3f5"
                                            : "white",
                                          borderRight: "1px solid #dee2e6",
                                          borderBottom: "1px solid #f8f9fa",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          transition:
                                            "background-color 0.15s ease",
                                        }}
                                      >
                                        <Text
                                          size="sm"
                                          fw={isRowHovered ? 700 : 400}
                                          truncate
                                          style={{ flex: 1 }}
                                        >
                                          {skill.name}
                                        </Text>
                                        <Group gap={8}>
                                          <InfoTooltip
                                            title={skill.name}
                                            description={skill.description}
                                          />
                                          <Text
                                            style={{ fontSize: "10px" }}
                                            c={getScoreColor(
                                              calculateAverage([skill.id!]),
                                            )}
                                          >
                                            {calculateAverage([skill.id!])}%
                                          </Text>
                                        </Group>
                                      </div>
                                      {displayedEmployees.map((emp) => {
                                        const val =
                                          getAssessment(emp.id!, skill.id!)
                                            ?.level ?? 0;
                                        const obj = LEVELS.find(
                                          (l) => l.value === val,
                                        );
                                        const isColumnHovered =
                                          hoveredEmployeeId === emp.id;
                                        return (
                                          <div
                                            key={`${emp.id}-${skill.id}`}
                                            onMouseEnter={() => {
                                              setHoveredSkillId(skill.id!);
                                              setHoveredEmployeeId(emp.id!);
                                            }}
                                            onMouseLeave={() => {
                                              setHoveredSkillId(null);
                                              setHoveredEmployeeId(null);
                                            }}
                                            style={{
                                              width: cellSize,
                                              height: 36,
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              borderBottom: "1px solid #f8f9fa",
                                              borderRight: "1px solid #f8f9fa",
                                              backgroundColor:
                                                isRowHovered || isColumnHovered
                                                  ? "#f8f9fa"
                                                  : "transparent",
                                              transition:
                                                "background-color 0.15s ease",
                                            }}
                                          >
                                            <Badge
                                              color={
                                                val === -1
                                                  ? "gray.3"
                                                  : obj?.color
                                              }
                                              variant={
                                                val <= 0 ? "light" : "filled"
                                              }
                                              onClick={() =>
                                                handleLevelChange(
                                                  emp.id!,
                                                  skill.id!,
                                                  val,
                                                )
                                              }
                                              style={{
                                                cursor: "pointer",
                                                width: "80%",
                                                fontSize: "9px",
                                                opacity: val === -1 ? 0.6 : 1,
                                                border:
                                                  val === -1
                                                    ? "1px dashed #ced4da"
                                                    : "none",
                                              }}
                                            >
                                              {obj?.label}
                                            </Badge>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                          </div>
                        );
                      })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Legende */}
      <Box mt="md">
        <Button
          variant="subtle"
          size="xs"
          onClick={() => setLegendOpened((o) => !o)}
        >
          Legende {legendOpened ? "ausblenden" : "einblenden"}
        </Button>
        <Collapse in={legendOpened} mt="xs">
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
                    <Badge
                      color="gray.3"
                      size="sm"
                      style={{ minWidth: "55px" }}
                    >
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
    </Box>
  );
};
