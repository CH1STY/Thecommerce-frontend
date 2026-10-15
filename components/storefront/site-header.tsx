"use client";

import {
  ChevronDownIcon,
  ChevronRightIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  PackageIcon,
  SearchIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  StoreIcon,
  SunIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useCategoryTree } from "@/components/categories";
import { ProductImage } from "@/components/common";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { humanize, initials } from "@/lib/format";
import { fetchProducts } from "@/lib/products";
import { useSession } from "@/lib/session";
import { useSettings } from "@/lib/settings";
import { isStaff, type CategoryNode } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

const MAX_TOP_CATEGORIES = 7;

export function SiteHeader() {
  const { user } = useSession();
  return (
    <header className="no-print sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <MobileMenu />
        <Logo />
        <div className="mx-2 hidden flex-1 md:block lg:mx-6">
          <Suspense fallback={<SearchBoxShell />}>
            <SearchBox />
          </Suspense>
        </div>
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1 md:ml-0">
          <ThemeToggle />
          <AccountMenu />
          <CartButton />
        </div>
      </div>
      <div className="px-3 pb-3 md:hidden">
        <Suspense fallback={<SearchBoxShell />}>
          <SearchBox />
        </Suspense>
      </div>
      <div className="hidden border-t lg:block">
        <div className="mx-auto flex h-11 max-w-7xl items-center gap-2 px-4">
          <CategoryBar />
          <nav aria-label="Quick links" className="ml-auto flex items-center gap-1 text-sm">
            <QuickLink href="/search?sort=NEWEST">New arrivals</QuickLink>
            <QuickLink href="/search?inStock=true">In stock</QuickLink>
            {user?.role === "CUSTOMER" && <QuickLink href="/account/orders">My orders</QuickLink>}
            {isStaff(user) && <QuickLink href="/admin">Staff area</QuickLink>}
          </nav>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2 font-heading text-lg font-semibold tracking-tight"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <StoreIcon className="size-4" />
      </span>
      <span className="hidden min-[400px]:inline">TheCommerce</span>
    </Link>
  );
}

function QuickLink({ href, children }: { href: string; children: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="font-normal text-muted-foreground hover:text-foreground">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </Button>
  );
}

function CartButton() {
  const lines = useCart();
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  return (
    <Button
      asChild
      variant="ghost"
      className="relative h-9 px-2"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <Link href="/cart">
        <ShoppingCartIcon className="size-5" />
        <span className="hidden text-sm lg:inline">Cart</span>
        {count > 0 && (
          <Badge className="absolute top-0 left-5 h-4 min-w-4 px-1 text-[10px] tabular-nums">
            {count}
          </Badge>
        )}
      </Link>
    </Button>
  );
}

