import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, Calendar, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  requestData: any;
  duplicateData?: any;
}

export default function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  requestData,
  duplicateData,
}: ConfirmationModalProps) {
  const formattedDate = requestData.dateAffected
    ? format(new Date(requestData.dateAffected), 'MMMM dd, yyyy')
    : '';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Confirm Your Request
          </DialogTitle>
          <DialogDescription>
            Please review your request details before submitting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {duplicateData && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-destructive mb-1">Duplicate Request Found</p>
                <p className="text-sm text-destructive/90">
                  You already have a similar request for this date. Submitting this will create another
                  request.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Request Type</p>
                <p className="text-base font-semibold text-foreground">{requestData.requestType}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date Affected</p>
                <p className="text-base font-semibold text-foreground">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p className="text-base font-semibold text-foreground">
                  {requestData.numberOfHours} hour{requestData.numberOfHours > 1 ? 's' : ''}{' '}
                  {requestData.minutes > 0 && `${requestData.minutes} minutes`}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground mb-1">Reason</p>
              <p className="text-sm text-foreground">{requestData.reason}</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground mb-1">Project/Task</p>
              <p className="text-sm text-foreground">{requestData.projectTaskAssociated}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="transition-all duration-200">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="transition-all duration-200">
            Confirm & Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
