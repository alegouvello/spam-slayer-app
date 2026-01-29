import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Save, RefreshCw } from 'lucide-react';
import { ScheduledCleanup } from '@/types/email';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const ScheduleSettings = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduledCleanup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [autoApprove, setAutoApprove] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (user) {
      loadSchedule();
    }
  }, [user]);

  const loadSchedule = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_cleanup')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSchedule({
          id: data.id,
          frequency: data.frequency as 'daily' | 'weekly' | 'monthly',
          autoApprove: data.auto_approve || false,
          isActive: data.is_active || false,
          lastRunAt: data.last_run_at || undefined,
          nextRunAt: data.next_run_at || undefined,
        });
        setFrequency(data.frequency as 'daily' | 'weekly' | 'monthly');
        setAutoApprove(data.auto_approve || false);
        setIsActive(data.is_active || false);
      }
    } catch (error) {
      console.error('Load schedule error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateNextRun = (freq: string): string => {
    const now = new Date();
    switch (freq) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
    }
    return now.toISOString();
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const scheduleData = {
        user_id: user.id,
        frequency,
        auto_approve: autoApprove,
        is_active: isActive,
        next_run_at: isActive ? calculateNextRun(frequency) : null,
      };

      if (schedule) {
        const { error } = await supabase
          .from('scheduled_cleanup')
          .update(scheduleData)
          .eq('id', schedule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('scheduled_cleanup')
          .insert(scheduleData);

        if (error) throw error;
      }

      toast.success('Schedule saved successfully!');
      loadSchedule();
    } catch (error) {
      console.error('Save schedule error:', error);
      toast.error('Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Scheduled Cleanup
        </CardTitle>
        <CardDescription>
          Set up automatic spam folder cleanup on a schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="active">Enable Scheduled Cleanup</Label>
            <p className="text-sm text-muted-foreground">
              Automatically scan and process spam emails
            </p>
          </div>
          <Switch 
            id="active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequency">Cleanup Frequency</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-approve">Auto-Approve Actions</Label>
            <p className="text-sm text-muted-foreground">
              Automatically unsubscribe without requiring approval
            </p>
          </div>
          <Switch 
            id="auto-approve"
            checked={autoApprove}
            onCheckedChange={setAutoApprove}
          />
        </div>

        {schedule?.lastRunAt && (
          <div className="text-sm text-muted-foreground">
            Last run: {new Date(schedule.lastRunAt).toLocaleString()}
          </div>
        )}

        {schedule?.nextRunAt && isActive && (
          <div className="text-sm text-muted-foreground">
            Next run: {new Date(schedule.nextRunAt).toLocaleString()}
          </div>
        )}

        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};
