import React, { useState, useEffect } from "react";
import {
  Drawer,
  Stack,
  Select,
  Group,
  Button,
  Text,
  Divider,
  Textarea,
  TextInput,
  NumberInput,
  SegmentedControl,
  Alert,
  Badge,
  Paper,
  Slider,
  RangeSlider,
  Box,
  useComputedColorScheme,
  Modal,
} from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { useHotkeys } from "@mantine/hooks";
import {
  IconPlus,
  IconUsers,
  IconSchool,
  IconAlertCircle,
  IconUser,
  IconBook,
} from "@tabler/icons-react";
import {
  useData,
  QualificationMeasure,
  SkillGap,
} from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";
import { MentorSuggestion } from "./MentorSuggestion";

interface MeasureFormProps {
  opened: boolean;
  onClose: () => void;
  planId: string;
  employeeId: string;
  skillGaps: SkillGap[];
  editingMeasure?: QualificationMeasure | null;
  initialSkillId?: string | null; // [NEW] Pre-select skill
  onDelete?: (measureId: string) => Promise<void>;
}

export const MeasureForm: React.FC<MeasureFormProps> = ({
  opened,
  onClose,
  planId,
  employeeId,
  skillGaps,
  editingMeasure,
  initialSkillId,
  onDelete,
}) => {
  const {
    skills,
    addQualificationMeasure,
    updateQualificationMeasure,
    getPotentialMentors,
    qualificationMeasures,
    qualificationPlans,
  } = useData();
  const { anonymizeName } = usePrivacy();
  const computedColorScheme = useComputedColorScheme("light");

  // Get all measures for this employee (across all plans) to show occupied dates
  const employeeMeasures = React.useMemo(() => {
    const employeePlanIds = qualificationPlans
      .filter((p) => p.employeeId === employeeId)
      .map((p) => p.id);
    return qualificationMeasures.filter(
      (m) =>
        employeePlanIds.includes(m.planId) &&
        m.startDate &&
        m.targetDate &&
        m.id !== editingMeasure?.id // Exclude the measure being edited
    );
  }, [qualificationMeasures, qualificationPlans, employeeId, editingMeasure]);

  const [formData, setFormData] = useState({
    skillId: "",
    type: "internal" as "internal" | "external" | "self_learning",
    mentorId: "",
    externalProvider: "",
    externalCourse: "",
    estimatedCost: undefined as number | undefined,
    startDate: undefined as Date | undefined,
    targetDate: undefined as Date | undefined,
    notes: "",
    measureStartLevel: 0, // [NEW] Default start
    measureTargetLevel: 100, // Default to 100, will be updated on skill selection
  });
  const [loading, setLoading] = useState(false);

  // Get current and role target level from skill gaps
  const selectedGap = skillGaps.find((g) => g.skillId === formData.skillId);
  const currentLevel = selectedGap?.currentLevel ?? 0;
  // Role target remains the reference, but measure target can be different
  const roleTargetLevel = selectedGap?.targetLevel ?? 100;

  // Get potential mentors for selected skill
  const potentialMentors = formData.skillId
    ? getPotentialMentors(formData.skillId, employeeId)
    : [];

  // Skill Gaps are available even if they already have measures (allowing multiple steps)
  const availableSkillGaps = skillGaps;

  // Reset form when opened or editing measure changes
  // Unsaved Changes Logic
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState(formData);

  useEffect(() => {
    if (opened) {
      if (editingMeasure) {
        const initial = {
          skillId: editingMeasure.skillId,
          type: editingMeasure.type,
          mentorId: editingMeasure.mentorId || "",
          externalProvider: editingMeasure.externalProvider || "",
          externalCourse: editingMeasure.externalCourse || "",
          estimatedCost: editingMeasure.estimatedCost,
          startDate: editingMeasure.startDate
            ? new Date(editingMeasure.startDate)
            : undefined,
          targetDate: editingMeasure.targetDate
            ? new Date(editingMeasure.targetDate)
            : undefined,
          notes: editingMeasure.notes || "",
          measureStartLevel: editingMeasure.startLevel ?? 0, // Load existing start level (migration fallback 0)
          measureTargetLevel: editingMeasure.targetLevel,
        };
        setFormData(initial);
        setInitialFormData(initial);
      } else {
        const initial = {
          skillId: initialSkillId || "", // Use initialSkillId if provided
          type: "internal" as const,
          mentorId: "",
          externalProvider: "",
          externalCourse: "",
          estimatedCost: undefined,
          startDate: undefined,
          targetDate: undefined,
          notes: "",
          measureStartLevel: 0,
          measureTargetLevel: 100,
        };
        setFormData(initial);
        setInitialFormData(initial);
      }
    }
  }, [opened, editingMeasure, initialSkillId]);

  const hasChanges = () => {
    // Quick and dirty deep compare
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  };

  const handleCloseAttempt = () => {
    if (hasChanges()) {
      setConfirmationOpen(true);
    } else {
      onClose();
    }
  };


  // When skill is selected (and not editing), set initial target level to role target
  useEffect(() => {
    // Logic for Chaining:
    // Find highest target level of existing measures for this skill in this plan
    const existingMeasuresForSkill = qualificationMeasures.filter(
      m => m.planId === planId && m.skillId === formData.skillId
    );

    if (selectedGap) {
      let suggestedStart = selectedGap.currentLevel;
      if (existingMeasuresForSkill.length > 0) {
        const maxLevel = Math.max(...existingMeasuresForSkill.map(m => m.targetLevel));
        suggestedStart = maxLevel;
      }

      setFormData(prev => ({
        ...prev,
        measureStartLevel: suggestedStart,
        measureTargetLevel: selectedGap.targetLevel
      }));
    }
  }, [formData.skillId, editingMeasure, selectedGap, qualificationMeasures, planId]);

  // Auto-select mentor type based on availability
  useEffect(() => {
    if (formData.skillId && !editingMeasure && formData.type === 'internal') {
      const mentors = getPotentialMentors(formData.skillId, employeeId);
      if (mentors.length === 0) {
        // If no internal mentors, default to something else, maybe self_learning or external
        // setFormData((prev) => ({ ...prev, type: "external", mentorId: "" }));
      }
    }
  }, [formData.skillId, employeeId, getPotentialMentors, editingMeasure, formData.type]);

  const handleSave = async () => {
    if (!formData.skillId) return;

    setLoading(true);
    try {
      const measureData: Omit<QualificationMeasure, "id" | "updatedAt"> = {
        planId,
        skillId: formData.skillId,
        currentLevel,
        startLevel: formData.measureStartLevel, // [NEW]
        targetLevel: formData.measureTargetLevel, // Use User defined target
        type: formData.type,
        status: editingMeasure?.status || "pending",
        ...(formData.type === "internal" && formData.mentorId
          ? { mentorId: formData.mentorId }
          : {}),
        ...(formData.type === "external"
          ? {
            externalProvider: formData.externalProvider || undefined,
            externalCourse: formData.externalCourse || undefined,
            estimatedCost: formData.estimatedCost,
          }
          : {}),
        startDate: formData.startDate ? new Date(formData.startDate).getTime() : undefined,
        targetDate: formData.targetDate ? new Date(formData.targetDate).getTime() : undefined,
        notes: formData.notes || undefined,
      };

      if (editingMeasure) {
        await updateQualificationMeasure(editingMeasure.id!, measureData);
      } else {
        await addQualificationMeasure(measureData);
      }
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (editingMeasure && onDelete) {
      await onDelete(editingMeasure.id!);
      onClose();
    }
  };

  useHotkeys(
    [
      [
        "mod+Enter",
        (event) => {
          event.preventDefault();
          handleSave();
        },
      ],
    ],
    ["INPUT", "TEXTAREA", "SELECT"]
  );

  const isEditing = !!editingMeasure;

  // Filter skills: Remove those where max planned target >= role target
  // UNLESS it is the currently selected one (editing) or the explicitly requested one (quick add)
  const skillOptions = availableSkillGaps
    .filter(gap => {
      // Find all measures for this skill in this plan
      const skillMeasures = qualificationMeasures.filter(m => m.planId === planId && m.skillId === gap.skillId);
      const maxPlanned = Math.max(0, ...skillMeasures.map(m => m.targetLevel));

      // Keep if:
      // 1. Not fully planned yet (maxPlanned < gap.targetLevel)
      // 2. OR it's the one we are currently editing/adding (to allow adding more steps even if technically covered)
      return maxPlanned < gap.targetLevel || gap.skillId === initialSkillId || gap.skillId === editingMeasure?.skillId;
    })
    .map((gap) => ({
      value: gap.skillId,
      label: `${gap.categoryName} > ${gap.subCategoryName} > ${gap.skillName} (${gap.currentLevel}% → ${gap.targetLevel}%)`,
    }));

  const levelMarks = [
    { value: 0, label: '0%' },
    { value: 25, label: '25%' },
    { value: 50, label: '50%' },
    { value: 75, label: '75%' },
    { value: 100, label: '100%' },
  ];

  return (
    <>
      <Drawer
        opened={opened}
        onClose={handleCloseAttempt}
        position="right"
        size="lg"
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
        title={
          <Text fw={700} size="lg">
            {isEditing ? "Maßnahme bearbeiten" : "Neue Maßnahme hinzufügen"}
          </Text>
        }
      >
        <Stack gap="md" h="calc(100vh - 100px)" justify="space-between">
          <Box style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            <Stack gap="md">
              <Divider label="Skill-Auswahl" labelPosition="center" />

              <Select
                label="Skill"
                placeholder="Skill auswählen"
                data={skillOptions}
                value={formData.skillId}
                onChange={(value) =>
                  setFormData({ ...formData, skillId: value || "", mentorId: "" })
                }
                searchable
                required
                disabled={isEditing}
                description={
                  skillGaps.length === 0
                    ? "Keine Skill-Defizite vorhanden"
                    : undefined
                }
              />

              {selectedGap && (
                <Paper p="sm" radius="sm" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Aktuelles Skill-Gap:
                      </Text>
                      <Group gap="xs">
                        <Badge color="gray" variant="light">
                          {currentLevel}%
                        </Badge>
                        <Text size="sm">→</Text>
                        <Badge color="blue" variant="light">
                          {roleTargetLevel}%
                        </Badge>
                      </Group>
                    </Group>

                    <Divider my="xs" />

                    <Text size="sm" fw={500}>Ziel dieser Maßnahme</Text>
                    <Box px="xs" pb="xl">
                      <RangeSlider
                        defaultValue={[formData.measureStartLevel, formData.measureTargetLevel]}
                        value={[formData.measureStartLevel, formData.measureTargetLevel]}
                        onChange={([start, end]) => setFormData({ ...formData, measureStartLevel: start, measureTargetLevel: end })}
                        marks={levelMarks}
                        step={25}
                        min={0}
                        max={100}
                        minRange={25}
                        label={(val) => `${val}%`}
                      />
                    </Box>
                  </Stack>
                </Paper>
              )}

              <Divider label="Maßnahmen-Typ" labelPosition="center" />

              <SegmentedControl
                fullWidth
                value={formData.type}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    type: value as "internal" | "external" | "self_learning",
                    mentorId: "",
                  })
                }
                data={[
                  {
                    value: "internal",
                    label: (
                      <Group gap="xs" justify="center">
                        <IconUsers size={16} />
                        <Text size="sm">Intern</Text>
                      </Group>
                    ),
                  },
                  {
                    value: "external",
                    label: (
                      <Group gap="xs" justify="center">
                        <IconSchool size={16} />
                        <Text size="sm">Extern</Text>
                      </Group>
                    ),
                  },
                  {
                    value: "self_learning",
                    label: (
                      <Group gap="xs" justify="center">
                        <IconBook size={16} />
                        <Text size="sm">Selbstst.</Text>
                      </Group>
                    ),
                  },
                ]}
              />

              {formData.type === "internal" && (
                <>
                  {potentialMentors.length === 0 && formData.skillId ? (
                    <Alert color="yellow" icon={<IconAlertCircle size={16} title="Warnung" />}>
                      Kein Mitarbeiter mit 100% Level in diesem Skill verfügbar. Ggf. externe Schulung oder Selbststudium wählen.
                    </Alert>
                  ) : (
                    <>
                      <Select
                        label="Mentor"
                        placeholder="Mentor auswählen"
                        leftSection={<IconUser size={16} />}
                        data={potentialMentors.map((m) => ({
                          value: m.id!,
                          label: anonymizeName(m.name, m.id),
                        }))}
                        value={formData.mentorId}
                        onChange={(value) =>
                          setFormData({ ...formData, mentorId: value || "" })
                        }
                        searchable
                        disabled={!formData.skillId}
                      />

                      {formData.skillId && potentialMentors.length > 0 && (
                        <MentorSuggestion
                          mentors={potentialMentors}
                          selectedMentorId={formData.mentorId}
                          onSelect={(mentorId) =>
                            setFormData({ ...formData, mentorId })
                          }
                        />
                      )}
                    </>
                  )}
                </>
              )}

              {formData.type === "external" && (
                <>
                  <TextInput
                    label="Anbieter"
                    placeholder="z.B. Udemy, Coursera, interne Akademie"
                    value={formData.externalProvider}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        externalProvider: e.currentTarget.value,
                      })
                    }
                  />

                  <TextInput
                    label="Kursname"
                    placeholder="z.B. Advanced TypeScript Masterclass"
                    value={formData.externalCourse}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        externalCourse: e.currentTarget.value,
                      })
                    }
                  />

                  <NumberInput
                    label="Geschätzte Kosten (€)"
                    placeholder="0"
                    min={0}
                    value={formData.estimatedCost}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        estimatedCost: typeof value === "number" ? value : undefined,
                      })
                    }
                    leftSection="€"
                  />
                </>
              )}

              {/* Self Learning fields (mostly just timeline and notes, no specific extra fields) */}
              {formData.type === "self_learning" && (
                <Alert variant="light" color="blue" title="Selbststudium / Erfahrung">
                  Planen Sie hier Zeit für eigenständiges Lernen oder das Sammeln von praktischer Erfahrung im Projekt ein.
                </Alert>
              )}

              <Divider label="Zeitplanung" labelPosition="center" />

              <Paper p="md" withBorder radius="sm">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>Zeitraum auswählen</Text>
                    {formData.startDate && formData.targetDate && (
                      <Badge variant="light" color="blue">
                        {new Date(formData.startDate).toLocaleDateString("de-DE")} - {new Date(formData.targetDate).toLocaleDateString("de-DE")}
                      </Badge>
                    )}
                  </Group>

                  {employeeMeasures.length > 0 && (
                    <Text size="xs" c="dimmed">
                      Rot markierte Bereiche sind bereits durch andere Maßnahmen belegt.
                    </Text>
                  )}

                  <Box style={{ display: "flex", justifyContent: "center" }}>
                    <DatePicker
                      type="range"
                      value={[formData.startDate || null, formData.targetDate || null]}
                      onChange={([start, end]) => {
                        setFormData({
                          ...formData,
                          startDate: (start as any) || undefined,
                          targetDate: (end as any) || undefined,
                        });
                      }}
                      minDate={new Date()}
                      numberOfColumns={2}
                      getDayProps={(date) => {
                        // Check if this date is within any existing measure's range
                        const isOccupied = employeeMeasures.some((m) => {
                          const start = new Date(m.startDate!);
                          const end = new Date(m.targetDate!);
                          start.setHours(0, 0, 0, 0);
                          end.setHours(23, 59, 59, 999);
                          const checkDate = new Date(date);
                          checkDate.setHours(12, 0, 0, 0);
                          return checkDate >= start && checkDate <= end;
                        });

                        return isOccupied
                          ? {
                            style: {
                              backgroundColor: computedColorScheme === "dark"
                                ? "rgba(250, 82, 82, 0.15)"
                                : "var(--mantine-color-red-1)",
                              color: computedColorScheme === "dark"
                                ? "var(--mantine-color-red-5)"
                                : "var(--mantine-color-red-9)",
                              fontWeight: computedColorScheme === "dark" ? 600 : "normal",
                            },
                          }
                          : {};
                      }}
                    />
                  </Box>
                </Stack>
              </Paper>

              <Textarea
                label="Notizen"
                placeholder="Optionale Notizen, Lernziele oder Links..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.currentTarget.value })
                }
                minRows={3}
              />

            </Stack>
          </Box>
          <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            {isEditing && onDelete ? (
              <Button variant="light" color="red" onClick={handleDelete}>
                Löschen
              </Button>
            ) : (
              <div />
            )}
            <Group>
              <Button variant="subtle" color="gray" onClick={handleCloseAttempt}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                loading={loading}
                disabled={!formData.skillId}
                leftSection={<IconPlus size={16} />}
              >
                {isEditing ? "Aktualisieren" : "Maßnahme hinzufügen"}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Drawer>
      <Modal
        opened={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        title="Ungespeicherte Änderungen"
        centered
      >
        <Text size="sm" mb="lg">
          Du hast ungespeicherte Änderungen. Möchtest du diese speichern oder verwerfen?
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setConfirmationOpen(false)}>
            Abbrechen
          </Button>
          <Button variant="light" color="red" onClick={() => {
            setConfirmationOpen(false);
            onClose();
          }}>
            Verwerfen
          </Button>
          <Button onClick={() => {
            setConfirmationOpen(false);
            handleSave();
          }}>
            Speichern
          </Button>
        </Group>
      </Modal>
    </>
  );
};
