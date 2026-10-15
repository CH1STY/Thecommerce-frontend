"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import {
  normalizeSections,
  PREVIEW_PARAM,
  type DesignerMessage,
  type PreviewMessage,
  type Section,
} from "@/lib/page-layout";
import type { LayoutPage, PageLayoutResponse } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

interface PreviewDraft {
  sections: Section[];
  selectedId: string | null;
}

function postToDesigner(message: PreviewMessage) {
  window.parent.postMessage(message, window.location.origin);
}

/**
 * Inside the designer's iframe (`?__preview=1`) the page shows the designer's unsaved sections, sent by
 * `postMessage` from the same origin. Clicking a section selects it in the designer; links and forms are inert.
 */
function usePreviewDraft(page: LayoutPage) {
  const [draft, setDraft] = useState<PreviewDraft | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const inFrame = window.parent !== window;
    const requested = new URLSearchParams(window.location.search).has(PREVIEW_PARAM);
    if (!inFrame || !requested) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preview mode is only known in the browser
    setEnabled(true);

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const data = event.data as Partial<DesignerMessage> | null;
      if (data?.source !== "tc-designer" || data.kind !== "layout" || data.page !== page) return;
      setDraft({
        sections: normalizeSections(data.sections, page),
        selectedId: data.selectedId ?? null,
      });
    }

    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("a")) event.preventDefault();
      const section = target?.closest<HTMLElement>("[data-section-id]");
      if (section?.dataset.sectionId) {
        postToDesigner({ source: "tc-preview", kind: "select", id: section.dataset.sectionId });
      }
    }

    function onSubmit(event: SubmitEvent) {
      event.preventDefault();
    }

    window.addEventListener("message", onMessage);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    postToDesigner({ source: "tc-preview", kind: "ready" });
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [page]);

  useEffect(() => {
    if (!draft?.selectedId) return;
    document
      .querySelector(`[data-section-id="${CSS.escape(draft.selectedId)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [draft?.selectedId]);

  return { preview: enabled, draft };
}

/**
 * The sections of a storefront page: the published layout (or the built-in default when none is saved
 * or it can't be loaded), replaced by the designer's draft in preview mode. `undefined` while loading.
 */
export function usePageLayout(page: LayoutPage) {
  const { preview, draft } = usePreviewDraft(page);
  const saved = useLoad(`layout:${page}`, () =>
    api.get<PageLayoutResponse>(`/layouts/${page}`),
  );

  const sections = useMemo(() => {
    if (draft) return draft.sections;
    if (saved.data) return normalizeSections(saved.data.sections, page);
    if (saved.error) return normalizeSections(null, page);
    return undefined;
  }, [draft, saved.data, saved.error, page]);

  return { sections, preview, selectedId: draft?.selectedId ?? null };
}
