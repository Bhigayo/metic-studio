import { useStudio } from "./studio";

export default function BrandPage() {
  const studio = useStudio();
  const sections = studio.data.brand;

  const change = (index: number, field: "title" | "body", value: string) =>
    studio.updateBrand(sections.map((s, i) => (i === index ? { ...s, [field]: value } : s)));

  return (
    <div className="page narrow">
      <header className="page-head">
        <div>
          <p className="eyebrow">The rules every piece follows</p>
          <h1>Brand</h1>
        </div>
      </header>

      <div className="brand-sections">
        {sections.map((section, i) => (
          <section key={i} className="brand-section">
            <div className="brand-section-head">
              <input
                className="brand-title"
                value={section.title}
                onChange={(e) => change(i, "title", e.target.value)}
                aria-label="Section title"
              />
              <button
                className="text-button muted"
                onClick={() => studio.updateBrand(sections.filter((_, n) => n !== i))}
                aria-label={`Remove ${section.title}`}
              >
                Remove
              </button>
            </div>
            <textarea
              value={section.body}
              rows={Math.max(2, section.body.split("\n").length + 1)}
              onChange={(e) => change(i, "body", e.target.value)}
              aria-label={`${section.title} details`}
            />
          </section>
        ))}
      </div>
      <button className="add-section" onClick={() => studio.updateBrand([...sections, { title: "New section", body: "" }])}>
        + Add a section
      </button>
    </div>
  );
}
