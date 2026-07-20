import Image from "next/image";
import Link from "next/link";
import { sections } from "@/lib/sections";

export default function Home() {
  return (
    <main>
      <div className="container">
        <header>
          <h1>🎓 Claude API Course Playground</h1>
          <p>
            A hands-on companion to Anthropic&apos;s &quot;Building with the
            Claude API&quot; course. Each card below is one section of the
            curriculum, turned into something you can click and try.
          </p>
        </header>

        <div className="section-grid">
          {sections.map((section) => {
            const clickable = section.status !== "planned";
            const card = (
              <div
                className={`section-card${clickable ? "" : " disabled"}`}
              >
                {section.image && (
                  <div className="section-card-image">
                    <Image
                      src={section.image}
                      alt={section.title}
                      width={1408}
                      height={768}
                    />
                  </div>
                )}
                <h2>{section.title}</h2>
                <p>{section.tagline}</p>
                <ul>
                  {section.concepts.map((concept) => (
                    <li key={concept}>{concept}</li>
                  ))}
                </ul>
              </div>
            );

            return clickable ? (
              <Link
                key={section.id}
                href={section.href}
                className="section-card-link"
              >
                {card}
              </Link>
            ) : (
              <div key={section.id}>{card}</div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
