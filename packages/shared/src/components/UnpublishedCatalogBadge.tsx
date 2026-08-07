/**
 * Header/status badge for unpublished catalog changes.
 * HoverCard lists entity-level diff vs last release and offers publish / rollback.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  HoverCard,
  Stack,
  Text,
  Group,
  Button,
  ScrollArea,
  ThemeIcon,
  Divider,
  Loader,
  Box,
} from "@mantine/core";
import {
  IconCircleDot,
  IconPlus,
  IconTrash,
  IconEdit,
  IconRocket,
  IconArrowBackUp,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useStore, useShallow } from "../store/hooks";
import type { CatalogDiffItem, CatalogDiffResult } from "../services/catalogDiff";
import { summarizeDiffCounts } from "../services/catalogDiff";

const KIND_LABEL: Record<string, string> = {
  categories: "Kategorie",
  subcategories: "Unterkategorie",
  skills: "Skill",
  roles: "Rolle",
};

const CHANGE_META: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  added: { label: "Neu", color: "green", icon: IconPlus },
  removed: { label: "Entfernt", color: "red", icon: IconTrash },
  changed: { label: "Geändert", color: "blue", icon: IconEdit },
};

/** sessionStorage flag: open publish modal when landing on Versionen */
export const OPEN_PUBLISH_SESSION_KEY = "skillgrid-manage-open-publish";

export interface UnpublishedCatalogBadgeProps {
  size?: "xs" | "sm" | "md" | "lg";
  /** Short header label vs full releases-page label */
  label?: string;
  /** Navigate to Versionen & open publish flow */
  onPublish?: () => void;
  /** Optional: after successful rollback */
  onRolledBack?: () => void;
}

function DiffItemRow({ item }: { item: CatalogDiffItem }) {
  const meta = CHANGE_META[item.change] || CHANGE_META.changed;
  const Icon = meta.icon;
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <ThemeIcon size={22} radius="sm" variant="light" color={meta.color}>
        <Icon size={12} />
      </ThemeIcon>
      <Box style={{ minWidth: 0, flex: 1 }}>
        <Text size="xs" fw={600} lineClamp={1}>
          {item.label}
        </Text>
        <Text size="xs" c="dimmed">
          {KIND_LABEL[item.kind] || item.kind} · {meta.label}
          {item.detail ? ` — ${item.detail}` : ""}
        </Text>
      </Box>
    </Group>
  );
}

