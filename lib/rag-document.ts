// Sample source document for the RAG section. Stands in for an 800-page
// financial filing — a condensed 10-K-style excerpt with labeled sections.
// Each section becomes one structure-based chunk (see lib/rag.ts).

export interface DocumentSection {
  heading: string;
  body: string;
}

export const SAMPLE_DOCUMENT: DocumentSection[] = [
  {
    heading: "Business Overview",
    body: "Northwind Robotics, Inc. designs and manufactures autonomous warehouse robots and the fleet-management software that coordinates them. The company sells primarily to large logistics and e-commerce operators under multi-year subscription contracts. Revenue is concentrated in North America, with a growing presence in Western Europe. As of the fiscal year end, the company employed 2,400 people across four facilities.",
  },
  {
    heading: "Risk Factors",
    body: "Our business faces several material risks. Customer concentration is significant: our three largest customers account for 58% of annual revenue, and the loss of any one would materially harm results. We depend on a limited number of suppliers for high-precision motors and lidar sensors, and supply chain disruptions have in the past delayed shipments. We operate in a highly competitive market where larger competitors have greater financial resources. Rapid technological change may render our products obsolete. We are subject to evolving safety regulations governing autonomous machinery, and non-compliance could result in fines or product recalls. Cybersecurity incidents affecting our fleet software could damage customer trust.",
  },
  {
    heading: "Management Discussion and Analysis",
    body: "Total revenue grew 34% year over year to $412 million, driven by expansion within existing accounts and eleven new enterprise customers. Gross margin improved to 61% from 55% as manufacturing scaled. Operating expenses rose 22%, reflecting continued investment in research and development. The company reported its first full year of positive operating cash flow. Management expects revenue growth to moderate to the low-twenties percentage range as the base of business grows.",
  },
  {
    heading: "Financial Statements",
    body: "Cash and cash equivalents totaled $180 million at year end. Total assets were $690 million against total liabilities of $310 million, leaving stockholders' equity of $380 million. Net income was $28 million, compared with a net loss of $9 million in the prior year. Deferred revenue, reflecting prepaid subscription contracts, stood at $120 million. The company carries no long-term debt.",
  },
  {
    heading: "Legal Proceedings",
    body: "The company is party to a patent-infringement lawsuit filed by a competitor alleging that our navigation system infringes two patents. We believe the claims are without merit and intend to defend vigorously. A former supplier has filed a breach-of-contract claim seeking $4 million in damages. Management does not currently expect these matters to have a material adverse effect on the company's financial position.",
  },
  {
    heading: "Corporate Governance",
    body: "The board of directors comprises nine members, seven of whom are independent. The audit, compensation, and nominating committees are each composed entirely of independent directors. The roles of chief executive officer and board chair are separated. Directors stand for election annually. The company maintains a code of business conduct applicable to all employees and directors.",
  },
];
