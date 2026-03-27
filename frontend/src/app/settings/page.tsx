"use client";

import { useState } from "react";
import { useUser } from "@/lib/user-context";
import { updateMe } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { currentUser, isLoggedIn, refreshUser } = useUser();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: currentUser.name || "",
    company: currentUser.company || "",
    bio: "",
    avatar_url: currentUser.avatar_url || "",
  });

  const update = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMe(form);
      await refreshUser();
      setSaved(true);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-950">Settings</h1>
        <p className="text-sm text-surface-600 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <Card className="!p-6 space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={currentUser.name} size="xl" src={currentUser.avatar_url} />
          <div>
            <h3 className="text-lg font-semibold text-surface-950">{currentUser.name}</h3>
            <Badge variant="outline" size="sm">{currentUser.role}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name" value={form.name} onChange={(e) => update("name", e.target.value)} />
          <Input label="Company" value={form.company} onChange={(e) => update("company", e.target.value)} />
        </div>
        <Textarea label="Bio" placeholder="Tell us about yourself..." value={form.bio} onChange={(e) => update("bio", e.target.value)} />
        <Input label="Avatar URL" placeholder="https://..." value={form.avatar_url} onChange={(e) => update("avatar_url", e.target.value)} />

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {saved && <span className="text-sm text-emerald-400">Saved successfully</span>}
        </div>
      </Card>

      {/* Account info */}
      <Card className="!p-6">
        <h3 className="text-sm font-semibold text-surface-950 mb-4">Account</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-surface-600">Email</span>
            <span className="text-surface-950">{currentUser.email || "demo@launchdeck.app"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600">Role</span>
            <Badge variant="brand" size="sm">{currentUser.role}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600">Member since</span>
            <span className="text-surface-950">{currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString() : "N/A"}</span>
          </div>
        </div>
      </Card>

      {!isLoggedIn && (
        <Card className="!p-6 !border-amber-500/20 !bg-amber-500/5">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">Demo Mode</h3>
          <p className="text-xs text-surface-600">
            You are using a demo account. Sign up to save your preferences and unlock full features.
          </p>
        </Card>
      )}
    </div>
  );
}
