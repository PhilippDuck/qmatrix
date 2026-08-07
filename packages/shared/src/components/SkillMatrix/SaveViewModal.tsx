import React, { useState } from 'react';
import { Modal, TextInput, Button, Group } from '@mantine/core';

interface SaveViewModalProps {
    opened: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
}

export const SaveViewModal: React.FC<SaveViewModalProps> = ({ opened, onClose, onSave }) => {
    const [name, setName] = useState("");

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
            setName("");
            onClose();
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Ansicht speichern" centered>
            <TextInput
                label="Name der Ansicht"
                placeholder="z.B. Management Übersicht"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                data-autofocus
                mb="md"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                }}
            />
            <Group justify="flex-end">
                <Button variant="default" onClick={onClose}>Abbrechen</Button>
                <Button onClick={handleSave}>Speichern</Button>
            </Group>
        </Modal>
    );
};