function AccountMenu() {
  const { user, logout } = useSession();
  const router = useRouter();

  if (user === undefined) return <div className="size-8" />;
  if (user === null) {
    return (
      <>
        <Button asChild variant="ghost" className="h-9 px-2" aria-label="Sign in">
          <Link href="/login">
            <UserIcon className="size-5" />
            <span className="hidden text-sm lg:inline">Sign in</span>
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="hidden lg:inline-flex">
          <Link href="/register">Register</Link>
        </Button>
      </>
    );
  }

  async function signOut() {
    await logout();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Account menu">
          <Avatar size="sm">
            <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-sm lg:inline">
            {user.fullName.split(" ")[0]}
          </span>
          <ChevronDownIcon className="hidden size-3.5 text-muted-foreground lg:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-medium text-foreground">{user.fullName}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email} · {humanize(user.role)}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/account">
              <UserIcon />
              My profile
            </Link>
          </DropdownMenuItem>
          {user.role === "CUSTOMER" && (
            <DropdownMenuItem asChild>
              <Link href="/account/orders">
                <PackageIcon />
                My orders
              </Link>
            </DropdownMenuItem>
          )}
          {isStaff(user) && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <LayoutDashboardIcon />
                Staff area
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/cart">
              <ShoppingBagIcon />
              Cart
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---- Search box with live suggestions ------------------------------------------------------------

function SearchBoxShell() {
  return (
    <div className="flex h-10 w-full items-center gap-2 rounded-full border bg-muted/50 px-4 text-sm text-muted-foreground">
      <SearchIcon className="size-4" />
      Search products…
    </div>
  );
}

function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { money } = useSettings();
  const urlQuery = pathname === "/search" ? (params.get("q") ?? "") : "";
  const [text, setText] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);

  // Follow the URL when the user navigates (e.g. back button) without overwriting typing.
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setText(urlQuery);
  }

  useEffect(() => {
    const handle = window.setTimeout(() => setTerm(text.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [text]);

  const suggestions = useLoad(term.length >= 2 ? `suggest|${term}` : null, () =>
    fetchProducts({ q: term, limit: 6 }),
  );
  const items = term.length >= 2 && term === text.trim() ? (suggestions.data ?? []) : [];
  const showList = open && text.trim().length >= 2;

  function go(query: string) {
    setOpen(false);
    setActive(-1);
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active >= 0 && items[active]) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(items[active].name)}`);
      return;
    }
    go(text);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div
      ref={box}
      className="relative w-full"
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <form role="search" onSubmit={onSubmit}>
        <div className="flex h-10 w-full items-center rounded-full border bg-muted/50 pr-1 pl-4 transition-colors focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/30">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search products…"
            aria-label="Search products"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            type="search"
            enterKeyHint="search"
          />
          {text && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Clear search"
              className="rounded-full"
              onClick={() => {
                setText("");
                setActive(-1);
              }}
            >
              <XIcon />
            </Button>
          )}
          <Button type="submit" size="sm" className="ml-1 h-8 rounded-full px-4">
            Search
          </Button>
        </div>
      </form>
      {showList && (
        <div
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <ul id={listId} role="listbox" aria-label="Suggestions" className="max-h-96 overflow-y-auto p-1">
            {items.map((product, index) => (
              <li
                key={product.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
              >
                <Link
                  href={`/search?q=${encodeURIComponent(product.name)}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-accent",
                    index === active && "bg-accent",
                  )}
                >
                  <ProductImage
                    src={product.imageUrl}
                    alt=""
                    className="size-10 shrink-0 rounded-md"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{product.name}</span>
                    {product.categoryPath.length > 0 && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {product.categoryPath.map((c) => c.name).join(" › ")}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{money(product.price)}</span>
                </Link>
              </li>
            ))}
            {term === text.trim() && suggestions.data?.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No products match “{text.trim()}”.</li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => go(text)}
            className="flex w-full items-center gap-2 border-t px-4 py-2.5 text-left text-sm hover:bg-accent"
          >
            <SearchIcon className="size-4 text-muted-foreground" />
            See all results for “<span className="truncate font-medium">{text.trim()}</span>”
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Categories: desktop mega menu and mobile sheet -----------------------------------------------

const categoryHref = (id: number) => `/search?category=${id}`;

