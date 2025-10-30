"use client";

import { useState } from "react";
import type { ProjectLearning, StatusReason } from "@/types/learning";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldContent, FieldError } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LearningInsightsFormProps = {
  owner: string;
  repo: string;
  initialData?: ProjectLearning | null;
  onSave: (data: ProjectLearning) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
};

const STATUS_REASONS: { value: StatusReason; label: string }[] = [
  { value: "learning-complete", label: "Learning Complete" },
  { value: "deprioritized", label: "Deprioritized" },
  { value: "overcomplicated", label: "Too Complex" },
  { value: "shifted-focus", label: "Shifted Focus" },
  { value: "on-hold", label: "On Hold" },
];

export const LearningInsightsForm = ({
  owner,
  repo,
  initialData,
  onSave,
  onCancel,
  onDelete,
  isLoading = false,
}: LearningInsightsFormProps) => {
  const [formData, setFormData] = useState({
    problem: initialData?.problem ?? "",
    architecture: initialData?.architecture ?? "",
    keyLearnings: initialData?.keyLearnings ?? [""],
    lessonsForImprovement: initialData?.lessonsForImprovement ?? [""],
    skillsUsed: initialData?.skillsUsed ?? [""],
    timeInvested: initialData?.timeInvested ?? "",
    statusReason: initialData?.statusReason ?? ("" as StatusReason | ""),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTextChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleArrayChange = (
    field: "keyLearnings" | "lessonsForImprovement" | "skillsUsed",
    index: number,
    value: string
  ) => {
    setFormData((prev) => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const handleArrayAdd = (
    field: "keyLearnings" | "lessonsForImprovement" | "skillsUsed"
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const handleArrayRemove = (
    field: "keyLearnings" | "lessonsForImprovement" | "skillsUsed",
    index: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Check if at least some data has been entered
    const hasAnyData =
      formData.problem?.trim() ||
      formData.architecture?.trim() ||
      formData.timeInvested?.trim() ||
      formData.statusReason ||
      formData.skillsUsed.some((s) => s.trim()) ||
      formData.keyLearnings.some((l) => l.trim()) ||
      formData.lessonsForImprovement.some((l) => l.trim());

    if (!hasAnyData) {
      newErrors.form =
        "Please add at least some learning data before saving (e.g., problem, skills, or learnings).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const response = await fetch(
        `/api/repos/${owner}/${repo}/learnings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem: formData.problem || null,
            architecture: formData.architecture || null,
            keyLearnings: formData.keyLearnings.filter((l) => l.trim()),
            lessonsForImprovement: formData.lessonsForImprovement.filter(
              (l) => l.trim()
            ),
            skillsUsed: formData.skillsUsed.filter((s) => s.trim()),
            timeInvested: formData.timeInvested || null,
            statusReason: formData.statusReason || null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save learning data");
      }

      const saved = await response.json();
      onSave(saved);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : "Failed to save",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this learning entry?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/repos/${owner}/${repo}/learnings`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete learning data");
      }

      onDelete?.();
    } catch (error) {
      setErrors({
        delete: error instanceof Error ? error.message : "Failed to delete",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Form Error */}
      {errors.form && (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      )}

      {/* Problem Statement */}
      <Field data-invalid={!!errors.problem}>
        <FieldContent>
          <Label htmlFor="problem">
            Problem Statement
          </Label>
          <Textarea
            id="problem"
            value={formData.problem}
            onChange={(e) => handleTextChange("problem", e.target.value)}
            placeholder="What problem were you solving? Why did this project matter to you?"
            rows={4}
            disabled={isLoading}
          />
          {errors.problem && <FieldError>{errors.problem}</FieldError>}
        </FieldContent>
      </Field>

      {/* Architecture */}
      <Field data-invalid={!!errors.architecture}>
        <FieldContent>
          <Label htmlFor="architecture">
            Architecture & Design
          </Label>
          <Textarea
            id="architecture"
            value={formData.architecture}
            onChange={(e) => handleTextChange("architecture", e.target.value)}
            placeholder="How did you structure the project? What tech decisions did you make and why?"
            rows={4}
            disabled={isLoading}
          />
          {errors.architecture && (
            <FieldError>{errors.architecture}</FieldError>
          )}
        </FieldContent>
      </Field>

      {/* Skills Used */}
      <Field data-invalid={!!errors.skillsUsed}>
        <FieldContent>
          <Label>
            Skills & Technologies
          </Label>
          <div className="space-y-2">
            {formData.skillsUsed.map((skill, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="text"
                  value={skill}
                  onChange={(e) =>
                    handleArrayChange("skillsUsed", index, e.target.value)
                  }
                  placeholder={`Skill ${index + 1} (e.g., React, TypeScript)`}
                  disabled={isLoading}
                />
                {formData.skillsUsed.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => handleArrayRemove("skillsUsed", index)}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              onClick={() => handleArrayAdd("skillsUsed")}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              + Add Skill
            </Button>
          </div>
          {errors.skillsUsed && <FieldError>{errors.skillsUsed}</FieldError>}
        </FieldContent>
      </Field>

      {/* Key Learnings */}
      <Field data-invalid={!!errors.keyLearnings}>
        <FieldContent>
          <Label>
            Key Learnings
          </Label>
          <div className="space-y-2">
            {formData.keyLearnings.map((learning, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="text"
                  value={learning}
                  onChange={(e) =>
                    handleArrayChange("keyLearnings", index, e.target.value)
                  }
                  placeholder={`Learning ${index + 1}`}
                  disabled={isLoading}
                />
                {formData.keyLearnings.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => handleArrayRemove("keyLearnings", index)}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              onClick={() => handleArrayAdd("keyLearnings")}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              + Add Learning
            </Button>
          </div>
          {errors.keyLearnings && <FieldError>{errors.keyLearnings}</FieldError>}
        </FieldContent>
      </Field>

      {/* Lessons for Improvement */}
      <Field>
        <FieldContent>
          <Label>Lessons for Improvement</Label>
          <div className="space-y-2">
            {formData.lessonsForImprovement.map((lesson, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="text"
                  value={lesson}
                  onChange={(e) =>
                    handleArrayChange("lessonsForImprovement", index, e.target.value)
                  }
                  placeholder={`Lesson ${index + 1}`}
                  disabled={isLoading}
                />
                {formData.lessonsForImprovement.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => handleArrayRemove("lessonsForImprovement", index)}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              onClick={() => handleArrayAdd("lessonsForImprovement")}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              + Add Lesson
            </Button>
          </div>
        </FieldContent>
      </Field>

      {/* Time Invested */}
      <Field>
        <FieldContent>
          <Label htmlFor="timeInvested">Time Invested</Label>
          <Input
            id="timeInvested"
            type="text"
            value={formData.timeInvested}
            onChange={(e) => handleTextChange("timeInvested", e.target.value)}
            placeholder="e.g., 3 weeks, 40 hours, 2 months"
            disabled={isLoading}
          />
        </FieldContent>
      </Field>

      {/* Status Reason */}
      <Field>
        <FieldContent>
          <Label htmlFor="statusReason">Project Status</Label>
          <Select
            value={formData.statusReason}
            onValueChange={(value) =>
              handleTextChange("statusReason", value as StatusReason)
            }
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a status..." />
            </SelectTrigger>
            <SelectContent>
              {STATUS_REASONS.map((reason) => (
                <SelectItem key={reason.value} value={reason.value}>
                  {reason.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>

      {/* Error Messages */}
      {errors.submit && (
        <Alert variant="destructive">
          <AlertDescription>{errors.submit}</AlertDescription>
        </Alert>
      )}
      {errors.delete && (
        <Alert variant="destructive">
          <AlertDescription>{errors.delete}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-3 border-t pt-6">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : "Save Insights"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        {initialData && onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
};
