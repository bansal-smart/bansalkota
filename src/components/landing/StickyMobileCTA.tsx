export default function StickyMobileCTA({ label }: { label: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
      <a
        href="#lead-form"
        className="flex h-12 w-full items-center justify-center rounded-md bg-primary text-base font-bold text-primary-foreground shadow-lg"
      >
        {label}
      </a>
    </div>
  );
}