function CategoryBar() {
  const tree = useCategoryTree();
  const roots = tree.data ?? [];
  const top = roots.slice(0, MAX_TOP_CATEGORIES);

  return (
    <NavigationMenu className="max-w-none justify-start" aria-label="Categories">
      <NavigationMenuList className="justify-start gap-0.5">
        <NavigationMenuItem>
          <NavigationMenuTrigger className="h-8 gap-1.5 bg-primary px-3 text-primary-foreground hover:bg-primary/85 hover:text-primary-foreground focus:bg-primary/85 focus:text-primary-foreground data-open:bg-primary/85 data-open:text-primary-foreground data-open:hover:bg-primary/85 data-open:focus:bg-primary/85">
            <LayoutGridIcon className="size-4" />
            All categories
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[min(92vw,44rem)] p-3">
              {roots.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">
                  {tree.loading ? "Loading categories…" : "No categories yet."}
                </p>
              ) : (
                <ul className="grid grid-cols-3 gap-1">
                  {roots.map((node) => (
                    <li key={node.id}>
                      <NavigationMenuLink asChild>
                        <Link href={categoryHref(node.id)} className="justify-between">
                          <span className="truncate font-medium">{node.name}</span>
                          {node.children.length > 0 && (
                            <span className="text-xs text-muted-foreground">{node.children.length}</span>
                          )}
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              )}
              <Separator className="my-2" />
              <NavigationMenuLink asChild>
                <Link href="/search" className="font-medium">
                  Browse all products
                  <ChevronRightIcon className="ml-auto" />
                </Link>
              </NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        {top.map((node) =>
          node.children.length > 0 ? (
            <NavigationMenuItem key={node.id}>
              <NavigationMenuTrigger className="h-8 font-normal">{node.name}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <MegaPanel node={node} />
              </NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={node.id}>
              <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "h-8 font-normal")}>
                <Link href={categoryHref(node.id)}>{node.name}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ),
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function MegaPanel({ node }: { node: CategoryNode }) {
  return (
    <div className="w-[min(92vw,48rem)] p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="font-heading text-base font-semibold">{node.name}</p>
        <NavigationMenuLink asChild className="p-1 text-sm font-medium underline-offset-4 hover:bg-transparent hover:underline">
          <Link href={categoryHref(node.id)}>
            Shop all {node.name}
            <ChevronRightIcon />
          </Link>
        </NavigationMenuLink>
      </div>
      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
        {node.children.map((child) => (
          <div key={child.id} className="min-w-0">
            <NavigationMenuLink asChild className="p-1 font-medium">
              <Link href={categoryHref(child.id)}>{child.name}</Link>
            </NavigationMenuLink>
            {child.children.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {child.children.slice(0, 8).map((grandchild) => (
                  <li key={grandchild.id}>
                    <NavigationMenuLink asChild className="p-1 text-muted-foreground hover:text-foreground">
                      <Link href={categoryHref(grandchild.id)}>{grandchild.name}</Link>
                    </NavigationMenuLink>
                  </li>
                ))}
                {child.children.length > 8 && (
                  <li>
                    <NavigationMenuLink asChild className="p-1 text-xs font-medium">
                      <Link href={categoryHref(child.id)}>+{child.children.length - 8} more</Link>
                    </NavigationMenuLink>
                  </li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { user } = useSession();
  const tree = useCategoryTree();
  const close = () => setOpen(false);

  const links = [
    { href: "/", label: "Home", show: true },
    { href: "/search", label: "All products", show: true },
    { href: "/search?sort=NEWEST", label: "New arrivals", show: true },
    { href: "/account/orders", label: "My orders", show: user?.role === "CUSTOMER" },
    { href: "/admin", label: "Staff area", show: isStaff(user) },
  ].filter((l) => l.show);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 max-w-[85vw] gap-0 overflow-y-auto">
        <SheetHeader className="border-b">
          <SheetTitle>TheCommerce</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-0.5 p-3" aria-label="Main">
          {links.map((l) => (
            <Button key={l.href} asChild variant="ghost" className="justify-start" onClick={close}>
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
          {user === null && (
            <Button asChild variant="ghost" className="justify-start" onClick={close}>
              <Link href="/login">
                <LogInIcon data-icon="inline-start" />
                Sign in or register
              </Link>
            </Button>
          )}
        </nav>
        <Separator />
        <div className="p-3">
          <p className="px-2.5 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Categories
          </p>
          {tree.data && tree.data.length > 0 ? (
            <MobileCategoryTree nodes={tree.data} onNavigate={close} />
          ) : (
            <p className="px-2.5 text-sm text-muted-foreground">
              {tree.loading ? "Loading…" : "No categories yet."}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileCategoryTree({
  nodes,
  onNavigate,
  depth = 0,
}: {
  nodes: CategoryNode[];
  onNavigate: () => void;
  depth?: number;
}) {
  return (
    <ul className={cn("space-y-0.5", depth > 0 && "ml-3 border-l pl-2")}>
      {nodes.map((node) =>
        node.children.length === 0 ? (
          <li key={node.id}>
            <Button asChild variant="ghost" className="w-full justify-start font-normal" onClick={onNavigate}>
              <Link href={categoryHref(node.id)}>{node.name}</Link>
            </Button>
          </li>
        ) : (
          <li key={node.id}>
            <Collapsible>
              <div className="flex items-center">
                <Button asChild variant="ghost" className="flex-1 justify-start font-normal" onClick={onNavigate}>
                  <Link href={categoryHref(node.id)}>{node.name}</Link>
                </Button>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Show ${node.name} sub-categories`}
                    className="group/expand"
                  >
                    <ChevronDownIcon className="transition-transform group-data-[state=open]/expand:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <MobileCategoryTree nodes={node.children} onNavigate={onNavigate} depth={depth + 1} />
              </CollapsibleContent>
            </Collapsible>
          </li>
        ),
      )}
    </ul>
  );
}
