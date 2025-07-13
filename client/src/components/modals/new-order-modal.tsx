// This component is deprecated - functionality moved to SendOut modal in sidebar.tsx
// Keep minimal structure for backward compatibility if needed elsewhere

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewOrderModal({ open, onOpenChange }: NewOrderModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Order creation has been moved to the "Send Out" button in the sidebar for better workflow.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              OK
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}