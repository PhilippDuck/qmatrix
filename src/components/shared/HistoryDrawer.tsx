import React from 'react';
import {
  Drawer,
  Stack,
  Text,
  Group,
  Badge,
  ActionIcon,
  ScrollArea,
  Tooltip,
  Box,
  ThemeIcon,
  Paper,
} from '@mantine/core';
import {
  IconArrowBack,
  IconUser,
  IconCategory,
  IconFolder,
  IconBulb,
  IconBuildingSkyscraper,
  IconUserCircle,
  IconClipboardList,
  IconTargetArrow,
  IconCheck,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconEye,
} from '@tabler/icons-react';
import { ChangeHistoryEntry, EntityType, Employee, Skill, SubCategory, Category, Department, EmployeeRole } from "../../store/useStore";
import { useStore } from "../../store/useStore";

interface HistoryDrawerProps {
  opened: boolean;
  onClose: () => void;
}

interface DataContext {
  employees: Employee[];
  skills: Skill[];
  subcategories: SubCategory[];
  categories: Category[];
  departments: Department[];
  roles: EmployeeRole[];
}

const entityTypeConfig: Record<EntityType, { icon: React.ElementType; label: string; color: string }> = {
  employee: { icon: IconUser, label: 'Mitarbeiter', color: 'blue' },
  category: { icon: IconCategory, label: 'Kategorie', color: 'grape' },
  subcategory: { icon: IconFolder, label: 'Unterkategorie', color: 'violet' },
  skill: { icon: IconBulb, label: 'Skill', color: 'orange' },
  department: { icon: IconBuildingSkyscraper, label: 'Abteilung', color: 'teal' },
  role: { icon: IconUserCircle, label: 'Rolle', color: 'cyan' },
  qualificationPlan: { icon: IconClipboardList, label: 'Qualifizierungsplan', color: 'pink' },
  qualificationMeasure: { icon: IconTargetArrow, label: 'Maßnahme', color: 'indigo' },
  assessment: { icon: IconCheck, label: 'Bewertung', color: 'green' },
  savedView: { icon: IconEye, label: 'Ansicht', color: 'gray' },
};

const actionLabels: Record<string, { label: string; color: string }> = {
  create: { label: 'Neu', color: 'green' },
  update: { label: 'Geändert', color: 'blue' },
  delete: { label: 'Gelöscht', color: 'red' },
};

// Helper to format level values
function formatLevel(level: number | undefined): string {
  if (level === undefined || level === null) return '0%';
  if (level === -1) return 'n.a.';
  return `${level}%`;
}

