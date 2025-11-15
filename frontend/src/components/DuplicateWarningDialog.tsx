import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface DuplicateRequest {
  id: number;
  payroll_date: string;
  hours: number;
  minutes: number;
  approved_by: string | null;
  rejected_by: string | null;
  reason: string;
}

interface DuplicateData {
  hasDuplicate: boolean;
  duplicates: DuplicateRequest[];
}

interface DuplicateWarningDialogProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  duplicateData: DuplicateData | null;
}

export default function DuplicateWarningDialog({
  open,
  onClose,
  onContinue,
  duplicateData
}: DuplicateWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <DialogTitle>Duplicate Request Detected</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            You already have a request for this date:
          </DialogDescription>
        </DialogHeader>

        {duplicateData && duplicateData.duplicates && duplicateData.duplicates.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
            {duplicateData.duplicates.map((dup, index) => (
              <div key={index} className="text-sm">
                <p><strong>Date:</strong> {new Date(dup.payroll_date).toLocaleDateString()}</p>
                <p><strong>Hours:</strong> {dup.hours}.{dup.minutes || 0}</p>
                <p><strong>Status:</strong> <span className={
                  dup.approved_by === null ? 'text-yellow-700 font-semibold' :
                  dup.approved_by ? 'text-green-700 font-semibold' :
                  'text-red-700 font-semibold'
                }>
                  {dup.approved_by === null ? 'Pending' : dup.approved_by ? 'Approved' : 'Rejected'}
                </span></p>
                {dup.reason && <p><strong>Reason:</strong> {dup.reason}</p>}
              </div>
            ))}
          </div>
        )}

        <DialogDescription className="pt-2">
          Are you sure you want to submit another request for the same date?
        </DialogDescription>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Go Back & Edit
          </Button>
          <Button onClick={onContinue} variant="default">
            Submit Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