export const UnpublishedCatalogBadge: React.FC<UnpublishedCatalogBadgeProps> = ({
  size = "sm",
  label = "ungesichert",
  onPublish,
  onRolledBack,
}) => {
  const {
    hasUnpublishedCatalogChanges,
    storedCatalogReleases,
    diffAgainstRelease,
    rollbackToRelease,
    categories,
    subcategories,
    skills,
    roles,
  } = useStore(
    useShallow((s) => ({
      hasUnpublishedCatalogChanges: s.hasUnpublishedCatalogChanges,
      storedCatalogReleases: s.storedCatalogReleases,
      diffAgainstRelease: s.diffAgainstRelease,
      rollbackToRelease: s.rollbackToRelease,
      categories: s.categories,
      subcategories: s.subcategories,
      skills: s.skills,
      roles: s.roles,
    }))
  );

  const [diff, setDiff] = useState<CatalogDiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);

  const latestRelease = storedCatalogReleases[0] ?? null;

  const loadDiff = useCallback(async () => {
    setLoading(true);
    try {
      const result = await diffAgainstRelease();
      if (result) {
        setDiff(result);
        return;
      }
      // No baseline release yet → everything live is "new"
      const items: CatalogDiffItem[] = [
        ...categories.map((c) => ({
          kind: "categories" as const,
          change: "added" as const,
          id: c.id!,
          label: c.name || c.id!,
        })),
        ...subcategories.map((s) => ({
          kind: "subcategories" as const,
          change: "added" as const,
          id: s.id!,
          label: s.name || s.id!,
        })),
        ...skills.map((s) => ({
          kind: "skills" as const,
          change: "added" as const,
          id: s.id!,
          label: s.name || s.id!,
        })),
        ...roles.map((r) => ({
          kind: "roles" as const,
          change: "added" as const,
          id: r.id!,
          label: r.name || r.id!,
        })),
      ];
      setDiff({
        items,
        summary: {
          categories: { added: categories.length, removed: 0, changed: 0 },
          subcategories: {
            added: subcategories.length,
            removed: 0,
            changed: 0,
          },
          skills: { added: skills.length, removed: 0, changed: 0 },
          roles: { added: roles.length, removed: 0, changed: 0 },
        },
        isIdentical: items.length === 0,
      });
    } finally {
      setLoading(false);
    }
  }, [
    diffAgainstRelease,
    categories,
    subcategories,
    skills,
    roles,
  ]);

  useEffect(() => {
    if (opened && hasUnpublishedCatalogChanges) {
      void loadDiff();
    }
  }, [opened, hasUnpublishedCatalogChanges, loadDiff]);

  if (!hasUnpublishedCatalogChanges) return null;

  const counts = diff ? summarizeDiffCounts(diff) : null;

  const handlePublish = () => {
    try {
      sessionStorage.setItem(OPEN_PUBLISH_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    onPublish?.();
  };

  const handleRollback = () => {
    if (!latestRelease) {
      notifications.show({
        title: "Kein Rollback möglich",
        message: "Es gibt noch keine freigegebene Version als Basis.",
        color: "orange",
      });
      return;
    }
    modals.openConfirmModal({
      title: `Auf v${latestRelease.version} zurücksetzen?`,
      centered: true,
      children: (
        <Text size="sm">
          Alle ungesicherten Katalog-Änderungen werden verworfen. Der Live-Katalog
          wird auf die zuletzt freigegebene Version{" "}
          <strong>v{latestRelease.version}</strong> zurückgesetzt.
        </Text>
      ),
      labels: { confirm: "Änderungen verwerfen", cancel: "Abbrechen" },
      confirmProps: { color: "orange" },
      onConfirm: async () => {
        setBusy(true);
        try {
          const result = await rollbackToRelease(latestRelease.id);
          if (!result.ok) {
            notifications.show({
              title: "Rollback fehlgeschlagen",
              message: result.errors.map((e) => e.message).join("; "),
              color: "red",
            });
            return;
          }
          notifications.show({
            title: `Zurück auf v${latestRelease.version}`,
            message: "Ungesicherte Änderungen verworfen.",
            color: "green",
          });
          onRolledBack?.();
        } finally {
          setBusy(false);
        }
      },
    });
  };

  return (
    <HoverCard
      width={360}
      shadow="md"
      openDelay={200}
      closeDelay={150}
      position="bottom-start"
      withinPortal
      onOpen={() => setOpened(true)}
      onClose={() => setOpened(false)}
    >
      <HoverCard.Target>
        <Badge
          size={size}
          color="orange"
          variant="filled"
          leftSection={<IconCircleDot size={12} />}
          style={{ flexShrink: 0, cursor: "pointer" }}
        >
          {label}
        </Badge>
      </HoverCard.Target>
      <HoverCard.Dropdown p="sm">
        <Stack gap="sm">
          <div>
            <Text size="sm" fw={600}>
              Ungesicherte Katalog-Änderungen
            </Text>
            <Text size="xs" c="dimmed">
              {latestRelease
                ? `Abweichungen zu freigegeben v${latestRelease.version}`
                : "Noch keine Version freigegeben — alle Einträge sind neu"}
            </Text>
          </div>

          {loading && (
            <Group justify="center" py="sm">
              <Loader size="sm" />
            </Group>
          )}

          {!loading && counts && (
            <Group gap={6}>
              {counts.added > 0 && (
                <Badge size="xs" color="green" variant="light">
                  +{counts.added} neu
                </Badge>
              )}
              {counts.changed > 0 && (
                <Badge size="xs" color="blue" variant="light">
                  {counts.changed} geändert
                </Badge>
              )}
              {counts.removed > 0 && (
                <Badge size="xs" color="red" variant="light">
                  −{counts.removed} entfernt
                </Badge>
              )}
              <Text size="xs" c="dimmed">
                {counts.total} gesamt
              </Text>
            </Group>
          )}

          {!loading && diff && diff.items.length > 0 && (
            <ScrollArea.Autosize mah={220} offsetScrollbars type="auto">
              <Stack gap={6} pr={4}>
                {diff.items.map((item) => (
                  <DiffItemRow key={`${item.kind}-${item.id}-${item.change}`} item={item} />
                ))}
              </Stack>
            </ScrollArea.Autosize>
          )}

          {!loading && diff && diff.items.length === 0 && (
            <Text size="xs" c="dimmed">
              Keine Einzeländerungen gefunden (ggf. nur Metadaten).
            </Text>
          )}

          <Divider />

          <Group gap="xs" grow>
            <Button
              size="xs"
              variant="light"
              color="orange"
              leftSection={<IconArrowBackUp size={14} />}
              disabled={!latestRelease || busy}
              onClick={handleRollback}
            >
              Rollback
            </Button>
            <Button
              size="xs"
              color="indigo"
              leftSection={<IconRocket size={14} />}
              disabled={busy}
              onClick={handlePublish}
            >
              Version freigeben
            </Button>
          </Group>
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};
