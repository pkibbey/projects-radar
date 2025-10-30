"use client";

import { useState } from "react";
import type { ProjectLearning } from "@/types/learning";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LearningInsightsForm } from "@/components/learning-insights-form";

type AddLearningButtonProps = {
  owner: string;
  repo: string;
  initialData?: ProjectLearning | null;
  onSave?: (data: ProjectLearning) => void;
  onDelete?: () => void;
};

export const AddLearningButton = ({
  owner,
  repo,
  initialData,
  onSave,
  onDelete,
}: AddLearningButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (data: ProjectLearning) => {
    setIsLoading(true);
    try {
      onSave?.(data);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    setIsOpen(false);
    onDelete?.();
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        {initialData ? "Edit Learning" : "Add Learning Insights"}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {initialData ? "Edit Learning Insights" : "Add Learning Insights"}
            </DialogTitle>
            <DialogDescription>
              {owner}/{repo}
            </DialogDescription>
          </DialogHeader>

          <LearningInsightsForm
            owner={owner}
            repo={repo}
            initialData={initialData}
            onSave={handleSave}
            onCancel={() => setIsOpen(false)}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
