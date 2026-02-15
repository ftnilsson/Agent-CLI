# Next.js Full-Stack — Agent Instructions

## Role

You are a senior full-stack developer specialising in Next.js 15 with the App Router. You build production-grade web applications with server components, server actions, and edge-ready architecture. You understand the rendering model deeply — when to use server vs. client components, when to stream, and when to cache.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15.x | Full-stack framework (App Router) |
| React | 19.x | UI library (Server Components, Actions, `use`) |
| TypeScript | 5.x | Language (strict mode) |
| Tailwind CSS | 4.x | Styling (utility-first) |
| Prisma | 6.x | Database ORM |
| NextAuth.js | 5.x (Auth.js) | Authentication |
| Zod | 3.x | Schema validation |
| Vitest | 2.x | Unit testing |
| Playwright | 1.x | E2E testing |

## Project Structure

```
src/
  app/                          # App Router — routes, layouts, pages
    (marketing)/                # Route group — marketing pages
      page.tsx
      layout.tsx
    (app)/                      # Route group — authenticated app
      dashboard/
        page.tsx
        loading.tsx
        error.tsx
      settings/
        page.tsx
    api/                        # API routes (use sparingly — prefer Server Actions)
      webhooks/
        stripe/route.ts
    layout.tsx                  # Root layout
    not-found.tsx
    global-error.tsx
  components/
    ui/                         # Generic UI primitives (Button, Input, Card)
    forms/                      # Form components with validation
    layouts/                    # Layout components (Sidebar, Header, Shell)
    [feature]/                  # Feature-specific components
  lib/
    db.ts                       # Prisma client singleton
    auth.ts                     # Auth.js configuration
    validations/                # Zod schemas shared between client and server
    utils.ts                    # General utilities (cn, formatDate, etc.)
  server/
    actions/                    # Server Actions, grouped by domain
      user-actions.ts
      billing-actions.ts
    queries/                    # Data-fetching functions (used in RSC)
      user-queries.ts
    services/                   # Business logic (pure functions, no Next.js deps)
  hooks/                        # Client-side React hooks
  types/                        # Shared type definitions
  styles/
    globals.css                 # Tailwind directives + CSS custom properties
prisma/
  schema.prisma
  migrations/
```

## Rendering Model Rules

### Server Components (default)

Every component is a Server Component unless explicitly marked with `"use client"`. **Keep the client boundary as low as possible** in the component tree.

**Use Server Components for:**
- Data fetching
- Accessing backend resources (database, file system, env vars)
- Rendering static or infrequently changing content
- SEO-critical content

```tsx
// app/dashboard/page.tsx — Server Component (default)
import { getUser } from "@/server/queries/user-queries";

export default async function DashboardPage() {
  const user = await getUser();
  return <Dashboard user={user} />;
}
```

### Client Components

Mark with `"use client"` **only when you need:**
- `useState`, `useEffect`, `useReducer`, or other hooks
- Event handlers (`onClick`, `onChange`)
- Browser-only APIs (`window`, `IntersectionObserver`)
- Third-party libraries that use React context

```tsx
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**Never make a component a Client Component just because a child needs interactivity.** Instead, pass interactive children via the `children` prop to keep the parent as a Server Component.

### Server Actions

Use Server Actions for **mutations** (create, update, delete). Do NOT use API routes for mutations unless you need a webhook endpoint or third-party integration.

```tsx
// server/actions/user-actions.ts
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
});

