"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle, 
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { CalendarIcon, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const sessionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  subject: z.string().min(2, "Subject is required"),
  sessionType: z.enum(["specific", "available"]),
  scheduledDate: z.date().optional(),
  scheduledTime: z.string().optional(),
  duration: z.number().min(15, "Minimum 15 minutes").max(180, "Maximum 180 minutes"),
  price: z.number().min(5, "Minimum price is $5"),
  timezone: z.string(),
});

type SessionFormData = z.infer<typeof sessionSchema>;

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Programming",
  "Web Development",
  "Data Science",
  "English",
  "Business",
  "Marketing",
  "Design",
  "Other"
];

const DURATIONS = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute}`,
    label: `${displayHour}:${minute} ${ampm}`
  };
});

export function CreateSessionForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sessionType, setSessionType] = useState<"specific" | "available">("specific");
  const [selectedDate, setSelectedDate] = useState<Date>();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      sessionType: "specific",
      duration: 60,
      price: 50,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  });

  const watchedDuration = watch("duration");
  const watchedPrice = watch("price");

  const onSubmit = async (data: SessionFormData) => {
    try {
      setLoading(true);

      // Validate specific session has date and time
      if (data.sessionType === "specific" && (!data.scheduledDate || !data.scheduledTime)) {
        toast.error("Please select date and time for the session");
        return;
      }

      // Combine date and time for specific sessions
      let scheduledAt: Date | undefined;
      if (data.sessionType === "specific" && data.scheduledDate && data.scheduledTime) {
        const [hours, minutes] = data.scheduledTime.split(':').map(Number);
        scheduledAt = new Date(data.scheduledDate);
        scheduledAt.setHours(hours, minutes, 0, 0);
      }

      const response = await fetch('/api/teacher/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          subject: data.subject,
          scheduledAt: scheduledAt?.toISOString(),
          duration: data.duration,
          price: Math.round(data.price * 100), // Convert to cents
          timezone: data.timezone,
          isAvailableSlot: data.sessionType === "available"
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create session');
      }

      const result = await response.json();
      toast.success('Session created successfully!');
      router.push('/teacher/sessions');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="space-y-8 pb-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Page Header with Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-4">
            <Button
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()}
              className="-ml-2 h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Create Live Session</h1>
              <p className="text-muted-foreground">
                Schedule a new 1-on-1 tutoring session
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 min-w-[140px]"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Session
            </Button>
          </div>
        </div>

        <Tabs 
          defaultValue="specific" 
          value={sessionType} 
          onValueChange={(val) => {
            setSessionType(val as "specific" | "available");
            setValue("sessionType", val as "specific" | "available");
          }}
          className="w-full"
        >
          <div className="mb-8">
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px] h-10">
              <TabsTrigger value="specific">One-Time Session</TabsTrigger>
              <TabsTrigger value="available">Weekly Availability</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="specific" className="space-y-8">
            
            {/* Section 2: Basic Info (CARD) */}
            <Card className="border shadow-sm bg-white dark:bg-card">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="text-lg font-medium">Basic Information</CardTitle>
                <CardDescription>
                  Details that help students find your session
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Session Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Advanced React Patterns"
                      {...register("title")}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select onValueChange={(value) => setValue("subject", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.subject && (
                      <p className="text-sm text-destructive">{errors.subject.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Briefly describe what students will learn..."
                    rows={4}
                    className="resize-none"
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Schedule & Details (CARD) */}
            <Card className="border shadow-sm bg-white dark:bg-card">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  Schedule & Pricing
                </CardTitle>
                <CardDescription>
                  When do you want to host this session?
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Session Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setValue("scheduledDate", date);
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Start Time</Label>
                    <Select onValueChange={(value) => setValue("scheduledTime", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select start time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIME_SLOTS.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Select
                      defaultValue="60"
                      onValueChange={(value) => setValue("duration", Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map((duration) => (
                          <SelectItem key={duration.value} value={duration.value.toString()}>
                            {duration.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price (INR)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        id="price"
                        type="number"
                        min="100"
                        step="1"
                        className="pl-7"
                        placeholder="500"
                        {...register("price", { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}
                      onValueChange={(value) => setValue("timezone", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                        <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Earnings Preview */}
            <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">Estimated Earnings</h4>
                <p className="text-sm text-muted-foreground">
                  After 15% platform fee deduction
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                  ₹{((watchedPrice || 0) * 0.85).toFixed(0)}
                </span>
                <p className="text-sm text-muted-foreground">
                  Net Amount
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="available">
            <Card className="border-dashed border-2 shadow-none bg-transparent">
              <CardContent className="pt-12 pb-12 text-center space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full w-fit mx-auto">
                  <CalendarIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="font-semibold text-lg">Weekly Availability Schedule</h3>
                  <p className="text-muted-foreground text-sm">
                    Set up a recurring schedule to let students book you automatically during your available hours.
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/teacher/sessions/availability")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Configure Available Hours
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
