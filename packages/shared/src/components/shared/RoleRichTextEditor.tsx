import React from "react";
import { RichTextEditor, Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Text } from "@mantine/core";

interface RoleRichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
}

export const RoleRichTextEditorField: React.FC<RoleRichTextEditorProps> = ({
    value,
    onChange,
    label = "Beschreibung",
    placeholder = "Zusätzliche Informationen zur Rolle",
}) => {
    const editor = useEditor({
        extensions: [StarterKit, Link],
        content: value,
        onUpdate({ editor }) {
            const html = editor.getHTML();
            // Leerer Editor gibt "<p></p>" zurück → als leer behandeln
            onChange(html === "<p></p>" ? "" : html);
        },
    });

    // Wenn sich der Wert von außen ändert (z.B. beim Öffnen einer anderen Rolle),
    // Editor-Inhalt synchronisieren ohne Cursor zu resetten
    React.useEffect(() => {
        if (!editor) return;
        const current = editor.getHTML();
        const normalized = current === "<p></p>" ? "" : current;
        if (normalized !== value) {
            editor.commands.setContent(value || "");
        }
    }, [value, editor]);

    return (
        <div>
            {label && (
                <Text size="sm" fw={500} mb={4}>
                    {label}
                </Text>
            )}
            <RichTextEditor editor={editor}>
                <RichTextEditor.Toolbar sticky stickyOffset={0}>
                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Bold />
                        <RichTextEditor.Italic />
                        <RichTextEditor.Underline />
                        <RichTextEditor.Strikethrough />
                        <RichTextEditor.ClearFormatting />
                    </RichTextEditor.ControlsGroup>
                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.BulletList />
                        <RichTextEditor.OrderedList />
                    </RichTextEditor.ControlsGroup>
                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Link />
                        <RichTextEditor.Unlink />
                    </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>
                <RichTextEditor.Content
                    style={{ minHeight: 100 }}
                    placeholder={placeholder}
                />
            </RichTextEditor>
        </div>
    );
};
