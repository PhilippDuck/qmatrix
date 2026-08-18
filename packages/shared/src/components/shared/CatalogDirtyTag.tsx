import React, { useState } from "react";
import {
  ActionIcon,
  Badge,
  Group,
  Popover,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconNotes, IconPlus, IconTrash } from "@tabler/icons-react";
import type { CatalogEntityKind } from "../../types/catalog";
import {
  useCatalogDirtyStatus,
  type CatalogDirtyStatus,
} from "../../hooks/useCatalogDirty";
import { useCatalogVersioning } from "../../hooks/useCatalogAuthoring";
import { useStore, useShallow } from "../../store/hooks";
import { notesForEntity } from "../../utils/catalogChangeNotes";

const META: Record<
  CatalogDirtyStatus,
  { label: string; color: string; hint: string }
> = {
  added: {
    label: "Neu",
    color: "green",
    hint: "Noch nicht in einer freigegebenen Version",
  },
  changed: {
    label: "Geändert",
    color: "blue",
    hint: "Geändert seit der letzten freigegebenen Version",
  },
};

export const CatalogDirtyTag: React.FC<{
  kind: CatalogEntityKind;
  id?: string;
  label?: string;
}> = ({ kind, id, label }) => {
  const versioning = useCatalogVersioning();
  const status = useCatalogDirtyStatus(kind, id);
  const {
    pendingCatalogNotes,
    addCatalogChangeNote,
    deleteCatalogChangeNote,
    categories,
    subcategories,
    skills,
    roles,
  } = useStore(
    useShallow((s) => ({
      pendingCatalogNotes: s.pendingCatalogNotes,
      addCatalogChangeNote: s.addCatalogChangeNote,
      deleteCatalogChangeNote: s.deleteCatalogChangeNote,
      categories: s.categories,
      subcategories: s.subcategories,
      skills: s.skills,
      roles: s.roles,
    }))
  );

  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState("");

  if (!versioning || !id) return null;

  const entityNotes = notesForEntity(pendingCatalogNotes || [], kind, id);
  if (!status && entityNotes.length === 0) return null;

  const resolvedLabel =
    label ||
    (kind === "categories"
      ? categories.find((c) => c.id === id)?.name
      : kind === "subcategories"
        ? subcategories.find((s) => s.id === id)?.name
        : kind === "skills"
          ? skills.find((s) => s.id === id)?.name
          : roles.find((r) => r.id === id)?.name) ||
    id;

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    void addCatalogChangeNote(kind, id, resolvedLabel, text);
    setDraft("");
  };

  const meta = status ? META[status] : null;

  return (
    <Group
      gap={4}
      wrap="nowrap"
      style={{ flexShrink: 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      {meta && (
        <Tooltip label={meta.hint} withArrow>
          <Badge size="xs" variant="light" color={meta.color}>
            {meta.label}
          </Badge>
        </Tooltip>
      )}
      <Popover
        opened={opened}
        onChange={setOpened}
        position="bottom-start"
        shadow="md"
        width={280}
        withinPortal
      >
        <Popover.Target>
          <Tooltip
            label={
              entityNotes.length > 0
                ? `${entityNotes.length} Notiz(en) für das Release`
                : "Kurze Notiz für den Releasetext"
            }
            withArrow
          >
            <ActionIcon
              size="xs"
              variant={entityNotes.length > 0 ? "light" : "subtle"}
              color={entityNotes.length > 0 ? "teal" : "gray"}
              aria-label="Änderungsnotiz"
              onClick={(e) => {
                e.stopPropagation();
                setOpened((o) => !o);
              }}
            >
              <IconNotes size={12} />
            </ActionIcon>
          </Tooltip>
        </Popover.Target>
        <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
          <Stack gap="xs">
            <Text size="xs" fw={600}>
              Notizen · {resolvedLabel}
            </Text>
            <Text size="xs" c="dimmed">
              Landen später im Releasetext.
            </Text>
            {entityNotes.length === 0 ? (
              <Text size="xs" c="dimmed">
                Noch keine Notizen.
              </Text>
            ) : (
              entityNotes.map((note) => (
                <Group key={note.id} gap={6} wrap="nowrap" align="flex-start">
                  <Text size="xs" style={{ flex: 1, minWidth: 0 }}>
                    {note.text}
                  </Text>
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    color="red"
                    aria-label="Notiz löschen"
                    onClick={() => void deleteCatalogChangeNote(note.id)}
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                </Group>
              ))
            )}
            <Group gap={6} wrap="nowrap">
              <TextInput
                size="xs"
                placeholder="Kurze Notiz…"
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNote();
                  }
                }}
                style={{ flex: 1 }}
              />
              <ActionIcon
                size="sm"
                variant="light"
                color="teal"
                disabled={!draft.trim()}
                onClick={addNote}
                aria-label="Notiz hinzufügen"
              >
                <IconPlus size={14} />
              </ActionIcon>
            </Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Group>
  );
};
