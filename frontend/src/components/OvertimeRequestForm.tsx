import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Loader2, CheckCircle2, AlertCircle, Clock, Calendar as CalendarIcon, FileText, Briefcase } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '../lib/utils';
import ConfirmationModal from './ConfirmationModal';
import useRequestStore from '../store/useRequestStore';

// Validation schema
const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  requestType: z.enum(['Overtime', 'Undertime'], {
    required_error: 'Please select a request type',
  }),
  dateAffected: z.date({
    required_error: 'Date is required',
  }),
  numberOfHours: z.coerce
    .number()
    .min(1, 'At least 1 hour required')
    .max(8, 'Maximum 8 hours allowed'),
  minutes: z.coerce.number().refine((val) => [0, 15, 30, 45].includes(val), {
    message: 'Minutes must be 0, 15, 30, or 45',
  }),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must not exceed 500 characters'),
  projectTaskAssociated: z
    .string()
    .min(3, 'Project/Task must be at least 3 characters')
    .max(200, 'Project/Task must not exceed 200 characters'),
});

type FormData = z.infer<typeof formSchema>;

export default function OvertimeRequestForm() {
  const { submitRequest, checkDuplicate, isLoading, error, successMessage, clearMessages } = useRequestStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);
  const [duplicateData, setDuplicateData] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requestType: 'Overtime' as const,
      numberOfHours: 1,
      minutes: 0,
    },
  });

  const email = watch('email');
  const dateAffected = watch('dateAffected');

  const onSubmit = async (data: FormData) => {
    try {
      clearMessages();
      setPendingData(data);
      setDuplicateData(null);
      setShowConfirmation(true);
    } catch (err) {
      console.error('Form preparation error:', err);
    }
  };

  const handleConfirm = async () => {
    try {
      setShowConfirmation(false);

      if (!pendingData) return;

      // Convert Date to string format for API
      const requestData = {
        ...pendingData,
        dateAffected: format(pendingData.dateAffected, 'yyyy-MM-dd'),
      };

      await submitRequest(requestData);
      setShowSuccess(true);
      reset();
      setPendingData(null);
      setDuplicateData(null);

      setTimeout(() => {
        setShowSuccess(false);
        clearMessages();
      }, 5000);
    } catch (err) {
      console.error('Form submission error:', err);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setPendingData(null);
    setDuplicateData(null);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg border-border/50 backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-xl">
      <CardHeader className="space-y-3 pb-6 border-b border-border/50">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3 ring-2 ring-primary/20">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold text-foreground mb-2">
              Overtime / Undertime Request
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Submit your request below. All submissions are subject to manager approval.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Success Message */}
        {showSuccess && successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-success/10 border-2 border-success/30 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-success mb-1">Success!</p>
              <p className="text-sm text-success/90">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-destructive mb-1">Error</p>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email */}
          <div className="space-y-2 group">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>Email Address</span>
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@rooche.digital"
              {...register('email')}
              className={`transition-all duration-200 ${
                errors.email 
                  ? 'border-destructive focus-visible:ring-destructive' 
                  : 'focus-visible:ring-primary group-hover:border-primary/50'
              }`}
            />
            {errors.email && (
              <p className="text-sm text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-3 w-3" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Type of Request */}
          <div className="space-y-2 group">
            <Label htmlFor="requestType" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Type of Request</span>
              <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="requestType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className={`transition-all duration-200 ${
                    errors.requestType 
                      ? 'border-destructive focus:ring-destructive' 
                      : 'focus:ring-primary group-hover:border-primary/50'
                  }`}>
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Overtime">Overtime</SelectItem>
                    <SelectItem value="Undertime">Undertime</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.requestType && (
              <p className="text-sm text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-3 w-3" />
                {errors.requestType.message}
              </p>
            )}
          </div>

          {/* Date Affected */}
          <div className="space-y-2 group">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>Date Affected</span>
              <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="dateAffected"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal transition-all duration-200",
                        !field.value && "text-muted-foreground",
                        errors.dateAffected
                          ? 'border-destructive focus-visible:ring-destructive'
                          : 'focus-visible:ring-primary group-hover:border-primary/50'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.dateAffected && (
              <p className="text-sm text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-3 w-3" />
                {errors.dateAffected.message}
              </p>
            )}
          </div>

          {/* Number of Hours and Minutes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 group">
              <Label htmlFor="numberOfHours" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>Hours</span>
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="numberOfHours"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                    <SelectTrigger className={`transition-all duration-200 ${
                      errors.numberOfHours 
                        ? 'border-destructive focus:ring-destructive' 
                        : 'focus:ring-primary group-hover:border-primary/50'
                    }`}>
                      <SelectValue placeholder="Select hours" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((hour) => (
                        <SelectItem key={hour} value={String(hour)}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.numberOfHours && (
                <p className="text-sm text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="h-3 w-3" />
                  {errors.numberOfHours.message}
                </p>
              )}
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="minutes" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>Minutes</span>
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="minutes"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                    <SelectTrigger className={`transition-all duration-200 ${
                      errors.minutes 
                        ? 'border-destructive focus:ring-destructive' 
                        : 'focus:ring-primary group-hover:border-primary/50'
                    }`}>
                      <SelectValue placeholder="Select minutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="45">45</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.minutes && (
                <p className="text-sm text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="h-3 w-3" />
                  {errors.minutes.message}
                </p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2 group">
            <Label htmlFor="reason" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>Reason for Request</span>
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide a detailed reason for your overtime/undertime request..."
              rows={4}
              {...register('reason')}
              className={`transition-all duration-200 resize-none ${
                errors.reason 
                  ? 'border-destructive focus-visible:ring-destructive' 
                  : 'focus-visible:ring-primary group-hover:border-primary/50'
              }`}
            />
            {errors.reason && (
              <p className="text-sm text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-3 w-3" />
                {errors.reason.message}
              </p>
            )}
          </div>

          {/* Project/Task Associated */}
          <div className="space-y-2 group">
            <Label htmlFor="projectTaskAssociated" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span>Project/Task Associated</span>
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="projectTaskAssociated"
              type="text"
              placeholder="e.g., project-alpha-dev"
              {...register('projectTaskAssociated')}
              className={`transition-all duration-200 ${
                errors.projectTaskAssociated 
                  ? 'border-destructive focus-visible:ring-destructive' 
                  : 'focus-visible:ring-primary group-hover:border-primary/50'
              }`}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Please input the <span className="font-semibold">exact Discord channel name</span> affected by your OT/UT
            </p>
            {errors.projectTaskAssociated && (
              <p className="text-sm text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-3 w-3" />
                {errors.projectTaskAssociated.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting Request...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </form>
      </CardContent>

      {/* Confirmation Modal */}
      {showConfirmation && pendingData && (
        <ConfirmationModal
          open={showConfirmation}
          onClose={handleCancel}
          onConfirm={handleConfirm}
          requestData={pendingData}
          duplicateData={duplicateData}
        />
      )}
    </Card>
  );
}
