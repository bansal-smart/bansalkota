import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content_html: string;
  author_name: string | null;
  published_at: string | null;
  tags: string[];
};

const BlogDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      setPost(data as Post | null);
      setLoading(false);
      if (data) {
        // best-effort view counter
        void supabase.rpc("increment_blog_view" as any, { post_slug: slug } as any).then(() => {}, () => {});
      }
    })();
  }, [slug]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!post) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">Post not found.</p>
      <Link to="/blog" className="text-primary font-bold mt-3 inline-block">← Back to blog</Link>
    </div>
  );

  return (
    <article className="container mx-auto px-4 py-10 max-w-3xl">
      <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4" /> All posts
      </Link>
      <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3">{post.title}</h1>
      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6">
        <span>{post.author_name ?? "Bansal Classes"}</span>
        {post.published_at && <><span>•</span><span>{new Date(post.published_at).toLocaleDateString()}</span></>}
      </div>
      {post.cover_image_url && (
        <img src={post.cover_image_url} alt={post.title} className="w-full aspect-video object-cover rounded-2xl mb-8" />
      )}
      <div
        className="prose prose-neutral max-w-none prose-headings:font-black prose-img:rounded-xl"
        dangerouslySetInnerHTML={{ __html: post.content_html }}
      />
      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-8">
          {post.tags.map((t) => (
            <span key={t} className="text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground">#{t}</span>
          ))}
        </div>
      )}
    </article>
  );
};

export default BlogDetailPage;
