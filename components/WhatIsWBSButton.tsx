import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function WhatIsWBSButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">What is WBS?</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>What is a Work Breakdown Structure?</DialogTitle>
          <DialogDescription>
            <div className="text-base text-gray-700 mt-2">
              <strong>Work Breakdown Structure (WBS)</strong> is a core project management tool that organizes all project work into a clear, hierarchical structure. Each level of a WBS divides the project into smaller, more manageable components—making complex projects easier to plan, assign, and track.
              <br /><br />
              A well-structured WBS:
              <ul className="list-disc list-inside mt-2">
                <li>Defines the complete scope and deliverables</li>
                <li>Breaks work into tasks and subtasks for clarity</li>
                <li>Enables effective scheduling, budgeting, and progress monitoring</li>
                <li>Clarifies team responsibilities and reduces overlap</li>
              </ul>
              <br />
              In short, a WBS ensures that all project work is accounted for, helping teams deliver projects efficiently and with greater transparency.
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