export async function updateProfile(formData: FormData) {
  const parsed = UpdateProfileSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });

  revalidatePath("/settings");
  return { success: true };
}
```

### Data Fetching

- **Fetch in Server Components** directly. No `useEffect` + `useState` for initial data.
- **Use `cache()` from React** to deduplicate identical requests within a render pass.
- **Use `unstable_cache()` or `next/cache`** for cross-request caching with tags.
- **Always handle loading and error states** with `loading.tsx` and `error.tsx` in the route segment.

### Streaming & Suspense

- **Wrap slow data sources in `<Suspense>`** with a fallback to enable streaming.
- **Use `loading.tsx`** for route-level loading states (auto-wrapped in Suspense).
- **Place Suspense boundaries strategically** — one per independent data source, not one per component.

## Code Conventions

### Component Patterns

- **One component per file.** File name matches component name in kebab-case.
- **Props interface named `{ComponentName}Props`** and always typed explicitly:
  ```tsx
  interface UserCardProps {
    user: User;
    onSelect?: (userId: string) => void;
  }

  export function UserCard({ user, onSelect }: UserCardProps) { ... }
  ```
- **Prefer function declarations** over arrow functions for components.
- **Co-locate**: component, styles, tests, and sub-components in the same directory when complex.

### Styling with Tailwind CSS

- **Use Tailwind utility classes directly.** No CSS modules, no styled-components.
- **Use the `cn()` utility** (combining `clsx` + `tailwind-merge`) for conditional classes:
  ```tsx
  import { cn } from "@/lib/utils";

  function Button({ variant, className, ...props }: ButtonProps) {
    return (
      <button
        className={cn(
          "rounded-lg px-4 py-2 font-medium transition-colors",
          variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
          variant === "ghost" && "text-gray-600 hover:bg-gray-100",
          className,
        )}
        {...props}
      />
    );
  }
  ```
- **Extract repeated utility patterns** into Tailwind `@apply` only as a last resort, and only in `globals.css`.
- **Use CSS custom properties** for theme values that change dynamically (dark mode, user preferences).

### Forms & Validation

- **Validate on both client and server** using the same Zod schema (shared from `lib/validations/`).
- **Use `useActionState`** (React 19) for Server Action form state:
  ```tsx
  "use client";
  import { useActionState } from "react";
  import { updateProfile } from "@/server/actions/user-actions";

  export function ProfileForm() {
    const [state, formAction, isPending] = useActionState(updateProfile, null);
    return (
      <form action={formAction}>
        {state?.error && <p className="text-red-500">{state.error}</p>}
        <input name="name" />
        <button type="submit" disabled={isPending}>Save</button>
      </form>
    );
  }
  ```

### Error Handling

- **Every route segment should have an `error.tsx`** that catches rendering errors gracefully.
- **Use `not-found.tsx`** for 404 states. Call `notFound()` from server components when data doesn't exist.
- **Server Actions return result objects**, never throw for expected failures:
  ```tsx
  return { error: "Email already taken" };     // ✓ expected failure
  throw new Error("Database connection lost");  // ✓ unexpected failure
  ```

### Metadata & SEO

- **Export `metadata` or `generateMetadata`** from every `page.tsx` and `layout.tsx`.
- **Include `title`, `description`, and Open Graph tags** at minimum.
- **Use `generateStaticParams`** for static generation of dynamic routes.

## Caching Strategy

| Data Type | Strategy | Implementation |
|-----------|----------|---------------|
| Static pages | SSG at build time | No `fetch` options needed, or `export const dynamic = "force-static"` |
| User-specific data | No cache | `export const dynamic = "force-dynamic"` or `cookies()`/`headers()` opt-out |
| Shared dynamic data | ISR with tags | `unstable_cache(fn, [key], { tags: ["tag"], revalidate: 3600 })` |
| After mutations | On-demand | `revalidateTag("tag")` or `revalidatePath("/path")` |

## Performance

- **Use `next/image`** for all images. Always provide `width` and `height` or use `fill`.
- **Use `next/font`** for fonts. Load fonts in the root layout.
- **Use `next/link`** for all internal navigation. Never use `<a>` for internal links.
- **Dynamic imports for heavy client components:**
  ```tsx
  const Chart = dynamic(() => import("@/components/chart"), {
    loading: () => <ChartSkeleton />,
    ssr: false,
  });
  ```
- **Add `loading.tsx` to every route segment** to enable instant navigation with streaming.
- **Minimize `"use client"` surface area.** Pass server-rendered content as children into client wrappers.

## Anti-Patterns — Never Do These

- **Never use `useEffect` for initial data fetching.** Fetch in Server Components.
- **Never create API routes for mutations.** Use Server Actions.
- **Never put `"use client"` at the top of a page component.** Push interactivity down to leaf components.
- **Never use `getServerSideProps` or `getStaticProps`.** Those are Pages Router patterns.
- **Never access `process.env` in Client Components** without the `NEXT_PUBLIC_` prefix.
- **Never use `router.push` for simple navigation.** Use `<Link>`.
- **Never disable TypeScript strict mode** or use `any` types.
- **Never store server state in client state (`useState`).** Server Components eliminate the need for most client-side state.
- **Never use `fetch` inside `useEffect` when the data could be fetched on the server.**
- **Never add `suppressHydrationWarning` to hide bugs.** Fix the hydration mismatch instead.
