import { BrandMark } from '@sharpit/ui/components/ui/brand-mark';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // `overflow-x-clip`, never `hidden`: as soon as one axis stops being `visible`,
  // the used value of the other becomes `auto`, and this element turns into the
  // nearest scrollport every sticky descendant resolves against. It grows with
  // content instead of scrolling, so the step's sticky header and its docked
  // action bar never engage. `clip` crops identically without creating a
  // scroll container.
  return (
    <div className="bg-background relative flex min-h-dvh flex-col items-center overflow-x-clip px-6 py-6 sm:py-10">
      {/* Flex column so each step can own a docked action bar without viewport math. */}
      <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col gap-5 sm:gap-6">
        <header className="flex items-center gap-2">
          <div className="brand-tile size-7" aria-hidden>
            <BrandMark className="size-4" />
          </div>
          <p className="text-section-title">SharpIt</p>
        </header>
        {children}
      </div>
    </div>
  );
}
