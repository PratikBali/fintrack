"use client";

import { useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  CATEGORY_GROUPS,
  DEFAULT_CATEGORY,
  OTHER_CATEGORY,
  getCategoryIcon,
  resolveCategoryGroup,
  INCOME_CATEGORY,
} from "@/lib/data";
import { newId, useTxnPrefs } from "@/lib/txn-prefs";
import type {
  AccountType,
  CategoryGroup,
  CategoryOption,
  PaymentAccount,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MultiTab } from "@/components/ui/multi-tab";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Kind = "app" | "account" | "category";

function ManageOptionsDialog({
  kind,
  open,
  onOpenChange,
  onPicked,
}: {
  kind: Kind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a new option is added — id for app/account, name for category. */
  onPicked?: (value: string) => void;
}) {
  const { user } = useAuth();
  const { prefs, saveApps, saveAccounts, saveCategories, savePrefs } =
    useTxnPrefs();
  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState<AccountType>("bank");
  const [draftGroup, setDraftGroup] = useState<CategoryGroup>("consumable");
  const [editingId, setEditingId] = useState<string | null>(null);

  const title =
    kind === "app"
      ? "Txn apps"
      : kind === "account"
        ? "Banks & credit cards"
        : "Categories";

  const categories = prefs.categories ?? [];
  const items =
    kind === "app"
      ? prefs.apps
      : kind === "account"
        ? prefs.accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }))
        : categories.filter(
            (c) =>
              c.name !== INCOME_CATEGORY &&
              resolveCategoryGroup(c) === draftGroup
          );

  const resetForm = () => {
    setDraftName("");
    setDraftType("bank");
    setEditingId(null);
  };

  const handleSaveItem = async () => {
    if (!user || !draftName.trim()) return;
    const name = draftName.trim();
    const isNew = !editingId;

    if (kind === "app") {
      const id = editingId ?? newId();
      const apps = editingId
        ? prefs.apps.map((a) => (a.id === editingId ? { ...a, name } : a))
        : [...prefs.apps, { id, name }];
      await saveApps(apps);
      if (isNew) {
        onPicked?.(id);
        onOpenChange(false);
      }
    } else if (kind === "account") {
      const id = editingId ?? newId();
      const accounts: PaymentAccount[] = editingId
        ? prefs.accounts.map((a) =>
            a.id === editingId ? { ...a, name, type: draftType } : a
          )
        : [...prefs.accounts, { id, name, type: draftType }];
      await saveAccounts(accounts);
      if (isNew) {
        onPicked?.(id);
        onOpenChange(false);
      }
    } else {
      const id = editingId ?? newId();
      const cats: CategoryOption[] = editingId
        ? categories.map((c) =>
            c.id === editingId ? { ...c, name, group: draftGroup } : c
          )
        : [...categories, { id, name, group: draftGroup }];
      await saveCategories(cats);
      if (isNew) {
        onPicked?.(name);
        onOpenChange(false);
      }
    }
    resetForm();
  };

  const handleEdit = (item: {
    id: string;
    name: string;
    type?: AccountType;
  }) => {
    setEditingId(item.id);
    setDraftName(item.name);
    if (kind === "account" && item.type) setDraftType(item.type);
    if (kind === "category") {
      const cat = categories.find((c) => c.id === item.id);
      setDraftGroup(resolveCategoryGroup(cat ?? { name: item.name }));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!user) return;
    if (kind === "category" && name === INCOME_CATEGORY) return;
    if (kind === "app") {
      const apps = prefs.apps.filter((a) => a.id !== id);
      await savePrefs(
        prefs.defaultAppId === id ? { apps, defaultAppId: "" } : { apps }
      );
    } else if (kind === "account") {
      const accounts = prefs.accounts.filter((a) => a.id !== id);
      await savePrefs(
        prefs.defaultAccountId === id
          ? { accounts, defaultAccountId: "" }
          : { accounts }
      );
    } else {
      const nextCats = categories.filter((c) => c.id !== id);
      await savePrefs({
        categories: nextCats,
        ...(prefs.defaultConsumableCategory === name
          ? { defaultConsumableCategory: "" }
          : {}),
        ...(prefs.defaultMaterialCategory === name
          ? { defaultMaterialCategory: "" }
          : {}),
      });
    }
    if (editingId === id) resetForm();
  };

  const toggleDefault = (item: { id: string; name: string }) => {
    if (kind === "app") {
      const id = item.id;
      savePrefs({ defaultAppId: prefs.defaultAppId === id ? "" : id });
    } else if (kind === "account") {
      const id = item.id;
      savePrefs({ defaultAccountId: prefs.defaultAccountId === id ? "" : id });
    } else {
      const name = item.name;
      const cat = categories.find((c) => c.id === item.id);
      const isConsumable =
        resolveCategoryGroup(cat ?? { name }) === "consumable";
      const currentDefault = isConsumable
        ? prefs.defaultConsumableCategory
        : prefs.defaultMaterialCategory;
      const nextValue = currentDefault === name ? "" : name;
      savePrefs(
        isConsumable
          ? { defaultConsumableCategory: nextValue }
          : { defaultMaterialCategory: nextValue }
      );
    }
  };

  const placeholder =
    kind === "app"
      ? "e.g. PhonePe"
      : kind === "account"
        ? "e.g. HDFC Savings"
        : "e.g. Subscriptions";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Add, edit, or remove options for this dropdown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {kind === "category" && (
            <MultiTab
              variant="secondary"
              items={CATEGORY_GROUPS}
              value={draftGroup}
              onValueChange={(v) => setDraftGroup(v as CategoryGroup)}
            />
          )}
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {kind === "category"
                ? `No ${draftGroup} categories yet.`
                : "No options yet."}
            </p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
              {items.map((item) => {
                const Icon =
                  kind === "category" ? getCategoryIcon(item.name) : null;
                const locked =
                  kind === "category" && item.name === INCOME_CATEGORY;
                const canDefault =
                  kind === "app" ||
                  kind === "account" ||
                  (kind === "category" && !locked);
                const isDefault =
                  (kind === "app" && prefs.defaultAppId === item.id) ||
                  (kind === "account" && prefs.defaultAccountId === item.id) ||
                  (kind === "category" &&
                    (resolveCategoryGroup(item) === "consumable"
                      ? prefs.defaultConsumableCategory
                      : prefs.defaultMaterialCategory) === item.name);
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    {Icon ? (
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">
                      {item.name}
                      {kind === "account" && "type" in item && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({item.type === "bank" ? "Bank" : "Credit card"})
                        </span>
                      )}
                      {kind === "category" && item.name !== INCOME_CATEGORY && (
                        <span className="ml-1 text-xs capitalize text-muted-foreground">
                          · {resolveCategoryGroup(item)}
                        </span>
                      )}
                      {isDefault && (
                        <span className="ml-1 text-xs font-medium text-yellow-600">
                          · Default
                        </span>
                      )}
                    </span>
                    {canDefault && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={isDefault ? "Default option" : "Set as default"}
                        aria-pressed={isDefault}
                        onClick={() => toggleDefault(item)}
                      >
                        <Star
                          className={cn(
                            "h-3.5 w-3.5",
                            isDefault
                              ? "fill-yellow-400 text-yellow-500"
                              : "text-muted-foreground"
                          )}
                        />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600"
                      disabled={locked}
                      onClick={() => handleDelete(item.id, item.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {editingId ? "Edit option" : "Add option"}
            </p>
            <div className="grid gap-2">
              <Input
                placeholder={placeholder}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
              {kind === "account" && (
                <Select
                  value={draftType}
                  onValueChange={(v) => setDraftType(v as AccountType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="credit_card">Credit card</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-1"
                onClick={handleSaveItem}
                disabled={!draftName.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
                {editingId ? "Update" : "Add"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel edit
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TxnPrefSelect({
  kind,
  label,
  value,
  onChange,
  placeholder,
}: {
  kind: "app" | "account";
  label: string;
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const { prefs } = useTxnPrefs();
  const [manageOpen, setManageOpen] = useState(false);

  const options = kind === "app" ? prefs.apps : prefs.accounts;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No options — tap edit to add
              </p>
            ) : (
              options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                  {kind === "account" && "type" in o && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {o.type === "bank" ? "Bank" : "Card"}
                    </span>
                  )}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Manage ${label}`}
          onClick={() => setManageOpen(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      <ManageOptionsDialog
        kind={kind}
        open={manageOpen}
        onOpenChange={setManageOpen}
        onPicked={onChange}
      />
    </div>
  );
}

/** Category dropdown — stores category name on the transaction. */
export function CategoryPrefSelect({
  value,
  onChange,
  group,
}: {
  value: string;
  onChange: (name: string) => void;
  /** When set, only categories in this consumable/material group are listed. */
  group?: CategoryGroup;
}) {
  const { prefs } = useTxnPrefs();
  const [manageOpen, setManageOpen] = useState(false);
  // Income is not a consumable/material category and is logged elsewhere, so it
  // is excluded here — kept only when it's the current value (editing old data).
  const raw = (prefs.categories ?? []).filter((c) => {
    if (c.name === INCOME_CATEGORY) return value === INCOME_CATEGORY;
    return !group || resolveCategoryGroup(c) === group;
  });
  const options = [
    ...raw.filter((c) => c.name === DEFAULT_CATEGORY),
    ...raw.filter(
      (c) => c.name !== DEFAULT_CATEGORY && c.name !== OTHER_CATEGORY
    ),
    ...raw.filter((c) => c.name === OTHER_CATEGORY),
  ];

  return (
    <div className="space-y-2">
      <Label>Category</Label>
      <div className="flex gap-2">
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {options.map((cat) => {
              const Icon = getCategoryIcon(cat.name);
              return (
                <SelectItem key={cat.id} value={cat.name}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {cat.name}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Manage categories"
          onClick={() => setManageOpen(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      <ManageOptionsDialog
        kind="category"
        open={manageOpen}
        onOpenChange={setManageOpen}
        onPicked={onChange}
      />
    </div>
  );
}
