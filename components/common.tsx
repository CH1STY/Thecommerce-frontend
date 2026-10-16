"use client";

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ImageIcon,
  InfoIcon,
  TriangleAlertIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ApiError } from "@/lib/api-client";
import { humanize } from "@/lib/format";
import type { OrderChannel, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-end gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorBanner({
  error,
  onDismiss,
}: {
  error: ApiError | null;
  onDismiss?: () => void;
}) {
  if (!error) return null;
  return (
    <Alert variant="destructive" className="mb-4 border-destructive/30">
      <CircleAlertIcon />
      <AlertTitle>
        {error.status > 0 ? `${error.status} · ${error.title}` : error.title}
      </AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      {onDismiss && (
        <AlertAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <XIcon />
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}

const NOTICE_TONES: Record<
  "info" | "success" | "warning",
  { icon: LucideIcon; className: string }
> = {
  info: { icon: InfoIcon, className: "border-sky-500/30 *:[svg]:text-sky-600" },
  success: {
    icon: CircleCheckIcon,
    className: "border-emerald-500/30 *:[svg]:text-emerald-600",
  },
  warning: {
    icon: TriangleAlertIcon,
    className:
      "border-amber-500/40 bg-amber-500/5 *:[svg]:text-amber-600 dark:bg-amber-500/10",
  },
};

export function Notice({
  children,
  tone = "info",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof NOTICE_TONES;
  className?: string;
}) {
  const { icon: Icon, className: toneClass } = NOTICE_TONES[tone];
  return (
    <Alert className={cn("mb-4", toneClass, className)}>
      <Icon />
      <AlertDescription className="text-foreground">{children}</AlertDescription>
    </Alert>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
    >
      <Spinner />
      {label}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Empty className={cn("border border-dashed bg-card", className)}>
      <EmptyHeader>
        {Icon && (
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

// Lets TextInput / TextArea / Select pick up the label id and error state of the FormField around them.
const FieldControlContext = createContext<{
  id: string;
  invalid: boolean;
  describedBy?: string;
} | null>(null);

function useFieldControl(id: string | undefined, invalid: boolean | undefined) {
  const field = useContext(FieldControlContext);
  const isInvalid = invalid ?? field?.invalid ?? false;
  return {
    id: id ?? field?.id,
    "aria-invalid": isInvalid || undefined,
    "aria-describedby": field?.describedBy,
  };
}

interface FormFieldProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const invalid = Boolean(error);
  return (
    <Field data-invalid={invalid || undefined} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldControlContext.Provider
        value={{
          id,
          invalid,
          describedBy: error || hint ? messageId : undefined,
        }}
      >
        {children}
      </FieldControlContext.Provider>
      {error ? (
        <FieldError id={messageId}>{error}</FieldError>
      ) : (
        hint && <FieldDescription id={messageId}>{hint}</FieldDescription>
      )}
    </Field>
  );
}

export function TextInput({
  invalid,
  id,
  ...props
}: ComponentProps<typeof Input> & { invalid?: boolean }) {
  return <Input {...useFieldControl(id, invalid)} {...props} />;
}

export function TextArea({
  invalid,
  id,
  ...props
}: ComponentProps<typeof Textarea> & { invalid?: boolean }) {
  return <Textarea {...useFieldControl(id, invalid)} {...props} />;
}

export function Select({
  invalid,
  id,
  className,
  ...props
}: ComponentProps<typeof NativeSelect> & { invalid?: boolean }) {
  return (
    <NativeSelect
      {...useFieldControl(id, invalid)}
      className={cn("w-full", className)}
      {...props}
    />
  );
}

export interface SearchSelectOption {
  value: string;
  label: string;
  /** Muted text shown after the label (e.g. stock level). */
  hint?: string;
}

const OPTION_KEY = "opt:";

// Every search word must appear in the label (case-insensitive) — more predictable than fuzzy scoring for names.
function matchesSearch(_value: string, search: string, keywords?: string[]) {
  const haystack = (keywords ?? []).join(" ").toLowerCase();
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((w) => haystack.includes(w)) ? 1 : 0;
}

/** A dropdown with a search box, for lists too long to scroll (`value` "" = nothing chosen). */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Choose…",
  emptyOption,
  searchPlaceholder = "Search…",
  noResults = "No matches.",
  invalid,
  id,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  /** Label of a selectable "" entry at the top (e.g. "All products"); omit to only allow real options. */
  emptyOption?: string;
  searchPlaceholder?: string;
  noResults?: string;
  invalid?: boolean;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const control = useFieldControl(id, invalid);
  const selected = options.find((o) => o.value === value);
  const items =
    emptyOption === undefined
      ? options
      : [{ value: "", label: emptyOption }, ...options];

  function choose(next: string) {
    setOpen(false);
    if (next !== value) onChange(next);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setSearch("");
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          {...control}
          className={cn(
            "relative flex h-8 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
            className,
          )}
        >
          {selected ? (
            <>
              <span className="truncate">{selected.label}</span>
              {selected.hint && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {selected.hint}
                </span>
              )}
            </>
          ) : (
            <span
              className={cn(
                "truncate",
                emptyOption === undefined && "text-muted-foreground",
              )}
            >
              {emptyOption ?? placeholder}
            </span>
          )}
          <ChevronDownIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
      >
        <Command filter={matchesSearch} defaultValue={OPTION_KEY + value}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{noResults}</CommandEmpty>
            {items.map((o) => (
              <CommandItem
                key={o.value}
                value={OPTION_KEY + o.value}
                keywords={[o.label]}
                data-checked={o.value === value}
                onSelect={() => choose(o.value)}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint && (
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {o.hint}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function Pager({
  page,
  totalPages,
  onPage,
  className,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "mt-4 flex items-center justify-center gap-3 text-sm",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 0}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeftIcon data-icon="inline-start" />
        Previous
      </Button>
      <span className="text-muted-foreground">
        Page {page + 1} of {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages - 1}
        onClick={() => onPage(page + 1)}
      >
        Next
        <ChevronRightIcon data-icon="inline-end" />
      </Button>
    </nav>
  );
}

const STATUS_DOTS: Record<OrderStatus, string> = {
  PENDING: "bg-amber-500",
  CONFIRMED: "bg-sky-500",
  SHIPPED: "bg-indigo-500",
  DELIVERED: "bg-emerald-500",
  CANCELLED: "bg-muted-foreground",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline">
      <span className={cn("size-1.5 rounded-full", STATUS_DOTS[status])} />
      {humanize(status)}
    </Badge>
  );
}

export function ChannelBadge({ channel }: { channel: OrderChannel }) {
  return (
    <Badge variant="secondary">
      {channel === "IN_STORE" ? "In store" : "Online"}
    </Badge>
  );
}

export function ProductImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageIcon className="size-1/3 max-h-10 max-w-10" />
      </div>
    );
  }
  // Product images are arbitrary external URLs, so next/image (which needs remotePatterns) isn't used.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className={cn("bg-muted object-cover", className)}
    />
  );
}

/** Field errors that no input on the form displays (e.g. `items[0].quantity`). */
export function OtherFieldErrors({
  errors,
  shown,
}: {
  errors: Record<string, string>;
  shown: string[];
}) {
  const rest = Object.entries(errors).filter(([key]) => !shown.includes(key));
  if (rest.length === 0) return null;
  return (
    <ul className="mb-4 list-disc pl-5 text-sm text-destructive">
      {rest.map(([key, message]) => (
        <li key={key}>
          {key}: {message}
        </li>
      ))}
    </ul>
  );
}

/** A button that asks for confirmation in an accessible dialog before running `onConfirm`. */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Keep",
  destructive = true,
  onConfirm,
  children,
  ...buttonProps
}: Omit<ComponentProps<typeof Button>, "onClick" | "title"> & {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" {...buttonProps}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
