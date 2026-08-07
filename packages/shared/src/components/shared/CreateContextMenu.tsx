import React from 'react';
import { Menu, ActionIcon, Text, Group, rem } from '@mantine/core';
import { IconUserPlus, IconFolderPlus, IconPlus, IconComponents } from '@tabler/icons-react';

interface CreateMenuProps {
    opened: boolean;
    onClose: () => void;
    x: number;
    y: number;
    onSelect: (type: 'employee' | 'skill') => void;
}

export const CreateContextMenu: React.FC<CreateMenuProps> = ({ opened, onClose, x, y, onSelect }) => {
    return (
        <Menu opened={opened} onClose={onClose} position="bottom-start" offset={5}>
            {/* We control the position via a dummy target or custom logic if needed, 
                but Mantine Menu usually wraps a target. 
                For specific coordinate positioning, we might need a custom approach or 
                just use a centered Modal. The User asked for a "Context Menu". 
                
                Simulating a context menu at (x,y) is tricky in pure React without a wrapper.
                
                Better approach: A centered "Spotlight-like" Menu or a Modal.
                But the user said "Context Menu".
                
                Let's stick to a <Menu> attached to a hidden element at coordinates?
                Or simpler: Just use a generic modal with 3 buttons?
                
                Actually, the user said "Kontextmenü".
                Let's try a Menu that is effectively a modal but looks like a menu.
            */}
            <Menu.Dropdown style={{ position: 'fixed', top: y, left: x, zIndex: 9999 }}>
                <Menu.Label>Erstellen...</Menu.Label>
                <Menu.Item
                    leftSection={<IconUserPlus size={14} />}
                    onClick={() => onSelect('employee')}
                >
                    Neuer Mitarbeiter
                </Menu.Item>
                <Menu.Item
                    leftSection={<IconPlus size={14} />}
                    onClick={() => onSelect('skill')}
                >
                    Neuer Skill
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
};
