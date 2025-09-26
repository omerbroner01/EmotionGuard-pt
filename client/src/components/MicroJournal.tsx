import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface MicroJournalProps {
  onComplete: (trigger: string, plan: string, entry?: string) => void;
  onCancel: () => void;
}

const TRIGGERS = [
  'Recent loss',
  'FOMO (Fear of Missing Out)', 
  'Market volatility',
  'Time pressure',
  'Fatigue',
  'Other'
];

export function MicroJournal({ onComplete, onCancel }: MicroJournalProps) {
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [plan, setPlan] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const handleSubmit = () => {
    if (selectedTrigger && plan.trim()) {
      onComplete(selectedTrigger, plan, additionalNotes || undefined);
    }
  };

  const isValid = selectedTrigger && plan.trim().length >= 10;

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Quick Reflection</h3>
        <p className="text-sm text-muted-foreground">
          What triggered this feeling and what's your plan?
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="trigger" className="block text-sm font-medium mb-2">
            What triggered this?
          </Label>
          <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
            <SelectTrigger data-testid="select-trigger">
              <SelectValue placeholder="Select a trigger..." />
            </SelectTrigger>
            <SelectContent>
              {TRIGGERS.map((trigger) => (
                <SelectItem key={trigger} value={trigger}>
                  {trigger}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="plan" className="block text-sm font-medium mb-2">
            Your plan moving forward:
          </Label>
          <Textarea 
            id="plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="e.g., Reduce position size, wait for better setup, take a break..."
            className="resize-none"
            rows={3}
            data-testid="textarea-plan"
          />
        </div>
        
        <div>
          <Label htmlFor="notes" className="block text-sm font-medium mb-2">
            Additional notes (optional):
          </Label>
          <Textarea 
            id="notes"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Any other thoughts or observations..."
            className="resize-none"
            rows={2}
            data-testid="textarea-notes"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="secondary"
            onClick={onCancel}
            data-testid="button-cancel-journal"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValid}
            data-testid="button-save-journal"
          >
            Save & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
