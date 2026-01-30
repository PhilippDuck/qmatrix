import React, { useMemo, useState, useEffect } from "react";
import {
  Badge,
  Group,
  Card,
  Tooltip,
  Text,
  Button,
  Collapse,
  Box,
  ActionIcon,
  Popover,
  Stack,
  Divider,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconMinus,
  IconPlus,
  IconLayoutNavbarExpand,
  IconLayoutNavbarCollapse,
} from "@tabler/icons-react";
import { useData } from "../context/DataContext";

/**
 * Definition der Skill-Level mit erweiterten Erklärungen.
 */
const LEVELS = [
  {
    value: -1,
    label: "N/A",
    color: "gray.3",
    title: "Nicht relevant (N/A)",
    description:
      "Diese Fähigkeit wird für die aktuelle Rolle oder Abteilung nicht benötigt und fließt nicht in die Berechnung ein.",
  },
  {
    value: 0,
    label: "0%",
    color: "gray",
    title: "Keine Kenntnisse",
    description: "Bisher keine Erfahrung oder Schulung in diesem Bereich.",
  },
  {
    value: 25,
    label: "25%",
    color: "orange",
    title: "Grundkenntnisse",
    description: "Theoretisch vertraut; erste Berührungspunkte vorhanden.",
  },
  {
    value: 50,
    label: "50%",
    color: "yellow",
    title: "Anwender",
    description: "Setzt Aufgaben um; benötigt bei Details noch Unterstützung.",
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
    description: "Löst komplexe Probleme und gibt Wissen aktiv weiter.",
  },
];

