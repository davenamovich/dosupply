/**
 * Scripted customer turns for the demo. They are fed through the real chat
 * API, so each one exercises the live engine, lead store and alert service.
 */
export type Scenario = { id: string; title: string; blurb: string; lines: string[] };

export const SCENARIOS: Scenario[] = [
  {
    id: "exact",
    title: "Exact part number",
    blurb: "A buyer knows precisely what they need.",
    lines: ["Hi, I need 3 of 1756-L83E", "Refurbished is fine", "dana.reyes@brightpack.com", "Dana Reyes, BrightPack Foods, 919-555-0188"],
  },
  {
    id: "manufacturer",
    title: "Only knows the manufacturer",
    blurb: "\"I need a Siemens HMI\" and not much else.",
    lines: ["I need a Siemens HMI", "Not sure, it's for a packaging line", "2", "No preference", "marcus@northgatefab.com", "Marcus Webb at Northgate Fabrication"],
  },
  {
    id: "obsolete",
    title: "Hard-to-find obsolete part",
    blurb: "A legacy processor that has to be sourced.",
    lines: ["Do you have a 1747-L542?", "1", "Used or refurbished works", "ops@riverbendmills.com", "Sam Ortiz, Riverbend Mills"],
  },
  {
    id: "multi",
    title: "Multiple parts in one quote",
    blurb: "Two part numbers with their own quantities.",
    lines: ["Need a quote on 2 of 1756-L83E and 10 of 1756-IB16", "New", "purchasing@halvorsonplastics.com", "Pat Halvorson, Halvorson Plastics"],
  },
  {
    id: "replacement",
    title: "Replacement request",
    blurb: "An aging controller, and no claims of interchangeability.",
    lines: ["I need a replacement for a 1756-L73", "2", "No preference", "eng@copperridge.com", "Eve Kim from Copper Ridge Mining"],
  },
  {
    id: "human",
    title: "Wants to talk to sales",
    blurb: "Skips the questions and asks for a person.",
    lines: ["I'd rather talk to a sales rep", "lee@parkfreight.com", "Lee Park, Park Freight Systems, 984-555-0134"],
  },
];
