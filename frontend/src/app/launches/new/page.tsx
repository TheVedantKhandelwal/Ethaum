"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useUser } from "@/lib/user-context";
import { createProductAndLaunch, previewLaunchContent } from "@/lib/api";

const CATEGORIES = ["DevTools", "Analytics", "Security", "AI/ML", "Sales", "Marketing", "Infrastructure", "Collaboration", "Finance"];
const STAGES = ["seed", "A", "B", "C", "D"];

export default function NewLaunchPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    website: "",
    category: "DevTools",
    stage: "seed",
    features: "",
    arr_range: "",
  });

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const handlePreview = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await previewLaunchContent({
        product_name: form.name,
        features: { list: form.features.split(",").map(f => f.trim()).filter(Boolean) },
      });
      setPreview(data);
      setStep(2);
    } catch (e: any) {
      setError(e.message || "Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await createProductAndLaunch({
        name: form.name,
        tagline: form.tagline || preview?.tagline,
        description: form.description || preview?.description,
        website: form.website,
        category: form.category,
        stage: form.stage,
        arr_range: form.arr_range,
        features: { list: form.features.split(",").map(f => f.trim()).filter(Boolean) },
      });
      router.push("/launches");
    } catch (e: any) {
      setError(e.message || "Failed to create launch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-950">Submit a Launch</h1>
        <p className="text-sm text-surface-600 mt-1">Create your product and launch it with AI-enhanced content</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              step >= s ? "bg-brand-600 text-white" : "bg-surface-300 text-surface-600"
            }`}>
              {s}
            </div>
            <span className={`text-sm font-medium ${step >= s ? "text-surface-950" : "text-surface-600"}`}>
              {s === 1 ? "Product Details" : "Preview & Launch"}
            </span>
            {s < 2 && <div className={`h-px w-12 ${step > s ? "bg-brand-500" : "bg-surface-300"}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">{error}</div>
      )}

      {step === 1 && (
        <Card className="!p-6 space-y-4">
          <Input label="Product Name" placeholder="My Awesome Tool" value={form.name} onChange={(e) => update("name", e.target.value)} required />
          <Input label="Tagline" placeholder="One-line description" value={form.tagline} onChange={(e) => update("tagline", e.target.value)} />
          <Textarea label="Description" placeholder="Tell us about your product..." value={form.description} onChange={(e) => update("description", e.target.value)} />
          <Input label="Website" placeholder="https://example.com" value={form.website} onChange={(e) => update("website", e.target.value)} />
          <Input label="Features (comma-separated)" placeholder="AI analytics, Slack integration, API" value={form.features} onChange={(e) => update("features", e.target.value)} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-surface-800">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => update("category", c)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      form.category === c ? "bg-brand-600/15 text-brand-400 border border-brand-500/30" : "text-surface-700 border border-surface-400 hover:bg-surface-200"
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-surface-800">Stage</label>
              <div className="flex gap-1.5">
                {STAGES.map((s) => (
                  <button key={s} type="button" onClick={() => update("stage", s)}
                    className={`rounded-lg px-3 py-1 text-xs font-medium uppercase transition-colors ${
                      form.stage === s ? "bg-brand-600/15 text-brand-400 border border-brand-500/30" : "text-surface-700 border border-surface-400 hover:bg-surface-200"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Input label="ARR Range" placeholder="e.g. $1M-$5M" value={form.arr_range} onChange={(e) => update("arr_range", e.target.value)} />

          <div className="flex justify-end">
            <Button onClick={handlePreview} disabled={!form.name || loading}>
              {loading ? "Generating AI Preview..." : "Preview with AI"}
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && preview && (
        <div className="space-y-4">
          <Card className="!p-6 !border-brand-500/20 !bg-brand-950/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <h3 className="text-sm font-semibold text-brand-400">AI-Generated Content</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-surface-600 mb-1">Tagline</p>
                <p className="text-sm font-medium text-surface-950">{preview.tagline}</p>
              </div>
              <div>
                <p className="text-xs text-surface-600 mb-1">Description</p>
                <p className="text-sm text-surface-800">{preview.description}</p>
              </div>
            </div>
          </Card>

          <Card className="!p-6">
            <h3 className="text-sm font-semibold text-surface-950 mb-3">Launch Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-surface-600">Name:</span> <span className="text-surface-950">{form.name}</span></div>
              <div><span className="text-surface-600">Category:</span> <Badge variant="brand" size="sm">{form.category}</Badge></div>
              <div><span className="text-surface-600">Stage:</span> <Badge variant="outline" size="sm">{form.stage}</Badge></div>
              <div><span className="text-surface-600">Website:</span> <span className="text-surface-950">{form.website || "N/A"}</span></div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Launching..." : "Launch Now"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
