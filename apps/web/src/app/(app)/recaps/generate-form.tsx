"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { languageOptions, repoTypeOptions } from "@/lib/recap-options";
import { OrgRepoPicker } from "../org-repo-picker";
import { generateRecapAction } from "./actions";

const NONE: string[] = [];

export function GenerateForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(generateRecapAction, null);
  const handled = useRef(state);
  const [withOrgs, setWithOrgs] = useState(false);

  useEffect(() => {
    if (!state?.ok || handled.current === state) return;
    handled.current = state;
    if (state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="day">Day</Label>
          <Input id="day" name="day" type="date" defaultValue={today} max={today} required />
          <p className="text-muted-foreground text-xs">Commits are collected for this UTC day.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="language">Language</Label>
          <Select name="language" defaultValue="en">
            <SelectTrigger id="language" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map(({ code, label }) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">The language of the recap content.</p>
        </div>
      </div>
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">Repositories</legend>
        {repoTypeOptions.map(({ value, label }) => (
          <div key={value} className="flex items-center gap-2">
            <Checkbox
              id={`repo-${value}`}
              name="repoTypes"
              value={value}
              defaultChecked={value === "USER"}
              onCheckedChange={(checked) => value === "ORG" && setWithOrgs(checked === true)}
            />
            <Label htmlFor={`repo-${value}`} className="font-normal">
              {label}
            </Label>
          </div>
        ))}
        {withOrgs ? <OrgRepoPicker defaultOrgs={NONE} defaultOrgRepos={NONE} /> : null}
      </fieldset>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Generate recap
        </Button>
        {state && !state.ok ? <p className="text-destructive text-sm">{state.error}</p> : null}
      </div>
    </form>
  );
}
