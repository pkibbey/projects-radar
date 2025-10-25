"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type EditableTextProps = {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
  placeholder?: string;
};

export const EditableText = ({
  value,
  onSave,
  className,
  placeholder = "Enter text...",
}: EditableTextProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      // Focus the text area
      textareaRef.current.focus();

      // Auto-resize textarea to fit content
      adjustTextareaHeight();

      // Select all text to indicate that the selection has occurred
      textareaRef.current.select();
    }
  }, [isEditing]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLParagraphElement>) => {
    e.preventDefault();
    setIsEditing(true);
  };

  const handleBlur = async () => {
    if (!isSaving && editValue !== value) {
      await saveChanges();
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveChanges();
    }
  };

  const saveChanges = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      // Optionally show error message to user
      setEditValue(value); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        id="editable-text"
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          adjustTextareaHeight();
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full resize-none border-none bg-transparent p-0 outline-none block",
          className,
          isSaving && "opacity-50"
        )}
        placeholder={placeholder}
        disabled={isSaving}
      />
    );
  }

  return (
    <p
      ref={paragraphRef}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "cursor-text transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
        className
      )}
      title="Double-click to edit"
    >
      {value || placeholder}
    </p>
  );
};
