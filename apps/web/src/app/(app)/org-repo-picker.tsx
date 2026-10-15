"use client";

import { reposOfOrg } from "@recap/core/repo-scope";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ListResult, listOrgReposAction, listOrgsAction } from "./github-actions";

/** `null` while loading. */
type Loadable = ListResult | null;

type OrgRepoPickerProps = {
  defaultOrgs: string[];
  defaultOrgRepos: string[];
};

const sameOrg = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Picks GitHub organizations and, per organization, either all its repositories or
 * some of them. Posts the choice as `orgs` and `orgRepos` fields.
 */
export function OrgRepoPicker({ defaultOrgs, defaultOrgRepos }: OrgRepoPickerProps) {
  const [available, setAvailable] = useState<Loadable>(null);
  const [chosenOrgs, setChosenOrgs] = useState(defaultOrgs);
  const [pickedRepos, setPickedRepos] = useState(defaultOrgRepos);
  // Organizations limited to picked repositories; the other chosen ones include all of theirs.
  const [initiallyLimited] = useState(() => defaultOrgs.filter((org) => reposOfOrg(defaultOrgRepos, org).length > 0));
  const [limitedOrgs, setLimitedOrgs] = useState(initiallyLimited);
  // Repositories per organization; absent until requested.
  const [repos, setRepos] = useState<Record<string, Loadable>>(() =>
    Object.fromEntries(initiallyLimited.map((org) => [org, null])),
  );
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchRepos = useCallback(
    (org: string) => listOrgReposAction(org).then((result) => setRepos((current) => ({ ...current, [org]: result }))),
    [],
  );

  useEffect(() => {
    let active = true;
    void listOrgsAction().then((result) => active && setAvailable(result));
    for (const org of initiallyLimited) void fetchRepos(org);
    return () => {
      active = false;
    };
  }, [fetchRepos, initiallyLimited]);

  const isChosen = (org: string) => chosenOrgs.some((chosen) => sameOrg(chosen, org));
  const isLimited = (org: string) => limitedOrgs.some((limited) => sameOrg(limited, org));

  const toggleOrg = (org: string, checked: boolean) => {
    setChosenOrgs((current) => (checked ? [...current, org] : current.filter((chosen) => !sameOrg(chosen, org))));
    if (!checked) setLimitedOrgs((current) => current.filter((limited) => !sameOrg(limited, org)));
  };

  const setLimited = (org: string, limited: boolean) => {
    setLimitedOrgs((current) => (limited ? [...current, org] : current.filter((other) => !sameOrg(other, org))));
    const state = repos[org];
    // Load on first use, and retry after an error.
    if (limited && (state === undefined || (state !== null && !state.ok))) {
      setRepos((current) => ({ ...current, [org]: null }));
      void fetchRepos(org);
    }
  };

  const toggleRepo = (fullName: string, checked: boolean) =>
    setPickedRepos((current) => (checked ? [...current, fullName] : current.filter((repo) => repo !== fullName)));

  // Organizations GitHub lists, plus chosen ones it no longer lists (so they can be removed).
  const listed = available?.ok ? available.items : [];
  const orgs = [...listed, ...chosenOrgs.filter((org) => !listed.some((other) => sameOrg(other, org)))];
  const postedRepos = pickedRepos.filter((repo) => limitedOrgs.some((org) => isChosen(org) && reposOfOrg([repo], org).length > 0));

  return (
    <div className="grid gap-3 rounded-md border p-3">
      {chosenOrgs.map((org) => (
        <input key={org} type="hidden" name="orgs" value={org} />
      ))}
      {postedRepos.map((repo) => (
        <input key={repo} type="hidden" name="orgRepos" value={repo} />
      ))}

      <p className="text-sm font-medium">Organizations</p>
      {available === null ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> Loading your organizations…
        </p>
      ) : null}
      {available?.ok === false ? <p className="text-destructive text-sm">{available.error}</p> : null}
      {available?.ok && orgs.length === 0 ? (
        <p className="text-muted-foreground text-sm">Your GitHub account is not a member of any organization.</p>
      ) : null}

      {orgs.map((org) => {
        const chosen = isChosen(org);
        const limited = chosen && isLimited(org);
        const state = repos[org];
        const filter = (filters[org] ?? "").toLowerCase();
        const orgPicked = reposOfOrg(pickedRepos, org);

        return (
          <div key={org} className="grid gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`org-${org}`}
                checked={chosen}
                onCheckedChange={(checked) => toggleOrg(org, checked === true)}
              />
              <Label htmlFor={`org-${org}`} className="font-normal">
                {org}
              </Label>
            </div>

            {chosen ? (
              <div className="grid gap-2 pl-6">
                <div role="radiogroup" aria-label={`Repositories of ${org}`} className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="accent-primary"
                      checked={!limited}
                      onChange={() => setLimited(org, false)}
                    />
                    All repositories
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" className="accent-primary" checked={limited} onChange={() => setLimited(org, true)} />
                    Only some repositories
                  </label>
                </div>

                {limited ? (
                  !state ? (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Loader2 className="size-4 animate-spin" /> Loading repositories…
                    </p>
                  ) : !state.ok ? (
                    <p className="text-destructive text-sm">{state.error}</p>
                  ) : (
                    <div className="grid gap-2">
                      <Input
                        type="search"
                        placeholder={`Filter ${state.items.length} repositories`}
                        aria-label={`Filter the repositories of ${org}`}
                        value={filters[org] ?? ""}
                        onChange={(event) => setFilters((current) => ({ ...current, [org]: event.target.value }))}
                      />
                      <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-md border p-2">
                        {state.items
                          .filter((repo) => repo.toLowerCase().includes(filter))
                          .map((repo) => (
                            <div key={repo} className="flex items-center gap-2">
                              <Checkbox
                                id={`repo-${repo}`}
                                checked={pickedRepos.includes(repo)}
                                onCheckedChange={(checked) => toggleRepo(repo, checked === true)}
                              />
                              <Label htmlFor={`repo-${repo}`} className="font-normal break-all">
                                {repo.slice(repo.indexOf("/") + 1)}
                              </Label>
                            </div>
                          ))}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {orgPicked.length === 0
                          ? `None picked yet: every repository of ${org} is included.`
                          : `${orgPicked.length} picked.`}
                      </p>
                    </div>
                  )
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

      <p className="text-muted-foreground text-xs">
        Missing an organization or a repository? Its owners may need to approve Recap Agent on GitHub (Organization
        settings → Third-party access).
      </p>
    </div>
  );
}
