"use client";

import {
  BanIcon,
  CircleCheckIcon,
  KeyRoundIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  EmptyState,
  ErrorBanner,
  FormField,
  Loading,
  OtherFieldErrors,
  PageHeader,
  Pager,
  Select,
  TextInput,
} from "@/components/common";
import {
  EMPTY_PHONE,
  PHONE_ERROR_KEYS,
  PhoneField,
} from "@/components/PhoneField";
import { RequireRole } from "@/components/shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, toApiError, type ApiError } from "@/lib/api-client";
import { formatDate, humanize, initials } from "@/lib/format";
import { useSession } from "@/lib/session";
import { ROLES, type Page, type Role, type User } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

export default function UsersAdminPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <Users />
    </RequireRole>
  );
}

type Panel =
  | { mode: "create" }
  | { mode: "edit" | "password"; user: User }
  | null;

function Users() {
  const { user: me } = useSession();
  const [role, setRole] = useState<Role | "">("");
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  const users = useLoad(`users-${role}-${page}`, () =>
    api.get<Page<User>>("/users", {
      params: { role: role || undefined, page, size: 20 },
    }),
  );

  function replace(updated: User) {
    users.setData((current) => ({
      ...current,
      content: current.content.map((u) => (u.id === updated.id ? updated : u)),
    }));
  }

  async function toggleEnabled(user: User) {
    setActionError(null);
    try {
      const updated = await api.patch<User>(`/users/${user.id}`, {
        enabled: !user.enabled,
      });
      replace(updated);
      toast.success(
        `${updated.email} ${updated.enabled ? "enabled" : "disabled"}.`,
      );
    } catch (e) {
      setActionError(toApiError(e));
    }
  }

  async function remove(user: User) {
    setActionError(null);
    try {
      await api.delete(`/users/${user.id}`);
      users.reload();
      toast.success(`${user.email} deleted.`);
    } catch (e) {
      setActionError(toApiError(e));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description={
          users.data
            ? `${users.data.totalElements} account${users.data.totalElements === 1 ? "" : "s"}`
            : "Staff and customer accounts."
        }
        actions={
          <>
            <FormField label="Role" className="w-40">
              <Select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as Role | "");
                  setPage(0);
                }}
              >
                <option value="">All roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {humanize(r)}
                  </option>
                ))}
              </Select>
            </FormField>
            <Button type="button" onClick={() => setPanel({ mode: "create" })}>
              <UserPlusIcon data-icon="inline-start" />
              New user
            </Button>
          </>
        }
      />

      <ErrorBanner
        error={actionError ?? users.error}
        onDismiss={() => setActionError(null)}
      />

      {users.loading && !users.data ? (
        <Loading />
      ) : users.data?.content.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users match" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">User</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Since</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data?.content.map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{initials(u.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium">
                            {u.fullName}
                            {isSelf && (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === "CUSTOMER" ? "secondary" : "default"}
                      >
                        {humanize(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.enabled ? (
                        <Badge variant="outline">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${u.email}`}
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onSelect={() => setPanel({ mode: "edit", user: u })}
                          >
                            <PencilIcon />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              setPanel({ mode: "password", user: u })
                            }
                          >
                            <KeyRoundIcon />
                            Reset password
                          </DropdownMenuItem>
                          {!isSelf && (
                            <>
                              <DropdownMenuItem
                                onSelect={() => void toggleEnabled(u)}
                              >
                                {u.enabled ? <BanIcon /> : <CircleCheckIcon />}
                                {u.enabled ? "Disable" : "Enable"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDeleting(u)}
                              >
                                <Trash2Icon />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      {users.data && (
        <Pager
          page={users.data.page}
          totalPages={users.data.totalPages}
          onPage={setPage}
        />
      )}

      <Dialog
        open={panel !== null}
        onOpenChange={(open) => !open && setPanel(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {panel?.mode === "create" && (
            <CreateUserForm
              onCreated={(created) => {
                setPanel(null);
                users.reload();
                toast.success(`${created.email} created.`);
              }}
            />
          )}
          {panel?.mode === "edit" && (
            <EditUserForm
              key={panel.user.id}
              user={panel.user}
              isSelf={panel.user.id === me?.id}
              onSaved={(updated) => {
                replace(updated);
                setPanel(null);
                toast.success(`${updated.email} saved.`);
              }}
            />
          )}
          {panel?.mode === "password" && (
            <ResetPasswordForm
              key={panel.user.id}
              user={panel.user}
              onDone={() => {
                toast.success(`Password for ${panel.user.email} was reset.`);
                setPanel(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Users with orders or recorded sales can only be disabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleting && void remove(deleting)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormFooter({ busy, label }: { busy: boolean; label: string }) {
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button type="button" variant="outline">
          Cancel
        </Button>
      </DialogClose>
      <Button type="submit" disabled={busy}>
        {busy && <Spinner data-icon="inline-start" />}
        {label}
      </Button>
    </DialogFooter>
  );
}

function CreateUserForm({ onCreated }: { onCreated: (user: User) => void }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    shippingAddress: "",
  });
  const [role, setRole] = useState<Role>("MANAGER");
  const [withPhone, setWithPhone] = useState(false);
  const [phone, setPhone] = useState(EMPTY_PHONE);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onCreated(
        await api.post<User>("/users", {
          ...form,
          role,
          shippingAddress: form.shippingAddress.trim() || undefined,
          phone: withPhone ? phone : undefined,
        }),
      );
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const fe = error?.fieldErrors ?? {};
  const set = (key: keyof typeof form) => (value: string) =>
    setForm({ ...form, [key]: value });
  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>New user</DialogTitle>
        <DialogDescription>
          Create a staff account (or a customer on their behalf).
        </DialogDescription>
      </DialogHeader>
      <div>
        <ErrorBanner error={error && !error.isValidationError ? error : null} />
        <OtherFieldErrors
          errors={fe}
          shown={[
            "email",
            "password",
            "fullName",
            "role",
            "shippingAddress",
            ...PHONE_ERROR_KEYS,
          ]}
        />
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <FormField label="Full name" error={fe.fullName}>
            <TextInput
              value={form.fullName}
              onChange={(e) => set("fullName")(e.target.value)}
            />
          </FormField>
          <FormField label="Email" error={fe.email}>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
            />
          </FormField>
          <FormField label="Password" error={fe.password} hint="8–72 characters">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set("password")(e.target.value)}
            />
          </FormField>
          <FormField label="Role" error={fe.role}>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {humanize(r)}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="space-y-4 md:col-span-2">
            <Field orientation="horizontal">
              <Checkbox
                id="create-user-phone"
                checked={withPhone}
                onCheckedChange={(checked) => setWithPhone(checked === true)}
              />
              <FieldLabel htmlFor="create-user-phone" className="font-normal">
                Add a phone number
              </FieldLabel>
            </Field>
            {withPhone && (
              <PhoneField value={phone} onChange={setPhone} errors={fe} />
            )}
          </div>
        </FieldGroup>
      </div>
      <FormFooter busy={busy} label="Create" />
    </form>
  );
}

function EditUserForm({
  user,
  isSelf,
  onSaved,
}: {
  user: User;
  isSelf: boolean;
  onSaved: (user: User) => void;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [address, setAddress] = useState(user.shippingAddress ?? "");
  const [role, setRole] = useState<Role>(user.role);
  const [changePhone, setChangePhone] = useState(false);
  const [phone, setPhone] = useState(EMPTY_PHONE);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSaved(
        await api.patch<User>(`/users/${user.id}`, {
          fullName,
          shippingAddress: address,
          role: role === user.role ? undefined : role,
          phone: changePhone ? phone : undefined,
        }),
      );
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const fe = error?.fieldErrors ?? {};
  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Edit {user.fullName}</DialogTitle>
        <DialogDescription>{user.email}</DialogDescription>
      </DialogHeader>
      <div>
        <ErrorBanner error={error && !error.isValidationError ? error : null} />
        <OtherFieldErrors
          errors={fe}
          shown={["fullName", "shippingAddress", "role", ...PHONE_ERROR_KEYS]}
        />
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <FormField label="Full name" error={fe.fullName}>
            <TextInput
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </FormField>
          <FormField
            label="Role"
            error={fe.role}
            hint={isSelf ? "You can't change your own role." : undefined}
          >
            <Select
              value={role}
              disabled={isSelf}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {humanize(r)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Shipping address"
            error={fe.shippingAddress}
            className="md:col-span-2"
          >
            <TextInput
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </FormField>
          <div className="md:col-span-2">
            {changePhone ? (
              <PhoneField value={phone} onChange={setPhone} errors={fe} />
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span>
                  <span className="text-muted-foreground">Phone:</span>{" "}
                  {user.phone ?? "not set"}
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setChangePhone(true)}
                >
                  {user.phone ? "Change" : "Add"}
                </Button>
              </div>
            )}
          </div>
        </FieldGroup>
      </div>
      <FormFooter busy={busy} label="Save" />
    </form>
  );
}

function ResetPasswordForm({
  user,
  onDone,
}: {
  user: User;
  onDone: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.put(`/users/${user.id}/password`, { newPassword });
      onDone();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Reset password</DialogTitle>
        <DialogDescription>Set a new password for {user.email}.</DialogDescription>
      </DialogHeader>
      <div>
        <ErrorBanner error={error && !error.isValidationError ? error : null} />
        <FormField
          label="New password"
          error={error?.fieldErrors.newPassword}
          hint="8–72 characters"
        >
          <TextInput
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </FormField>
      </div>
      <FormFooter busy={busy} label="Reset password" />
    </form>
  );
}
