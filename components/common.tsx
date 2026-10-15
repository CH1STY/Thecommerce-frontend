"use client";

import {
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

export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-center gap-3 text-sm"
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
