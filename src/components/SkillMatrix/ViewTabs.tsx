import React, { useState } from 'react';
import { Group, Button, Menu, ActionIcon, TextInput } from '@mantine/core';
import { IconDeviceFloppy, IconSettings, IconTrash, IconEdit, IconCheck, IconX, IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { SavedView } from '../../services/indexeddb';

interface ViewTabsProps {
    savedViews: SavedView[];
    activeViewId: string | null;
    isViewDirty: boolean;
    onSelectView: (view: SavedView) => void;
    onDeleteView: (id: string) => void;
    onUpdateViewName: (id: string, name: string) => void;
    onSaveCurrentView: () => void;
    onClearView: () => void;
    onCreateNewView: () => void;
    onReorderViews: (viewIds: string[]) => void;
}

export const ViewTabs: React.FC<ViewTabsProps> = ({
    savedViews,
    activeViewId,
    isViewDirty,
    onSelectView,
    onDeleteView,
    onUpdateViewName,
    onSaveCurrentView,
    onClearView,
    onCreateNewView,
    onReorderViews,
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const startEditing = (view: SavedView) => {
        setEditingId(view.id!);
        setEditName(view.name);
    };

    const saveEdit = () => {
        if (editingId && editName.trim()) {
            onUpdateViewName(editingId, editName.trim());
            setEditingId(null);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
    };

    const moveView = (index: number, direction: 'left' | 'right') => {
        const newIds = savedViews.map(v => v.id!);
        if (direction === 'left' && index > 0) {
            [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
            onReorderViews(newIds);
        } else if (direction === 'right' && index < newIds.length - 1) {
            [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
            onReorderViews(newIds);
        }
    };

    return (
        <Group gap="xs" align="center" style={{ height: 34 }}>
            {/* Default / Reset View Button */}
            <Button
                variant={activeViewId === null ? "filled" : "default"}
                size="compact-sm"
                radius="xl"
                onClick={onClearView}
                color="gray"
            >
                Standard
            </Button>

            {savedViews.map((view, index) => {
                const isActive = activeViewId === view.id;
                const showDirty = isActive && isViewDirty;

                return (
                    <React.Fragment key={view.id}>
                        {editingId === view.id ? (
                            <Group gap={4}>
                                <TextInput
                                    size="xs"
                                    value={editName}
                                    onChange={(e) => setEditName(e.currentTarget.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit();
                                        if (e.key === 'Escape') cancelEdit();
                                    }}
                                    autoFocus
                                    style={{ width: 120 }}
                                />
                                <ActionIcon size="sm" color="green" variant="subtle" onClick={saveEdit}>
                                    <IconCheck size={14} />
                                </ActionIcon>
                                <ActionIcon size="sm" color="red" variant="subtle" onClick={cancelEdit}>
                                    <IconX size={14} />
                                </ActionIcon>
                            </Group>
                        ) : (
                            <Group gap={0}>
                                <Button
                                    variant={isActive ? "filled" : "outline"}
                                    color="blue"
                                    size="compact-sm"
                                    radius="xl"
                                    onClick={() => onSelectView(view)}
                                    style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                                >
                                    {view.name}{showDirty ? " *" : ""}
                                </Button>
                                <Menu shadow="md" width={180} withArrow position="bottom-end">
                                    <Menu.Target>
                                        <ActionIcon
                                            size="sm"
                                            radius="xl"
                                            variant={isActive ? "filled" : "outline"}
                                            color="blue"
                                            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginLeft: -1, height: 26 }}
                                        >
                                            <IconSettings size={12} />
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>Ansicht verwalten</Menu.Label>
                                        {showDirty && (
                                            <Menu.Item
                                                leftSection={<IconDeviceFloppy size={14} />}
                                                onClick={onSaveCurrentView}
                                                color="teal"
                                            >
                                                Änderungen speichern
                                            </Menu.Item>
                                        )}
                                        <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => startEditing(view)}>
                                            Umbenennen
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item leftSection={<IconArrowLeft size={14} />} onClick={() => moveView(index, 'left')} disabled={index === 0}>
                                            Nach links verschieben
                                        </Menu.Item>
                                        <Menu.Item leftSection={<IconArrowRight size={14} />} onClick={() => moveView(index, 'right')} disabled={index === savedViews.length - 1}>
                                            Nach rechts verschieben
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item
                                            leftSection={<IconTrash size={14} />}
                                            color="red"
                                            onClick={() => onDeleteView(view.id!)}
                                        >
                                            Löschen
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                        )}
                    </React.Fragment>
                );
            })}

            {/* New View Button */}
            <Button
                variant="light"
                color="teal"
                size="compact-sm"
                radius="xl"
                onClick={onCreateNewView}
                leftSection={<IconDeviceFloppy size={14} />}
            >
                Neue Ansicht +
            </Button>
        </Group>
    );
};
