"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ManagerForm } from "./manager-form";

export function EditManagerDialog({ manager }: { manager: { id: string; name: string; email: string } }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Edit ${manager.name}`}>
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit manager</DialogTitle>
          <DialogDescription>Schedules that include this manager will use the new address.</DialogDescription>
        </DialogHeader>
        <ManagerForm manager={manager} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
