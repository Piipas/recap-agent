import { prisma } from "@recap/db";
import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { ConfirmAction } from "@/components/confirm-action";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/server/session";
import { deleteManagerAction } from "./actions";
import { EditManagerDialog } from "./edit-manager-dialog";
import { ManagerForm } from "./manager-form";

export const metadata: Metadata = { title: "Managers" };

export default async function ManagersPage() {
  const user = await requireUser();
  const managers = await prisma.manager.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { schedules: true } } },
  });

  return (
    <>
      <PageHeader title="Managers" description="The people your recaps can be sent to." />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add a manager</CardTitle>
            <CardDescription>You choose who receives each recap before it is sent.</CardDescription>
          </CardHeader>
          <CardContent>
            <ManagerForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your list</CardTitle>
          </CardHeader>
          <CardContent>
            {managers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No managers yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Schedules</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers.map((manager) => (
                    <TableRow key={manager.id}>
                      <TableCell className="font-medium">{manager.name}</TableCell>
                      <TableCell className="text-muted-foreground">{manager.email}</TableCell>
                      <TableCell className="hidden sm:table-cell">{manager._count.schedules}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <EditManagerDialog manager={{ id: manager.id, name: manager.name, email: manager.email }} />
                          <ConfirmAction
                            action={deleteManagerAction.bind(null, manager.id)}
                            title={`Remove ${manager.name}?`}
                            description="They are removed from every schedule. Recaps already sent are not affected."
                            confirmLabel="Remove"
                            destructive
                          >
                            <Button variant="ghost" size="icon" aria-label={`Remove ${manager.name}`}>
                              <Trash2 />
                            </Button>
                          </ConfirmAction>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
