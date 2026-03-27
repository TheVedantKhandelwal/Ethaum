"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, ArrowLeft, Rocket } from "lucide-react";
import { StepIndicator } from "@/components/ui/step-indicator";
import { TagInput } from "@/components/ui/tag-input";
import { Card } from "@/components/ui/card";
import { previewLaunchContent, createProductAndLaunch } from "@/lib/api";
import { useUser } from "@/lib/user-context";

const STEPS = ["Product Info", "Launch Details", "AI Preview", "Confirm"];
const CATEGORIES = ["DevTools", "Analytics", "Security", "AI/ML", "Infrastructure", "Sales", "Collaboration"];
const STAGES = ["seed", "A", "B", "C", "D"];

export function LaunchWizard() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Product fields
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState("");
  const [website, setWebsite] = useState("");
  const [features, setFeatures] = useState<string[]>([]);

  // Launch fields
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");

  // AI preview
  const [aiTagline, setAiTagline] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [useAiTagline, setUseAiTagline] = useState(false);
  const [useAiDescription, setUseAiDescription] = useState(false);

  const canNext = () => {
    if (step === 0) return productName.trim().length > 0;
    if (step === 1) return title.trim().length > 0;
    return true;
  };

  const handleNext = async () => {
    if (step === 1) {
      // Moving to AI preview — fetch AI content
      setLoading(true);
      setError("");
      try {
        const preview = await previewLaunchContent({
          product_name: productName,
          features: features.length > 0 ? features : null,
        });
        setAiTagline(preview.ai_tagline);
        setAiDescription(preview.ai_description);
      } catch {
        setAiTagline(`${productName} — Supercharge your workflow`);
        setAiDescription(`${productName} helps teams work smarter. Built for modern teams looking to scale efficiently.`);
      } finally {
        setLoading(false);
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await createProductAndLaunch({
        product_name: productName,
        category: category || null,
        stage: stage || null,
        website: website || null,
        features: features.length > 0 ? features : null,
        user_id: currentUser.id,
        title,
        tagline: useAiTagline ? aiTagline : tagline || null,
        description: useAiDescription ? aiDescription : description || null,
      });
      router.push("/launches");
    } catch (e: any) {
      setError(e.message || "Failed to create launch");
    } finally {
      setLoading(false);
    }
  };

  const finalTagline = useAiTagline ? aiTagline : tagline;
  const finalDescription = useAiDescription ? aiDescription : description;

  const labelClass = "block text-sm font-medium text-gray-700";
  const inputClass = "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div>
      <StepIndicator steps={STEPS} current={step} />

      <div className="mt-6">
        {/* Step 1: Product Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Product Name *</label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className={inputClass} placeholder="e.g. Vortex AI" />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputClass}>
                <option value="">Select stage</option>
                {STAGES.map((s) => <option key={s} value={s}>Series {s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} placeholder="https://..." />
            </div>
            <div>
              <label className={labelClass}>Features</label>
              <TagInput tags={features} onChange={setFeatures} placeholder="Add features..." />
            </div>
          </div>
        )}

        {/* Step 2: Launch Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Launch Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder={`Introducing ${productName}`} />
            </div>
            <div>
              <label className={labelClass}>Tagline</label>
              <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} placeholder="One-line description (AI can generate this)" />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClass} placeholder="Tell us about your product (AI can enhance this)" />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
              <Sparkles className="h-4 w-4" />
              <span>AI will generate an alternative tagline &amp; description in the next step</span>
            </div>
          </div>
        )}

        {/* Step 3: AI Preview */}
        {step === 2 && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">Compare your content with AI-generated alternatives. Pick what works best.</p>

            {/* Tagline comparison */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Tagline</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUseAiTagline(false)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    !useAiTagline ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="mb-1 block text-xs font-medium text-gray-500">Yours</span>
                  {tagline || <span className="italic text-gray-400">Not provided</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setUseAiTagline(true)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    useAiTagline ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="mb-1 flex items-center gap-1 text-xs font-medium text-brand-600">
                    <Sparkles className="h-3 w-3" /> AI Generated
                  </span>
                  {aiTagline}
                </button>
              </div>
            </div>

            {/* Description comparison */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Description</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUseAiDescription(false)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    !useAiDescription ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="mb-1 block text-xs font-medium text-gray-500">Yours</span>
                  {description || <span className="italic text-gray-400">Not provided</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setUseAiDescription(true)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    useAiDescription ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="mb-1 flex items-center gap-1 text-xs font-medium text-brand-600">
                    <Sparkles className="h-3 w-3" /> AI Generated
                  </span>
                  {aiDescription}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 3 && (
          <div>
            <Card className="border-brand-200 bg-brand-50/50">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="font-medium text-gray-500">Product:</span>
                  <span className="text-gray-900">{productName}</span>
                </div>
                {category && (
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-500">Category:</span>
                    <span className="text-gray-900">{category}</span>
                  </div>
                )}
                {stage && (
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-500">Stage:</span>
                    <span className="text-gray-900">Series {stage}</span>
                  </div>
                )}
                {features.length > 0 && (
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-500">Features:</span>
                    <span className="text-gray-900">{features.join(", ")}</span>
                  </div>
                )}
                {finalTagline && (
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-500">Tagline:</span>
                    <span className="text-gray-900">{finalTagline}</span>
                  </div>
                )}
                {finalDescription && (
                  <div className="mt-2">
                    <span className="font-medium text-gray-500">Description:</span>
                    <p className="mt-1 text-gray-900">{finalDescription}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Error */}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:invisible"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canNext() || loading}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Next"} {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Launching..." : "Launch"} {!loading && <Rocket className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
