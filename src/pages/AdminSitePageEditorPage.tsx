import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RichTextEditor from "@/components/RichTextEditor";

type Props = { slug: string; heading: string };

const AdminSitePageEditorPage = ({ slug, heading }: Props) => {
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("site_pages")
        .select("title,content_html,updated_at")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (error) toast.error(error.message);
      if (data) {
        setTitle(data.title ?? "");
        setContentHtml(data.content_html ?? "");
        setUpdatedAt(data.updated_at ?? null);
      } else {
        setTitle(heading);
        setContentHtml("");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, heading]);

  const save = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("site_pages")
      .upsert(
        {
          slug,
          title: title.trim(),
          content_html: contentHtml,
          updated_by: u?.user?.id ?? null,
        },
        { onConflict: "slug" }
      )
      .select("updated_at")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setUpdatedAt(data?.updated_at ?? null);
    toast.success("Saved");
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-2xl font-black">{heading}</h1>
        <p className="text-sm text-muted-foreground">
          Edit the public <code>/{slug}</code> page. Changes go live immediately.
          {updatedAt && (
            <span className="ml-2 text-xs">
              Last updated {new Date(updatedAt).toLocaleString()}
            </span>
          )}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Page title</label>
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Page title"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Content</label>
        <RichTextEditor
          value={contentHtml}
          onChange={setContentHtml}
          placeholder="Write the page content here…"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
        </button>
      </div>
    </div>
  );
};

export default AdminSitePageEditorPage;