// Generate detailed description based on entity type and action
function generateDescription(entry: ChangeHistoryEntry, ctx: DataContext): { description: string; trend?: 'up' | 'down' | 'none' } {
  const { entityType, action, previousData, newData } = entry;

  switch (entityType) {
    case 'assessment': {
      const prev = previousData;
      const next = newData;

      // Check if it's a target level change
      if (next?.targetLevel !== undefined && prev?.targetLevel !== next?.targetLevel) {
        const oldTarget = prev?.targetLevel;
        const newTarget = next?.targetLevel;
        if (oldTarget) {
          return { description: `Ziel: ${formatLevel(oldTarget)} → ${formatLevel(newTarget)}` };
        }
        return { description: `Ziel-Level: ${formatLevel(newTarget)}` };
      }

      // Regular level change
      const oldLevel = prev?.level ?? 0;
      const newLevel = next?.level ?? 0;

      if (action === 'create' || !prev) {
        return {
          description: `Neues Level: ${formatLevel(newLevel)}`,
          trend: newLevel > 0 ? 'up' : 'none'
        };
      }

      const trend = newLevel > oldLevel ? 'up' : newLevel < oldLevel ? 'down' : 'none';
      return {
        description: `Level: ${formatLevel(oldLevel)} → ${formatLevel(newLevel)}`,
        trend
      };
    }

    case 'skill': {
      const subCat = ctx.subcategories.find(sc => sc.id === (newData?.subCategoryId || previousData?.subCategoryId));
      const cat = subCat ? ctx.categories.find(c => c.id === subCat.categoryId) : null;
      const location = subCat ? `${cat?.name || ''} → ${subCat.name}` : '';

      if (action === 'create') {
        return { description: location ? `In: ${location}` : 'Neuer Skill' };
      }
      if (action === 'delete') {
        const cascade = previousData?._cascade;
        if (cascade?.assessments?.length) {
          return { description: `inkl. ${cascade.assessments.length} Bewertungen` };
        }
        return { description: location ? `Aus: ${location}` : 'Skill entfernt' };
      }
      // Update
      if (previousData?.name !== newData?.name) {
        return { description: `"${previousData?.name}" → "${newData?.name}"` };
      }
      return { description: location || 'Skill aktualisiert' };
    }

    case 'employee': {
      const dept = ctx.departments.find(d => d.id === (newData?.department || previousData?.department));
      const roleNames = (newData?.roles || previousData?.roles || [])
        .map((rid: string) => ctx.roles.find(r => r.id === rid)?.name)
        .filter(Boolean)
        .slice(0, 2);

      if (action === 'create') {
        const parts = [];
        if (dept) parts.push(`Abt: ${dept.name}`);
        if (roleNames.length) parts.push(`Rolle: ${roleNames.join(', ')}`);
        return { description: parts.join(' | ') || 'Neuer Mitarbeiter' };
      }
      if (action === 'delete') {
        const cascade = previousData?._cascade;
        if (cascade) {
          const parts = [];
          if (cascade.assessments?.length) parts.push(`${cascade.assessments.length} Bewertungen`);
          if (cascade.qualificationPlans?.length) parts.push(`${cascade.qualificationPlans.length} Pläne`);
          if (parts.length) return { description: `inkl. ${parts.join(', ')}` };
        }
        return { description: dept ? `War in: ${dept.name}` : 'Mitarbeiter entfernt' };
      }
      // Update - find what changed
      const changes = [];
      if (previousData?.name !== newData?.name) {
        changes.push(`Name: "${previousData?.name}" → "${newData?.name}"`);
      }
      if (previousData?.department !== newData?.department) {
        const oldDept = ctx.departments.find(d => d.id === previousData?.department);
        const newDept = ctx.departments.find(d => d.id === newData?.department);
        changes.push(`Abt: ${oldDept?.name || '–'} → ${newDept?.name || '–'}`);
      }
      if (JSON.stringify(previousData?.roles) !== JSON.stringify(newData?.roles)) {
        changes.push('Rollen geändert');
      }
      if (previousData?.isActive !== newData?.isActive) {
        changes.push(newData?.isActive ? 'Reaktiviert' : 'Deaktiviert');
      }
      return { description: changes.join(', ') || 'Aktualisiert' };
    }

    case 'category': {
      if (action === 'create') return { description: 'Neue Kategorie' };
      if (action === 'delete') {
        const cascade = previousData?._cascade;
        if (cascade) {
          const parts = [];
          if (cascade.subcategories?.length) parts.push(`${cascade.subcategories.length} Unterkategorien`);
          if (cascade.skills?.length) parts.push(`${cascade.skills.length} Skills`);
          if (parts.length) return { description: `inkl. ${parts.join(', ')}` };
        }
        return { description: 'Kategorie entfernt' };
      }
      if (previousData?.name !== newData?.name) {
        return { description: `"${previousData?.name}" → "${newData?.name}"` };
      }
      return { description: 'Kategorie aktualisiert' };
    }

    case 'subcategory': {
      const cat = ctx.categories.find(c => c.id === (newData?.categoryId || previousData?.categoryId));
      if (action === 'create') {
        return { description: cat ? `In: ${cat.name}` : 'Neue Unterkategorie' };
      }
      if (action === 'delete') {
        const cascade = previousData?._cascade;
        if (cascade) {
          const parts = [];
          if (cascade.subcategories?.length) parts.push(`${cascade.subcategories.length} Unter-Unterkategorien`);
          if (cascade.skills?.length) parts.push(`${cascade.skills.length} Skills`);
          if (parts.length) return { description: `inkl. ${parts.join(', ')}` };
        }
        return { description: cat ? `Aus: ${cat.name}` : 'Unterkategorie entfernt' };
      }
      if (previousData?.name !== newData?.name) {
        return { description: `"${previousData?.name}" → "${newData?.name}"` };
      }
      return { description: 'Unterkategorie aktualisiert' };
    }

    case 'department': {
      if (action === 'create') return { description: 'Neue Abteilung' };
      if (action === 'delete') return { description: 'Abteilung entfernt' };
      if (previousData?.name !== newData?.name) {
        return { description: `"${previousData?.name}" → "${newData?.name}"` };
      }
      return { description: 'Abteilung aktualisiert' };
    }

    case 'role': {
      if (action === 'create') return { description: 'Neue Rolle' };
      if (action === 'delete') return { description: 'Rolle entfernt' };
      if (previousData?.name !== newData?.name) {
        return { description: `"${previousData?.name}" → "${newData?.name}"` };
      }
      const skillCount = newData?.requiredSkills?.length || 0;
      if (skillCount > 0) {
        return { description: `${skillCount} Skill-Anforderungen` };
      }
      return { description: 'Rolle aktualisiert' };
    }

    case 'qualificationPlan': {
      const employee = ctx.employees.find(e => e.id === (newData?.employeeId || previousData?.employeeId));
      const statusLabels: Record<string, string> = {
        draft: 'Entwurf',
        active: 'Aktiv',
        completed: 'Abgeschlossen',
        archived: 'Archiviert'
      };

      if (action === 'create') {
        return { description: employee ? `Für: ${employee.name}` : 'Neuer Plan' };
      }
      if (action === 'delete') {
        const cascade = previousData?._cascade;
        if (cascade?.qualificationMeasures?.length) {
          return { description: `inkl. ${cascade.qualificationMeasures.length} Maßnahmen` };
        }
        return { description: employee ? `Von: ${employee.name}` : 'Plan entfernt' };
      }
      if (previousData?.status !== newData?.status) {
        return {
          description: `Status: ${statusLabels[previousData?.status] || previousData?.status} → ${statusLabels[newData?.status] || newData?.status}`
        };
      }
      return { description: employee ? `Für: ${employee.name}` : 'Plan aktualisiert' };
    }

    case 'qualificationMeasure': {
      const skill = ctx.skills.find(s => s.id === (newData?.skillId || previousData?.skillId));
      const typeLabels: Record<string, string> = {
        internal: 'Intern',
        external: 'Extern',
        self_learning: 'Selbststudium'
      };
      const statusLabels: Record<string, string> = {
        pending: 'Ausstehend',
        in_progress: 'In Bearbeitung',
        completed: 'Abgeschlossen',
        cancelled: 'Abgebrochen'
      };

      if (action === 'create') {
        const type = typeLabels[newData?.type] || newData?.type;
        const target = newData?.targetLevel ? ` → ${newData.targetLevel}%` : '';
        return { description: `${type}${target}` };
      }
      if (action === 'delete') {
        return { description: skill ? `Skill: ${skill.name}` : 'Maßnahme entfernt' };
      }
      if (previousData?.status !== newData?.status) {
        return {
          description: `${statusLabels[previousData?.status] || '–'} → ${statusLabels[newData?.status] || '–'}`
        };
      }
      return { description: skill ? `Skill: ${skill.name}` : 'Maßnahme aktualisiert' };
    }

    case 'savedView': {
      if (action === 'create') return { description: 'Neue Ansicht erstellt' };
      if (action === 'delete') return { description: 'Ansicht gelöscht' };
      return { description: 'Ansicht aktualisiert' };
    }

    default:
      return { description: '' };
  }
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tagen`;

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'none' }) {
  if (trend === 'up') return <IconTrendingUp size={12} color="var(--mantine-color-green-6)" />;
  if (trend === 'down') return <IconTrendingDown size={12} color="var(--mantine-color-red-6)" />;
  return null;
}

function HistoryEntryCard({ entry, onUndo, ctx }: { entry: ChangeHistoryEntry; onUndo: () => void; ctx: DataContext }) {
  const config = entityTypeConfig[entry.entityType];
  const actionConfig = actionLabels[entry.action];
  const Icon = config.icon;
  const { description, trend } = generateDescription(entry, ctx);

  return (
    <Paper p="sm" withBorder radius="md" style={{ opacity: entry.undone ? 0.5 : 1 }}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }} align="flex-start">
          <ThemeIcon size="md" variant="light" color={config.color} mt={2}>
            <Icon size={16} />
          </ThemeIcon>
          <Box style={{ minWidth: 0, flex: 1 }}>
            <Group gap={6} wrap="nowrap">
              <Text size="sm" fw={500} lineClamp={1}>
                {entry.entityLabel}
              </Text>
              <TrendIcon trend={trend} />
            </Group>
            {description && (
              <Text size="xs" c="dimmed" lineClamp={2} mt={2}>
                {description}
              </Text>
            )}
            <Group gap="xs" mt={4}>
              <Badge size="xs" variant="light" color={actionConfig.color}>
                {actionConfig.label}
              </Badge>
              <Text size="xs" c="dimmed">
                {formatTimestamp(entry.timestamp)}
              </Text>
            </Group>
          </Box>
        </Group>

        {!entry.undone && (
          <Tooltip label={entry.action === 'delete' ? 'Wiederherstellen' : 'Rückgängig'}>
            <ActionIcon
              variant="subtle"
              color={entry.action === 'delete' ? 'green' : 'gray'}
              size="sm"
              onClick={onUndo}
              mt={2}
            >
              <IconArrowBack size={16} />
            </ActionIcon>
          </Tooltip>
        )}

        {entry.undone && (
          <Badge size="xs" variant="outline" color="gray" mt={2}>
            Rückgängig
          </Badge>
        )}
      </Group>
    </Paper>
  );
}

export function HistoryDrawer({ opened, onClose }: HistoryDrawerProps) {
  const { changeHistory, undoChange, employees, skills, subcategories, categories, departments, roles } = useStore();

  const ctx: DataContext = { employees, skills, subcategories, categories, departments, roles };

  const handleUndo = async (entryId: string) => {
    try {
      await undoChange(entryId);
    } catch (err) {
      console.error('Undo failed:', err);
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Text fw={600}>Änderungshistorie</Text>
          <Badge size="sm" variant="light" color="gray">
            {changeHistory.filter(h => !h.undone).length}
          </Badge>
        </Group>
      }
      position="right"
      size="md"
      padding="md"
    >
      <ScrollArea h="calc(100vh - 100px)" offsetScrollbars>
        {changeHistory.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            Keine Änderungen vorhanden
          </Text>
        ) : (
          <Stack gap="xs">
            {changeHistory.map((entry) => (
              <HistoryEntryCard
                key={entry.id}
                entry={entry}
                onUndo={() => handleUndo(entry.id!)}
                ctx={ctx}
              />
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Drawer>
  );
}