const InfoTooltip: React.FC<{ title: string; description?: string }> = ({
  title,
  description,
}) => {
  if (!description) return null;
  return (
    <Popover width={300} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon variant="subtle" color="gray" size="xs">
          <IconInfoCircle size={14} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown p="xs" style={{ pointerEvents: "none" }}>
        <Text fw={700} size="xs" mb={4}>
          {title}
        </Text>
        <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
          {description}
        </Text>
      </Popover.Dropdown>
    </Popover>
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

  const isEverythingCollapsed = useMemo(() => {
    const totalItems = categories.length + subcategories.length;
    const collapsedCount = Object.values(collapsedStates).filter(
      (v) => v,
    ).length;
    return collapsedCount >= totalItems;
  }, [collapsedStates, categories, subcategories]);

  const toggleItem = (id: string) => {
    setCollapsedStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGlobalToggle = () => {
    if (isEverythingCollapsed) {
      setCollapsedStates({});
    } else {
      const allIds: Record<string, boolean> = {};
      categories.forEach((c) => (allIds[c.id!] = true));
      subcategories.forEach((s) => (allIds[s.id!] = true));
      setCollapsedStates(allIds);
    }
  };

  const calculateAverage = (skillIds: string | string[]) => {
    const ids = Array.isArray(skillIds) ? skillIds : [skillIds];
    if (ids.length === 0 || employees.length === 0) return 0;
    let totalScore = 0;
    let relevantCount = 0;
    ids.forEach((skillId) => {
      employees.forEach((emp) => {
        const assessment = getAssessment(emp.id!, skillId);
        const level = assessment?.level ?? 0;
        if (level !== -1) {
          totalScore += level;
          relevantCount++;
        }
      });
    });
    return relevantCount === 0 ? 0 : Math.round(totalScore / relevantCount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "green";
    if (score >= 50) return "lime";
    if (score >= 25) return "yellow";
    if (score > 0) return "orange";
    return "gray";
  };

  const handleLevelChange = async (
    employeeId: string,
    skillId: string,
    currentLevel: number,
  ) => {
    try {
      const currentIdx = LEVELS.findIndex((l) => l.value === currentLevel);
      const nextIdx = (currentIdx + 1) % LEVELS.length;
      await setAssessment(employeeId, skillId, LEVELS[nextIdx].value as any);
    } catch (error) {
      console.error("Error setting assessment:", error);
    }
  };

  const nestedData = useMemo(() => {
    return categories
      .map((cat) => {
        const subCatsWithSkills = subcategories
          .filter((sub) => sub.categoryId === cat.id)
          .map((sub) => {
            const subCatSkills = skills.filter(
              (s) => s.subCategoryId === sub.id,
            );
            const skillsWithAvg = subCatSkills.map((s) => ({
              ...s,
              avgScore: calculateAverage(s.id!),
            }));
            return {
              subCategory: sub,
              skills: skillsWithAvg,
              avgScore: calculateAverage(subCatSkills.map((s) => s.id!)),
            };
          })
          .filter((sub) => sub.skills.length > 0);
        return {
          category: cat,
          subcategories: subCatsWithSkills,
          avgScore: calculateAverage(
            subCatsWithSkills.flatMap((s) => s.skills.map((sk) => sk.id!)),
          ),
        };
      })
      .filter((cat) => cat.subcategories.length > 0);
  }, [categories, subcategories, skills, employees, getAssessment]);

  const cellSize = 85;
  const labelWidth = 260;
  const headerHeight = 120;

  if (employees.length === 0 || nestedData.length === 0) {
    return (
      <Card withBorder>
        <Text>Keine Daten vorhanden.</Text>
      </Card>
    );
  }

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
      <Group mb="xs">
        <ActionIcon
          variant="light"
          color={isEverythingCollapsed ? "blue" : "gray"}
          onClick={handleGlobalToggle}
          size="lg"
        >
          {isEverythingCollapsed ? (
            <IconLayoutNavbarExpand size={20} />
          ) : (
            <IconLayoutNavbarCollapse size={20} />
          )}
        </ActionIcon>
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
            {/* Header */}
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
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    style={{
                      width: cellSize,
                      height: headerHeight,
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      paddingBottom: "12px",
                      borderBottom: "2px solid #dee2e6",
                      borderRight: "1px solid #f1f3f5",
                    }}
                  >
                    <Text
                      size="xs"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                      }}
                    >
                      {emp.name}
                    </Text>
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            {nestedData.map((catGroup) => {
              const isCatCollapsed = collapsedStates[catGroup.category.id!];
              return (
                <div key={catGroup.category.id}>
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
                          onClick={() => toggleItem(catGroup.category.id!)}
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
                          onClick={() => toggleItem(catGroup.category.id!)}
                        >
                          {catGroup.category.name.toUpperCase()}
                        </Text>
                        <InfoTooltip
                          title={catGroup.category.name}
                          description={catGroup.category.description}
                        />
                      </Group>
                      <Badge
                        size="xs"
                        variant="filled"
                        color={getScoreColor(catGroup.avgScore)}
                      >
                        {catGroup.avgScore}%
                      </Badge>
                    </div>
                  </div>

                  {!isCatCollapsed &&
                    catGroup.subcategories.map((subGroup) => {
                      const isSubCollapsed =
                        collapsedStates[subGroup.subCategory.id!];
                      return (
                        <div key={subGroup.subCategory.id}>
                          <div
                            style={{
                              display: "flex",
                              borderBottom: "1px solid #f1f3f5",
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
                                  onClick={() =>
                                    toggleItem(subGroup.subCategory.id!)
                                  }
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
                                  onClick={() =>
                                    toggleItem(subGroup.subCategory.id!)
                                  }
                                >
                                  {subGroup.subCategory.name}
                                </Text>
                                <InfoTooltip
                                  title={subGroup.subCategory.name}
                                  description={subGroup.subCategory.description}
                                />
                              </Group>
                              <Badge
                                size="xs"
                                variant="light"
                                color={getScoreColor(subGroup.avgScore)}
                              >
                                {subGroup.avgScore}%
                              </Badge>
                            </div>
                          </div>

                          {!isSubCollapsed &&
                            subGroup.skills.map((skill) => (
                              <div key={skill.id} style={{ display: "flex" }}>
                                <div
                                  style={{
                                    width: labelWidth,
                                    padding: "6px 12px 6px 44px",
                                    position: "sticky",
                                    left: 0,
                                    zIndex: 5,
                                    backgroundColor: "white",
                                    borderRight: "1px solid #dee2e6",
                                    borderBottom: "1px solid #f8f9fa",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Text size="sm" truncate style={{ flex: 1 }}>
                                    {skill.name}
                                  </Text>
                                  <Group gap={8}>
                                    <InfoTooltip
                                      title={skill.name}
                                      description={skill.description}
                                    />
                                    <Text
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 400,
                                        minWidth: "30px",
                                        textAlign: "right",
                                      }}
                                      c={getScoreColor(skill.avgScore)}
                                    >
                                      {skill.avgScore}%
                                    </Text>
                                  </Group>
                                </div>
                                {employees.map((emp) => {
                                  const level =
                                    getAssessment(emp.id!, skill.id!)?.level ??
                                    0;
                                  const levelObj = LEVELS.find(
                                    (l) => l.value === level,
                                  );
                                  return (
                                    <div
                                      key={`${emp.id}-${skill.id}`}
                                      onContextMenu={(e) => e.preventDefault()}
                                      style={{
                                        width: cellSize,
                                        height: 36,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderBottom: "1px solid #f8f9fa",
                                        borderRight: "1px solid #f8f9fa",
                                      }}
                                    >
                                      <Badge
                                        color={levelObj?.color}
                                        variant={
                                          level <= 0 ? "light" : "filled"
                                        }
                                        onClick={() =>
                                          handleLevelChange(
                                            emp.id!,
                                            skill.id!,
                                            level,
                                          )
                                        }
                                        onContextMenu={(e) =>
                                          e.preventDefault()
                                        }
                                        style={{
                                          cursor: "pointer",
                                          width: "80%",
                                          fontSize: "9px",
                                          opacity: level === -1 ? 0.4 : 1,
                                        }}
                                      >
                                        {levelObj?.label}
                                      </Badge>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Erweiterte Legende */}
      <Box mt="md">
        <Button
          variant="subtle"
          size="xs"
          onClick={() => setLegendOpened((o) => !o)}
        >
          Legende {legendOpened ? "ausblenden" : "einblenden"}
        </Button>
        <Collapse in={legendOpened}>
          <Card withBorder mt="xs" p="md">
            <Stack gap="md">
              {/* Kompetenzstufen */}
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
                        style={{ minWidth: "50px" }}
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

              {/* Status-Werte */}
              <Box>
                <Text size="xs" fw={700} c="dimmed" mb="xs" tt="uppercase">
                  Status-Werte
                </Text>
                <Stack gap="xs">
                  {/* 0% Erklärung */}
                  <Group wrap="nowrap" align="flex-start">
                    <Badge color="gray" size="sm" style={{ minWidth: "50px" }}>
                      0%
                    </Badge>
                    <Box>
                      <Text size="xs" fw={700}>
                        Keine Kenntnisse
                      </Text>
                      <Text size="xs" c="dimmed">
                        Bisher keine Erfahrung oder Schulung in diesem Bereich
                        vorhanden.
                      </Text>
                    </Box>
                  </Group>
                  {/* N/A Erklärung */}
                  <Group wrap="nowrap" align="flex-start">
                    <Badge
                      color="gray.3"
                      size="sm"
                      style={{ minWidth: "50px" }}
                    >
                      N/A
                    </Badge>
                    <Box>
                      <Text size="xs" fw={700}>
                        Nicht relevant (Not Applicable)
                      </Text>
                      <Text size="xs" c="dimmed">
                        Diese Fähigkeit wird für die aktuelle Rolle nicht
                        benötigt. Sie wird bei der Berechnung von
                        Durchschnittswerten ignoriert.
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
