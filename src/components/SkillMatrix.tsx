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
} from "@mantine/core";
import {
  IconInfoCircle,
  IconMinus,
  IconPlus,
  IconLayoutNavbarExpand,
  IconLayoutNavbarCollapse,
} from "@tabler/icons-react";
import { useData } from "../context/DataContext";

const LEVELS = [
  { value: 0, label: "0%", color: "gray" },
  { value: 25, label: "25%", color: "orange" },
  { value: 50, label: "50%", color: "yellow" },
  { value: 75, label: "75%", color: "lime" },
  { value: 100, label: "100%", color: "green" },
];

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

  // Berechnet, ob aktuell alles eingeklappt ist
  const isEverythingCollapsed = useMemo(() => {
    const totalItems = categories.length + subcategories.length;
    const collapsedCount = Object.values(collapsedStates).filter(
      (v) => v,
    ).length;
    return collapsedCount >= totalItems;
  }, [collapsedStates, categories, subcategories]);

  const toggleItem = (id: string) => {
    setCollapsedStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Ein einziger Handler für beide Zustände
  const handleGlobalToggle = () => {
    if (isEverythingCollapsed) {
      setCollapsedStates({}); // Alles ausklappen
    } else {
      const allIds: Record<string, boolean> = {};
      categories.forEach((c) => (allIds[c.id!] = true));
      subcategories.forEach((s) => (allIds[s.id!] = true));
      setCollapsedStates(allIds); // Alles einklappen
    }
  };

  const calculateAverage = (skillIds: string[]) => {
    if (skillIds.length === 0 || employees.length === 0) return 0;
    let totalScore = 0;
    let count = 0;
    skillIds.forEach((skillId) => {
      employees.forEach((emp) => {
        const assessment = getAssessment(emp.id!, skillId);
        totalScore += assessment?.level || 0;
        count++;
      });
    });
    return Math.round(totalScore / count);
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
      await setAssessment(
        employeeId,
        skillId,
        LEVELS[nextIdx].value as 0 | 25 | 50 | 75 | 100,
      );
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
            return {
              subCategory: sub,
              skills: subCatSkills,
              avgScore: calculateAverage(subCatSkills.map((s) => s.id!)),
            };
          })
          .filter((sub) => sub.skills.length > 0);
        const allSkillIdsInCat = subCatsWithSkills.flatMap((s) =>
          s.skills.map((sk) => sk.id!),
        );
        return {
          category: cat,
          subcategories: subCatsWithSkills,
          avgScore: calculateAverage(allSkillIdsInCat),
        };
      })
      .filter((cat) => cat.subcategories.length > 0);
  }, [categories, subcategories, skills, employees, getAssessment]);

  if (employees.length === 0 || nestedData.length === 0) {
    return (
      <Card withBorder>
        <Text>Keine Daten vorhanden.</Text>
      </Card>
    );
  }

  const cellSize = 85;
  const labelWidth = 260;
  const headerHeight = 120;

  return (
    <Box
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Group mb="xs">
        <Tooltip
          label={isEverythingCollapsed ? "Alle ausklappen" : "Alle einklappen"}
          withArrow
          position="right"
        >
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
        </Tooltip>
      </Group>

      <Card
        withBorder
        p={0}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div style={{ overflow: "auto", flex: 1, width: "100%" }}>
          <div
            style={{
              minWidth: "100%",
              width: "max-content",
              display: "flex",
              flexDirection: "column",
            }}
          >
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
                  flexShrink: 0,
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
                  userSelect: "none",
                }}
              >
                Struktur / Team
              </div>
              <div
                style={{ display: "flex", backgroundColor: "white", flex: 1 }}
              >
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
                      userSelect: "none",
                    }}
                  >
                    <div
                      style={{
                        writingMode: "vertical-rl",
                        textOrientation: "mixed",
                        transform: "rotate(180deg)",
                        fontSize: "12px",
                        fontWeight: 400,
                      }}
                    >
                      {emp.name}
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    flex: 1,
                    borderBottom: "2px solid #dee2e6",
                    backgroundColor: "white",
                  }}
                />
              </div>
            </div>

            {nestedData.map((catGroup) => {
              const isCatCollapsed = collapsedStates[catGroup.category.id!];
              return (
                <div key={catGroup.category.id}>
                  <div
                    onClick={() => toggleItem(catGroup.category.id!)}
                    style={{
                      display: "flex",
                      width: "100%",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <div
                      style={{
                        width: labelWidth,
                        backgroundColor: "#f8f9fa",
                        padding: "8px 12px",
                        position: "sticky",
                        left: 0,
                        zIndex: 15,
                        borderRight: "1px solid #dee2e6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #dee2e6",
                      }}
                    >
                      <Group gap="xs">
                        {isCatCollapsed ? (
                          <IconPlus size={14} color="#228be6" />
                        ) : (
                          <IconMinus size={14} color="#228be6" />
                        )}
                        <Text fw={700} size="xs" c="gray.8">
                          {catGroup.category.name.toUpperCase()}
                        </Text>
                      </Group>
                      <Badge
                        size="xs"
                        variant="filled"
                        color={getScoreColor(catGroup.avgScore)}
                      >
                        {catGroup.avgScore}%
                      </Badge>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: "#f8f9fa",
                        borderBottom: "1px solid #dee2e6",
                      }}
                    />
                  </div>

                  {!isCatCollapsed &&
                    catGroup.subcategories.map((subGroup) => {
                      const isSubCollapsed =
                        collapsedStates[subGroup.subCategory.id!];
                      return (
                        <div key={subGroup.subCategory.id}>
                          <div
                            onClick={() => toggleItem(subGroup.subCategory.id!)}
                            style={{
                              display: "flex",
                              width: "100%",
                              cursor: "pointer",
                              userSelect: "none",
                            }}
                          >
                            <div
                              style={{
                                width: labelWidth,
                                padding: "6px 12px 6px 24px",
                                backgroundColor: "white",
                                position: "sticky",
                                left: 0,
                                zIndex: 10,
                                borderRight: "1px solid #dee2e6",
                                borderBottom: "1px solid #f1f3f5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <Group gap="xs">
                                {isSubCollapsed ? (
                                  <IconPlus size={12} color="#adb5bd" />
                                ) : (
                                  <IconMinus size={12} color="#adb5bd" />
                                )}
                                <Text fw={500} size="xs" c="gray.7">
                                  {subGroup.subCategory.name}
                                </Text>
                              </Group>
                              <Text size="10px" c="dimmed">
                                {subGroup.avgScore}%
                              </Text>
                            </div>
                            <div
                              style={{
                                flex: 1,
                                backgroundColor: "white",
                                borderBottom: "1px solid #f1f3f5",
                              }}
                            />
                          </div>

                          {!isSubCollapsed &&
                            subGroup.skills.map((skill) => (
                              <div
                                key={skill.id}
                                style={{ display: "flex", width: "100%" }}
                              >
                                <div
                                  style={{
                                    width: labelWidth,
                                    padding: "6px 12px 6px 44px",
                                    fontSize: "12px",
                                    fontWeight: 400,
                                    backgroundColor: "white",
                                    position: "sticky",
                                    left: 0,
                                    zIndex: 5,
                                    borderRight: "1px solid #dee2e6",
                                    borderBottom: "1px solid #f8f9fa",
                                    userSelect: "none",
                                    color: "#495057",
                                  }}
                                >
                                  {skill.name}
                                </div>
                                <div style={{ display: "flex", flex: 1 }}>
                                  {employees.map((emp) => {
                                    const level =
                                      getAssessment(emp.id!, skill.id!)
                                        ?.level || 0;
                                    const levelObj = LEVELS.find(
                                      (l) => l.value === level,
                                    );
                                    return (
                                      <div
                                        key={`${emp.id}-${skill.id}`}
                                        style={{
                                          width: cellSize,
                                          height: "36px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          borderBottom: "1px solid #f8f9fa",
                                          borderRight: "1px solid #f8f9fa",
                                          userSelect: "none",
                                        }}
                                        onContextMenu={(e) =>
                                          e.preventDefault()
                                        }
                                      >
                                        <Badge
                                          color={levelObj?.color}
                                          variant={
                                            level === 0 ? "light" : "filled"
                                          }
                                          onClick={() =>
                                            handleLevelChange(
                                              emp.id!,
                                              skill.id!,
                                              level,
                                            )
                                          }
                                          style={{
                                            cursor: "pointer",
                                            width: "80%",
                                            fontSize: "9px",
                                            height: "18px",
                                          }}
                                        >
                                          {levelObj?.label}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                  <div
                                    style={{
                                      flex: 1,
                                      borderBottom: "1px solid #f8f9fa",
                                      backgroundColor: "white",
                                    }}
                                  />
                                </div>
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

      <Box mt="md">
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconInfoCircle size={16} />}
          onClick={() => setLegendOpened((o) => !o)}
        >
          Legende {legendOpened ? "ausblenden" : "einblenden"}
        </Button>
        <Collapse in={legendOpened} mt="xs">
          <Card withBorder p="xs">
            <Group gap="xl">
              {LEVELS.map((l) => (
                <Group key={l.value} gap={5}>
                  <Badge color={l.color} size="sm">
                    {l.label}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {l.value === 0 ? "Keine" : "Erfahrung"}
                  </Text>
                </Group>
              ))}
            </Group>
          </Card>
        </Collapse>
      </Box>
    </Box>
  );
};
