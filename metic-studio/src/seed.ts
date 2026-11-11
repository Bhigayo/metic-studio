// Starting content: Metic's existing drops and ideas, so the studio isn't empty on day one.
// Everything here can be edited or deleted in the app.

import { makeDrop, makeNote, makeProduct, type StudioData } from "./model";

export function seedData(): StudioData {
  const ws01 = makeDrop({
    name: "World Series 01",
    theme: "The first chapter. Three women's pieces named after tennis shots.",
    status: "launched",
    sort: 1,
  });
  const uni = makeDrop({
    name: "The Uni Drop",
    theme: "Lead with the statement tee for the start of uni in Birmingham. Socks follow as a separate drop.",
    status: "in progress",
    sort: 2,
  });
  const ws02 = makeDrop({
    name: "World Series 02",
    theme: "Clubhouse. Electric blue colourway, with a pinstripe jersey as the hero piece.",
    status: "planning",
    sort: 3,
  });
  const ws03 = makeDrop({
    name: "World Series 03",
    theme:
      "Concept stage. Mood board: Fuel & Glory, The Couture Club, RedRoom, graffiti tag tees, a Monaco F1 tee, a KAI ringer tee and a bedazzled denim cap. Split ideas across the Quiet and Loud recipes.",
    status: "planning",
    sort: 4,
  });
  const places = makeDrop({
    name: "Places Series",
    theme: "The quiet side of Metic. Pieces about places that matter, such as the National Theatre in Lagos.",
    status: "planning",
    sort: 5,
  });
  const aw26 = makeDrop({
    name: "Autumn / Winter 2026",
    theme:
      "Built for a colder tomorrow. Maroon, rose, chocolate and cream, shot against Birmingham streets. Same streets, different dreams. Layer different, move the same.",
    status: "planning",
    sort: 0,
  });
  const titi = makeDrop({
    name: "Titi's Closet",
    theme: "The feminine sub-line, with its own Flow M script mark.",
    status: "planning",
    sort: 6,
  });

  const products = [
    makeProduct({ drop_id: ws01.id, name: "The Rally", type: "Tank top", side: "quiet", stage: "launched" }),
    makeProduct({ drop_id: ws01.id, name: "The Drop Shot", type: "Baby tee", side: "quiet", stage: "launched", colourways: ["White"] }),
    makeProduct({ drop_id: ws01.id, name: "The Ace", type: "Baby tee", side: "quiet", stage: "launched", colourways: ["Black"] }),
    makeProduct({
      drop_id: uni.id,
      name: "My Home Girl Is Cooler Than Yours",
      type: "Tee",
      side: "loud",
      stage: "mockup",
      colourways: ["Dusty pink"],
      notes: "Heavy oversized fit with a large, bold front print. Spicy Thoughts recipe.",
    }),
    makeProduct({ drop_id: ws02.id, name: "Pinstripe jersey", type: "Jersey", side: "quiet", stage: "idea", colourways: ["Electric blue"], notes: "Hero piece for the Clubhouse drop." }),
    makeProduct({
      drop_id: ws02.id,
      name: "Metic socks",
      type: "Socks",
      side: "both",
      stage: "idea",
      supplier: "VeloxSoles (Alibaba), contact Mia Taylor",
      notes: "In talks with the manufacturer. Planned as a follow-up drop after the statement tee.",
    }),
    makeProduct({ drop_id: ws02.id, name: "Embroidered patches", type: "Patch", side: "quiet", stage: "idea" }),
    makeProduct({ drop_id: ws02.id, name: "Canvas tote", type: "Tote", side: "quiet", stage: "idea" }),
    makeProduct({
      drop_id: null,
      name: "Loud cap",
      type: "Cap",
      side: "loud",
      stage: "sketch",
      supplier: "Raptor Printing (DTF, embroidery, hat blanks)",
      notes:
        "Built around the Metic oval logo, loud through bold embroidery or graphic detail. References: Yankees flame cap, BOETTI chenille plaid cap, New Era corduroy pack. Keep it easy and cheap to sample.",
    }),
  ];

  // The Autumn / Winter 2026 mockup boards, made in ChatGPT
  const aw = (name: string, type: string, side: "quiet" | "loud", colourways: string[], notes: string) =>
    makeProduct({ drop_id: aw26.id, name, type, side, stage: "mockup", colourways, notes });
  products.push(
    aw("Varsity Jacket", "Jacket", "quiet", ["Chocolate", "Black", "Cream"], "Tradition reimagined. Premium materials. A quieter statement, a louder presence."),
    aw("A Softer Tomorrow", "Knit", "quiet", ["Rose to maroon gradient"], "Gradient knit zip jacket. Texture in motion. A quieter statement, a louder presence."),
    aw("The Funnel Neck Knit", "Knit", "quiet", ["Chocolate"], "Structured warmth. Refined details. A higher standard for everyday."),
    aw("The Graphic Tee Collection", "Tee", "loud", ["Cream", "Pink", "Chocolate"], "Statement graphics, everyday fits. A modern essential for a brighter tomorrow."),
    aw("The Sculpt Two-Piece Set", "Set", "loud", ["Maroon and pink"], "Contoured, colourful, confident. Top and flared trousers."),
    aw("Wool Overcoat 001", "Coat", "quiet", ["Maroon", "Cream panels"], "Built for a colder tomorrow. Same streets, different seasons."),
    aw("Track Jacket 001", "Jacket", "loud", ["Rose", "Maroon"], "Large metic graphic across the back."),
    aw("Technical Shell Jacket 001", "Jacket", "loud", ["Rose", "Maroon"], "All conditions. Further places. Hooded, with a large back graphic."),
    aw("Knit Sweater 001", "Knit", "quiet", ["Pink", "Maroon", "Cream"], "Warmer days ahead. Star motif on the front."),
    aw("Heavyweight Sweatpants 001", "Sweatpants", "quiet", ["Grey marl"], "Built for colder tomorrows."),
    aw("Sherpa / Borg Jacket 001", "Jacket", "quiet", ["Chocolate"], "Built for colder tomorrows."),
    aw("Heavy Overshirt 001", "Overshirt", "quiet", ["Chocolate and cream", "Maroon and cream"], "Two versions: built for colder tomorrows, and layered for more than seasons."),
  );

  const notes = [
    makeNote("Lagos-exclusive pieces: make and sell selected products in Lagos first, then bring the winners to the UK.", [], "both"),
  ];

  const brand = [
    { title: "Tagline", body: "Quiet Souls. Loud Visions." },
    { title: "Who we are", body: "Dual heritage, filtered through tennis culture and quiet ambition. Each collection is a numbered chapter in the World Series." },
    {
      title: "Two recipes",
      body: "Quiet: Club 1984. Premium and restrained, like the Places Series.\nLoud: Spicy Thoughts. Oversized and statement-first, like the Home Girl tee.",
    },
    { title: "Naming", body: "Tennis terms: The Rally, The Drop Shot, The Ace, The Baseline, The Serve, The Tiebreak, The Seed." },
    { title: "Pricing", body: "£30 to £38, in clean numbers. Never .99." },
    {
      title: "Logos",
      body:
        "Main logo: metic ✦, the bold slanted wordmark with the four-point star beside it.\nFull lockup: metic ✦ with APPAREL spaced underneath, for tags and packaging.\nIcon: the star on its own, for buttons, zip pulls, knit motifs and small embroidery.\nQuiet mark: M E T I C, spaced capitals, small and tone-on-tone.\nTiti's Closet: Flow M script mark.\nRetired: the Star M and the gothic MA monogram.",
    },
    { title: "Suppliers", body: "Blanks: Absolute Apparel, Tapstitch.\nPrinting and embroidery: Raptor Printing.\nSocks: VeloxSoles." },
    { title: "Packaging", body: "Custom tissue paper, frosted ziplock bags, manifesto cards and a word search insert." },
  ];

  return { drops: [aw26, ws01, uni, ws02, ws03, places, titi], products, notes, brand };
}
