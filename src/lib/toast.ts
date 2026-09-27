"use client";

import { toast as sonner } from "sonner";
import { currentMsgLocale, entityName, errorToMsg, msg, type EntityKey } from "@/lib/message";

export type MutationVerb = "create" | "update" | "delete";

export const notify = {
  created(entity: EntityKey): void {
    sonner.success(msg("create", "success", { entity: entityName(entity) }));
  },

  updated(entity: EntityKey): void {
    sonner.success(msg("update", "success", { entity: entityName(entity) }));
  },

  deleted(entity: EntityKey): void {
    sonner.success(msg("delete", "success", { entity: entityName(entity) }));
  },

  failed(verb: MutationVerb, entity: EntityKey): void {
    sonner.error(msg(verb, "failed", { entity: entityName(entity) }));
  },

  error(err: unknown, fallback?: string): void {
    sonner.error(errorToMsg(err, currentMsgLocale(), fallback));
  },

  success(text: string): void {
    sonner.success(text);
  },

  fail(text: string): void {
    sonner.error(text);
  },

  info(text: string): void {
    sonner.info(text);
  },
};
