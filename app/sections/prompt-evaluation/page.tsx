import SectionNav from "@/components/SectionNav";

export default function PromptEvaluationPage() {
  return (
    <main>
      <div className="container">
        <SectionNav />
        <header>
          <h1>🧪 Section 2: Prompt Evaluation</h1>
          <p>
            Not built yet — this section will demonstrate how to test
            Claude&apos;s outputs systematically instead of eyeballing them.
          </p>
        </header>

        <div className="coming-soon-box">
          <h3>What this section will cover</h3>
          <ul>
            <li>
              Writing a set of test cases (input + expected criteria) for a
              single prompt
            </li>
            <li>Running the same prompt against every test case</li>
            <li>
              Grading responses — exact match, rubric-based scoring, or
              model-graded evals (Claude judging Claude&apos;s own output)
            </li>
            <li>
              Comparing two prompt variants side-by-side to see which one
              passes more test cases
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
