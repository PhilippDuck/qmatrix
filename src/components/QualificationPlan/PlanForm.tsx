import React, { useState, useEffect, useMemo } from "react";
import {
  Drawer,
  Stack,
  Select,
  Group,
  Button,
  Text,
  Divider,
  Textarea,
  Alert,
  Badge,
  Box,
  Checkbox,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconPlus, IconAlertCircle, IconTarget, IconUser } from "@tabler/icons-react";
import { useData, QualificationPlan, SkillGap } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";
import { SkillGapAnalysis } from "./SkillGapAnalysis";

interface PlanFormProps {
  opened: boolean;
  onClose: () => void;
  editingPlan?: QualificationPlan | null;
}

export const PlanForm: React.FC<PlanFormProps> = ({
  opened,
  onClose,
  editingPlan,
}) => {
  const {
    employees,
    roles,
    qualificationPlans,
    addQualificationPlan,
    updateQualificationPlan,
    updateEmployee,
    getSkillGapsForEmployee,
  } = useData();
  const { anonymizeName } = usePrivacy();

  const [formData, setFormData] = useState({
    employeeId: "",
    targetRoleId: "",
    status: "draft" as QualificationPlan["status"],
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [filterDeficits, setFilterDeficits] = useState(true);

  const employeeOptions = useMemo(() => {
    // Get IDs of employees who already have an active or draft plan
    // Exclude the current plan if we are editing
    const employeesWithActivePlans = new Set(
      qualificationPlans
        .filter((p) => (p.status === "active" || p.status === "draft") && (!editingPlan || p.id !== editingPlan.id))
        .map((p) => p.employeeId)
    );

    const options = employees.map((e) => {
      // Calculate gaps considering all employee roles
      // For employees with multiple roles, we combine requirements from all roles
      let allGaps: ReturnType<typeof getSkillGapsForEmployee> = [];
      if (e.roles && e.roles.length > 0) {
        e.roles.forEach(roleName => {
          const role = roles.find((r) => r.name === roleName);
          if (role) {
            const roleGaps = getSkillGapsForEmployee(e.id!, role.id || null);
            // Merge gaps, avoiding duplicates by skillId
            roleGaps.forEach(gap => {
              if (!allGaps.some(g => g.skillId === gap.skillId)) {
                allGaps.push(gap);
              }
            });
          }
        });
      } else {
        allGaps = getSkillGapsForEmployee(e.id!, null);
      }
      return {
        ...e,
        gapCount: allGaps.length,
        hasActivePlan: employeesWithActivePlans.has(e.id!),
      };
    });

    // Filter out employees with active plans
    let filtered = options.filter((e) => !e.hasActivePlan);

    if (filterDeficits) {
      filtered = filtered.filter((e) => e.gapCount > 0);
    }
    return filtered;
  }, [employees, roles, getSkillGapsForEmployee, filterDeficits, qualificationPlans, editingPlan]);

  const selectData = employeeOptions.map((e) => ({
    value: e.id!,
    label: `${anonymizeName(e.name, e.id)}${e.roles && e.roles.length > 0 ? ` (${e.roles.join(", ")})` : ""} • ${e.gapCount} Defizit${e.gapCount !== 1 ? "e" : ""}`,
  }));

  // Reset form when opened or editing plan changes
  useEffect(() => {
    if (opened) {
      if (editingPlan) {
        setFormData({
          employeeId: editingPlan.employeeId,
          targetRoleId: editingPlan.targetRoleId || "",
          status: editingPlan.status,
          notes: editingPlan.notes || "",
        });
      } else {
        setFormData({
          employeeId: "",
          targetRoleId: "",
          status: "draft",
          notes: "",
        });
      }
    }
  }, [opened, editingPlan]);

  // Update skill gaps when employee or target role changes
  // Update skill gaps when employee or target role changes
  useEffect(() => {
    if (formData.employeeId) {
      const gaps = getSkillGapsForEmployee(formData.employeeId, formData.targetRoleId || null);
      setSkillGaps(gaps);
    } else {
      setSkillGaps([]);
    }
  }, [formData.employeeId, formData.targetRoleId, getSkillGapsForEmployee]);

  // Auto-select employee's first role when employee is selected
  useEffect(() => {
    if (formData.employeeId && !editingPlan) {
      const employee = employees.find((e) => e.id === formData.employeeId);
      if (employee?.roles && employee.roles.length > 0) {
        // Use the first role as default target role
        const role = roles.find((r) => r.name === employee.roles![0]);
        if (role) {
          setFormData((prev) => ({ ...prev, targetRoleId: role.id! }));
        }
      }
    }
  }, [formData.employeeId, employees, roles, editingPlan]);

  const handleSave = async () => {
    if (!formData.employeeId) return;

    setLoading(true);
    try {
      const targetRole = formData.targetRoleId ? roles.find((r) => r.id === formData.targetRoleId) : undefined;

      if (editingPlan) {
        await updateQualificationPlan(editingPlan.id!, {
          targetRoleId: formData.targetRoleId || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        });
      } else {
        // Update employee's role ONLY if a target role works selected
        const employee = employees.find((e) => e.id === formData.employeeId);
        if (employee && targetRole) {
          await updateEmployee(formData.employeeId, {
            name: employee.name,
            department: employee.department,
            role: targetRole.name,
          });
        }

        await addQualificationPlan({
          employeeId: formData.employeeId,
          targetRoleId: formData.targetRoleId || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        });
      }
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    } finally {
      setLoading(false);
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

  const isEditing = !!editingPlan;
  const selectedEmployee = employees.find((e) => e.id === formData.employeeId);
  const selectedRole = roles.find((r) => r.id === formData.targetRoleId);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
      overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      title={
        <Text fw={700} size="lg">
          {isEditing ? "Qualifizierungsplan bearbeiten" : "Neuen Qualifizierungsplan erstellen"}
        </Text>
      }
    >
      <Stack gap="md">
        <Divider label="Grunddaten" labelPosition="center" />

        <Select
          label="Mitarbeiter"
          placeholder="Mitarbeiter auswählen"
          leftSection={<IconUser size={16} />}
          data={selectData}
          value={formData.employeeId}
          onChange={(value) =>
            setFormData({ ...formData, employeeId: value || "" })
          }
          searchable
          required
          disabled={isEditing}
        />
        <Checkbox
          label="Nur Mitarbeiter mit aktuellen Defiziten anzeigen"
          checked={filterDeficits}
          onChange={(event) => setFilterDeficits(event.currentTarget.checked)}
          mb="sm"
          size="xs"
        />

        <Select
          label="Zielrolle (Optional)"
          placeholder="Keine Zielrolle (Individuelle Entwicklung)"
          leftSection={<IconTarget size={16} />}
          data={roles.map((r) => ({ value: r.id!, label: r.name }))}
          value={formData.targetRoleId}
          onChange={(value) =>
            setFormData({ ...formData, targetRoleId: value || "" })
          }
          searchable
          clearable
          description={
            selectedEmployee?.roles && selectedEmployee.roles.length > 0
              ? `Aktuelle Rollen: ${selectedEmployee.roles.join(", ")}`
              : "Wählen Sie eine Zielrolle oder lassen Sie das Feld leer für individuelle Ziele."
          }
        />

        <Select
          label="Status"
          data={[
            { value: "draft", label: "Entwurf" },
            { value: "active", label: "Aktiv" },
            { value: "completed", label: "Abgeschlossen" },
            { value: "archived", label: "Archiviert" },
          ]}
          value={formData.status}
          onChange={(value) =>
            setFormData({
              ...formData,
              status: (value as QualificationPlan["status"]) || "draft",
            })
          }
        />

        <Textarea
          label="Notizen"
          placeholder="Optionale Notizen zum Plan..."
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.currentTarget.value })
          }
          minRows={3}
        />

        {formData.employeeId && (
          <>
            <Divider
              label={
                <Group gap="xs">
                  <Text>Defizit-Analyse</Text>
                  {skillGaps.length > 0 && (
                    <Badge color="red" size="sm">
                      {skillGaps.length} Defizite
                    </Badge>
                  )}
                </Group>
              }
              labelPosition="center"
            />

            {skillGaps.length === 0 ? (
              <Alert color="green" icon={<IconAlertCircle size={16} />}>
                {formData.targetRoleId
                  ? (roles.find(r => r.id === formData.targetRoleId)?.requiredSkills?.length
                    ? "Keine Skill-Defizite gefunden! Der Mitarbeiter erfüllt bereits alle Anforderungen der Zielrolle."
                    : "Diese Rolle hat keine Skill-Anforderungen definiert.")
                  : "Keine Defizite gefunden. (Basierend auf individuell festgelegten Soll-Werten)"}
              </Alert>
            ) : (
              <Box style={{ maxHeight: 400, overflowY: "auto" }}>
                <SkillGapAnalysis
                  gaps={skillGaps}
                  employeeId={formData.employeeId}
                  compact
                />
              </Box>
            )}
          </>
        )}

        <Group justify="flex-end" mt="xl">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
            disabled={!formData.employeeId}
            leftSection={<IconPlus size={16} />}
          >
            {isEditing ? "Aktualisieren" : "Plan erstellen"}
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
};
