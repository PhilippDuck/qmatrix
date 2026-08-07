import React from 'react';
import { Menu } from '@mantine/core';
import { IconUserPlus, IconPlus } from '@tabler/icons-react';
import { useCatalogAuthoring } from '../../hooks/useCatalogAuthoring';

interface CreateMenuProps {
    opened: boolean;
    onClose: () => void;
    x: number;
    y: number;
    onSelect: (type: 'employee' | 'skill') => void;
}

export const CreateContextMenu: React.FC<CreateMenuProps> = ({ opened, onClose, x, y, onSelect }) => {
    const catalogAuthoring = useCatalogAuthoring();

    return (
        <Menu opened={opened} onClose={onClose} position="bottom-start" offset={5}>
            <Menu.Dropdown style={{ position: 'fixed', top: y, left: x, zIndex: 9999 }}>
                <Menu.Label>Erstellen...</Menu.Label>
                <Menu.Item
                    leftSection={<IconUserPlus size={14} />}
                    onClick={() => onSelect('employee')}
                >
                    Neuer Mitarbeiter
                </Menu.Item>
                {catalogAuthoring && (
                    <Menu.Item
                        leftSection={<IconPlus size={14} />}
                        onClick={() => onSelect('skill')}
                    >
                        Neuer Skill
                    </Menu.Item>
                )}
            </Menu.Dropdown>
        </Menu>
    );
};
