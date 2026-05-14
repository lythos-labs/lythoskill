#!/usr/bin/env node
/**
 * Cookie Recipe Report — Designed Artifact
 *
 * Theme: Golden Hour (theme-factory)
 *   Mustard Yellow #f4a900 — primary accent
 *   Terracotta #c1666b   — warm secondary
 *   Warm Beige #d4b896    — backgrounds
 *   Chocolate Brown #4a403a — dark text / anchors
 *
 * Design methodology: brand-guidelines (consistent typography,
 * accent rotation, smart color selection) + frontend-design
 * (distinctive aesthetic, bold choices, memorable details)
 */

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, TabStopType, TabStopPosition, ImageRun
} = require("docx");

// ─── Theme Palette ───────────────────────────────────────────────
const C = {
  mustard:    "F4A900",
  terracotta: "C1666B",
  beige:      "D4B896",
  chocolate:  "4A403A",  // renamed for docx hex (no #)
  cream:      "FDFBF7",
  white:      "FFFFFF",
  darkBeige:  "C4A886",
  textDark:   "3D3530",
  textBody:   "5C534B",
};

// helpers
const border = (color) => ({ style: BorderStyle.SINGLE, size: 1, color });
const borders = (color) => ({ top: border(color), bottom: border(color), left: border(color), right: border(color) });
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

// ─── Reusable Components ─────────────────────────────────────────

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, color: C.chocolate, font: "Arial" })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, color: C.terracotta, font: "Arial" })],
  });
}

function bodyP(text) {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    children: [new TextRun({ text, size: 22, color: C.textBody, font: "Georgia" })],
  });
}

function bodyPWithAccent(parts) {
  // parts: array of { text, bold?, color?, italic? }
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    children: parts.map(p => new TextRun({
      text: p.text, size: 22, font: p.italic ? "Georgia" : "Georgia",
      color: p.color || C.textBody, bold: !!p.bold, italics: !!p.italic,
    })),
  });
}

function accentRule() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: C.mustard, space: 1 },
    },
    children: [],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── Cover Page Section ──────────────────────────────────────────

function buildCoverSection() {
  return {
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children: [
      // Top decorative band
      new Paragraph({ spacing: { before: 0 }, children: [] }),
      new Paragraph({
        spacing: { before: 600 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: C.mustard, space: 1 } },
        children: [],
      }),
      new Paragraph({ spacing: { before: 200 }, children: [] }),

      // Spacer
      new Paragraph({ spacing: { before: 1200 }, children: [] }),

      // Main title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "THE PERFECT", size: 52, bold: true, color: C.mustard, font: "Arial" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: "CHOCOLATE CHIP", size: 52, bold: true, color: C.chocolate, font: "Arial" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "COOKIE", size: 52, bold: true, color: C.terracotta, font: "Arial" })],
      }),

      // Subtitle
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({
          text: "A Scientific Approach to the Classic Recipe",
          size: 26, color: C.textDark, font: "Georgia", italics: true,
        })],
      }),

      // Decorative divider
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 80 },
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.mustard, space: 8 } },
        children: [],
      }),

      new Paragraph({ spacing: { before: 1200 }, children: [] }),

      // Bottom section: Baker's Percentages teaser + details
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "Featuring Baker's Percentages", size: 24, color: C.textBody, font: "Georgia", italics: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "5-Dimension Radar Analysis", size: 24, color: C.textBody, font: "Georgia", italics: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "Food Science Explanations", size: 24, color: C.textBody, font: "Georgia", italics: true })],
      }),

      new Paragraph({ spacing: { before: 800 }, children: [] }),

      // Bottom golden rule
      new Paragraph({
        spacing: { before: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: C.terracotta, space: 1 } },
        children: [],
      }),
    ],
  };
}

// ─── Baker's Percentages Table ───────────────────────────────────

function buildBakersTable() {
  const rows = [
    { ingredient: "All-Purpose Flour", pct: "100%", weight: "280 g", role: "Structure backbone; gluten network formation" },
    { ingredient: "Unsalted Butter (browned)", pct: "80%", weight: "225 g", role: "Tenderness, flavor (Maillard from browning), spread control" },
    { ingredient: "Light Brown Sugar", pct: "75%", weight: "210 g", role: "Moisture retention (hygroscopic), chewiness, molasses flavor" },
    { ingredient: "Granulated Sugar", pct: "50%", weight: "140 g", role: "Crisp edges, caramelization, aeration during creaming" },
    { ingredient: "Eggs (~2 large)", pct: "25%", weight: "70 g", role: "Emulsifier (lecithin), structure via protein coagulation" },
    { ingredient: "Vanilla Extract", pct: "2%", weight: "6 g", role: "Aroma complexity; amplifies chocolate perception" },
    { ingredient: "Baking Soda", pct: "1.5%", weight: "4 g", role: "Leavening; promotes Maillard browning (alkaline pH)" },
    { ingredient: "Sea Salt (flake)", pct: "1%", weight: "3 g", role: "Flavor enhancer; suppresses bitterness, heightens sweet" },
    { ingredient: "Dark Chocolate (70% wafers)", pct: "120%", weight: "335 g", role: "Primary flavor; chip matrix distribution, melt viscosity" },
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cell("Ingredient", C.chocolate, true, 2600),
      cell("Baker's %", C.chocolate, true, 1300),
      cell("Weight", C.chocolate, true, 1100),
      cell("Scientific Role", C.chocolate, true, 4360),
    ],
  });

  const dataRows = rows.map((r, i) => {
    const bg = i % 2 === 0 ? C.cream : C.white;
    return new TableRow({
      children: [
        cell(r.ingredient, C.textDark, true, 2600, bg, i === rows.length - 1 ? "000000" : "E6D5B8"),
        cell(r.pct, C.terracotta, true, 1300, bg, i === rows.length - 1 ? "000000" : "E6D5B8"),
        cell(r.weight, C.textBody, false, 1100, bg, i === rows.length - 1 ? "000000" : "E6D5B8"),
        cell(r.role, C.textBody, false, 4360, bg, i === rows.length - 1 ? "000000" : "E6D5B8", true),
      ],
    });
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2600, 1300, 1100, 4360],
    rows: [headerRow, ...dataRows],
  });
}

function cell(text, color, bold, width, bg, borderColor, italics) {
  const bc = borderColor || "D4B896";
  return new TableCell({
    borders: borders(bc),
    width: { size: width, type: WidthType.DXA },
    shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [
      new Paragraph({
        spacing: { after: 0, line: 260 },
        children: [new TextRun({ text, size: bold ? 20 : 18, bold, color, font: bold ? "Arial" : "Georgia", italics: !!italics })],
      }),
    ],
  });
}

// ─── Scientific Method Steps ─────────────────────────────────────

const scienceSteps = [
  {
    title: "Brown the Butter",
    body: "Heating butter past 100 C drives off water and triggers the Maillard reaction between milk proteins and lactose, producing hundreds of aroma compounds including diacetyl (buttery) and furaneol (caramel). The loss of water (butter is ~17% water) also reduces gluten development, yielding a more tender crumb.",
  },
  {
    title: "Rest the Dough (24-72 hours)",
    body: "Aging the dough hydrates flour proteins fully and allows amylase enzymes in flour to break starches into simple sugars, which caramelize more readily. Egg proteins also relax during the rest, reducing toughness. Studies (Gisslen, Professional Baking) confirm a 24-hour rest improves flavor complexity and browning.",
  },
  {
    title: "Cream Butter and Sugars Properly",
    body: "Creaming incorporates air into the fat matrix via sugar crystal abrasion. The air cells expand during baking (thermal expansion of gases) and are set by protein coagulation at ~74 C. Under-creaming yields dense cookies; over-creaming causes excessive spread.",
  },
  {
    title: "Use Both Brown and White Sugars",
    body: "Brown sugar contains molasses (~3.5% by weight for light brown), which is hygroscopic — it attracts and retains water molecules. This keeps the cookie interior chewy. White sugar contributes crispness through recrystallization and enhanced caramelization at the edges.",
  },
  {
    title: "Chocolate Wafer Distribution",
    body: "Using flat wafer-style chocolate rather than chips creates thin, overlapping layers of chocolate that melt into strata during baking. The larger surface area of wafers also improves the chocolate-to-dough interface for flavor integration.",
  },
  {
    title: "Sprinkle Flake Salt After Baking",
    body: "Finishing salt placed on the cookie surface immediately after baking dissolves slightly in residual steam but does not fully incorporate, creating localized salinity spikes. This contrast intensifies the perception of sweetness in adjacent bites (sensory contrast effect, Stuckey, Taste What You're Missing).",
  },
];

// ─── Main Document Assembly ──────────────────────────────────────

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Georgia", size: 22, color: C.textBody },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: C.chocolate },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: C.terracotta },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  sections: [
    // ── Section 1: Cover ──
    buildCoverSection(),

    // ── Section 2: Main Content ──
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.mustard, space: 4 } },
              children: [
                new TextRun({ text: "The Perfect Chocolate Chip Cookie", size: 16, color: C.darkBeige, font: "Georgia", italics: true }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.mustard, space: 4 } },
              children: [
                new TextRun({ text: "Page ", size: 16, color: C.darkBeige, font: "Georgia" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: C.darkBeige, font: "Georgia" }),
              ],
            }),
          ],
        }),
      },
      children: [
        // ── Introduction ──
        heading1("Introduction"),
        bodyP("Few recipes carry the cultural weight of the chocolate chip cookie. Invented by Ruth Wakefield at the Toll House Inn in 1938, this American classic has spawned countless variations — from thin and crispy to thick and cakey. Yet most home recipes rely on volumetric measurements (cups, tablespoons) that are inherently imprecise: a cup of flour can vary by up to 30% depending on how it is scooped."),
        bodyP("This report presents a version of the chocolate chip cookie engineered through the lens of food science. Every ingredient is specified as a Baker’s Percentage — a professional baker’s system where flour is always 100% and all other ingredients are expressed as a percentage of flour weight. This ensures perfect reproducibility across any batch size."),
        bodyP("Temperature control, dough hydration, and resting time are treated as first-class variables, not afterthoughts. The result is a cookie with a deeply caramelized flavor profile, chewy center, and crisp, lacy edges — a textural and flavor experience that volumetric recipes cannot reliably deliver."),
        accentRule(),

        // ── Five-Dimension Radar Analysis ──
        heading1("Five-Dimension Profile"),
        bodyP("To benchmark this recipe against the universe of baked goods, we score it across five dimensions: Taste, Nutrition, Difficulty, Time, and Cost. The radar chart below visualizes the recipe’s profile at a glance. All scores are normalized to 0–100, where 100 represents the most favorable outcome for the baker (e.g., 100 = incredible taste, 100 = trivially easy)."),
        bodyP(""),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
          children: [
            new ImageRun({
              type: "png",
              data: fs.readFileSync("radar_chart.png"),
              transformation: { width: 420, height: 420 },
              altText: { title: "Radar Chart", description: "Five-dimension cookie profile radar chart", name: "RadarChart" },
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({ text: "Figure 1: 5-Dimension Radar Profile of the Classic Chocolate Chip Cookie", size: 18, color: C.darkBeige, font: "Georgia", italics: true })],
        }),

        // Dimension breakdown
        heading2("Dimension Breakdown"),
        bodyPWithAccent([
          { text: "Taste (92/100)", bold: true, color: C.mustard },
          { text: " — Brown butter, rested dough, and flake salt create extraordinary depth. The 120% chocolate load ensures chocolate in every bite. Maillard and caramelization compounds provide complexity approaching pastry-shop quality." },
        ]),
        bodyPWithAccent([
          { text: "Nutrition (35/100)", bold: true, color: C.mustard },
          { text: " — A cookie is not health food. Butter at 80% and chocolate at 120% push the fat content high. One 45g cookie delivers approximately 210 calories. The score reflects honesty: this is an indulgence, designed without compromise." },
        ]),
        bodyPWithAccent([
          { text: "Difficulty (25/100)", bold: true, color: C.mustard },
          { text: " — No special equipment beyond a stand mixer (or sturdy whisk). The dough rest is passive time, not active work. A 12-year-old with supervision can execute this recipe successfully. The science is complex; the technique is not." },
        ]),
        bodyPWithAccent([
          { text: "Time (55/100)", bold: true, color: C.mustard },
          { text: " — Active prep takes 25 minutes, but the recommended 24-hour dough rest pushes total time to a day. Worth it? Unequivocally. The overnight rest is the single highest-impact variable for flavor. Quick-bake (skip rest) drops Time to ~20 and Taste to ~78." },
        ]),
        bodyPWithAccent([
          { text: "Cost (20/100)", bold: true, color: C.mustard },
          { text: " — All ingredients are supermarket staples. Per-cookie cost at 2026 prices is approximately $0.35 (flour, butter, sugar, egg, chocolate). Even with premium 70% chocolate wafers, a batch of 24 cookies costs under $9.00 total." },
        ]),
        accentRule(),

        // Page break before ingredients table
        pageBreak(),

        // ── Ingredient Ratios ──
        heading1("Ingredient Ratios: Baker’s Percentages"),
        bodyP("The Baker’s Percentage system is the universal language of professional baking. Flour is always the reference at 100%, and every other ingredient is expressed relative to flour weight. This makes scaling trivial: want 500 g of flour? Multiply each percentage by 5. Want 150 g? Multiply by 1.5. No volumetric guesswork, no conversion errors, and the ratio between any two ingredients is immediately visible."),
        bodyP("In the table below, each ingredient’s percentage reveals its role in the dough matrix. Notice that chocolate (120%) exceeds flour (100%) by weight — this is deliberate. Most home recipes use 70–100% chocolate; the higher ratio here guarantees every cookie is dense with chocolate strata."),
        bodyP(""),
        buildBakersTable(),
        bodyP(""),
        bodyP("Note: Baker’s Percentages always sum to more than 100% because they are ratios to flour, not to total dough weight. The total dough weight for a full batch (100% flour basis) is approximately 1,273 g, yielding 24 cookies at ~53 g each."),
        accentRule(),

        // ── Scientific Explanations ──
        heading1("The Science Behind Each Step"),
        bodyP("Great cookies are the product of controlled chemistry. The following six techniques represent the highest-leverage interventions — each one is backed by published food science and professional pastry practice."),

        ...scienceSteps.flatMap((s, i) => [
          heading2(`${i + 1}. ${s.title}`),
          bodyP(s.body),
        ]),
        accentRule(),

        // ── Method ──
        heading1("Method"),
        bodyPWithAccent([{ text: "Yield:", bold: true }, { text: " 24 cookies (~53 g each)  |  ", bold: false }, { text: "Active time:", bold: true }, { text: " 25 min  |  ", bold: false }, { text: "Rest:", bold: true }, { text: " 24–72 h  |  ", bold: false }, { text: "Bake:", bold: true }, { text: " 11–13 min at 190°C (375°F)" }]),
        bodyP(""),

        ...([
          { step: "Brown the butter", detail: "Place butter in a light-colored saucepan over medium heat. Swirl constantly. It will foam, then the milk solids will turn amber (5–7 minutes). Immediately pour into a heatproof bowl to stop cooking. Cool to room temperature (do not skip — hot butter melts sugar and ruins the creaming step)." },
          { step: "Cream butter and sugars", detail: "Combine cooled browned butter with both sugars in a stand mixer with paddle attachment. Beat on medium speed for 3–4 minutes until the mixture lightens in color and texture. Scrape the bowl twice during this process. Add eggs one at a time, beating 30 seconds after each. Add vanilla." },
          { step: "Combine dry ingredients", detail: "Whisk flour, baking soda, and salt in a separate bowl. Add to the butter-sugar mixture in three additions, mixing on low just until no dry streaks remain. Over-mixing at this stage develops gluten and produces tough cookies." },
          { step: "Fold in chocolate", detail: "Add chocolate wafers with a silicone spatula. Distribute evenly but gently. The wafers should remain intact; broken shards create inconsistent melt patterns during baking." },
          { step: "Rest the dough", detail: "Press plastic wrap directly onto the dough surface to prevent oxidation. Refrigerate at 2–4°C for 24 hours minimum, up to 72 hours. The dough will firm considerably — let it sit at room temperature for 15–20 minutes before scooping if it is too hard to portion." },
          { step: "Portion and bake", detail: "Scoop 50–55 g portions (~3 tablespoons) onto parchment-lined baking sheets, spaced 8 cm apart. Bake one sheet at a time at 190°C (375°F) for 11–13 minutes, until edges are set and golden but the center still looks slightly underdone — carryover cooking will finish it." },
          { step: "Finish and cool", detail: "Immediately after removing from oven, sprinkle a pinch of flake sea salt on each cookie. Let cool on the baking sheet for 5 minutes (cookies continue to set), then transfer to a wire rack. The salt crystals should be visible on the surface." },
        ]).flatMap(({ step, detail }, i) => [
          bodyPWithAccent([
            { text: `${i + 1}. ${step}`, bold: true, color: C.mustard },
            { text: ` — ${detail}` },
          ]),
        ]),
        accentRule(),

        // ── Troubleshooting ──
        heading1("Troubleshooting Guide"),
        bodyP("Even with precise ratios, outcomes vary. The table below maps symptoms to root causes using food-science principles, not trial and error."),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2800, 6560],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                cell("Symptom", C.chocolate, true, 2800),
                cell("Likely Cause & Fix", C.chocolate, true, 6560),
              ],
            }),
            ...([
              ["Cookies spread too much", "Butter too warm during creaming. Brown butter must cool completely (below 24°C). Dough not chilled long enough. Refrigerate at least 24 h. If persistent, increase flour to 105% to tighten the dough matrix."],
              ["Cookies are cakey", "Too much egg (protein coagulation creates cake-like crumb). Reduce to 22% flour weight. Also check: over-creaming incorporates excessive air, creating a sponge-like texture."],
              ["Cookies are pale", "Oven temperature too low or baking soda insufficient. Verify oven with a standalone thermometer. Baking soda raises pH, accelerating Maillard browning — confirm 1.5% of flour weight."],
              ["Chocolate tastes flat", "Chocolate quality matters — 70% minimum cocoa solids. Wafers > chips. Add a pinch of espresso powder (not to taste coffee; 0.5 g amplifies chocolate perception without identifiable coffee flavor)."],
              ["Cookies too sweet", "Reduce white sugar to 40% and increase brown sugar to 85% to compensate. The molasses in brown sugar contributes less perceived sweetness per gram. Alternatively, use 75%+ dark chocolate for bitter contrast."],
            ]).map(([symptom, fix], i) =>
              new TableRow({
                children: [
                  cell(symptom, C.textDark, true, 2800, i % 2 === 0 ? C.cream : C.white, "E6D5B8"),
                  cell(fix, C.textBody, false, 6560, i % 2 === 0 ? C.cream : C.white, "E6D5B8", true),
                ],
              })
            ),
          ],
        }),
        accentRule(),

        // ── References ──
        heading1("References"),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 80, line: 260 },
          children: [new TextRun({ text: "Gisslen, W. (2017). Professional Baking (7th ed.). Wiley.", size: 18, color: C.textBody, font: "Georgia", italics: true })],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 80, line: 260 },
          children: [new TextRun({ text: "McGee, H. (2004). On Food and Cooking: The Science and Lore of the Kitchen. Scribner.", size: 18, color: C.textBody, font: "Georgia", italics: true })],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 80, line: 260 },
          children: [new TextRun({ text: "This, H. (2006). Molecular Gastronomy: Exploring the Science of Flavor. Columbia University Press.", size: 18, color: C.textBody, font: "Georgia", italics: true })],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 80, line: 260 },
          children: [new TextRun({ text: "Stuckey, B. (2012). Taste What You're Missing: The Passionate Eater's Guide to Why Good Food Tastes Good. Atria.", size: 18, color: C.textBody, font: "Georgia", italics: true })],
        }),
      ],
    },
  ],
});

// ─── Generate ────────────────────────────────────────────────────

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("Cookie_Recipe_Report.docx", buffer);
  const stats = fs.statSync("Cookie_Recipe_Report.docx");
  console.log(`Done: Cookie_Recipe_Report.docx (${(stats.size / 1024).toFixed(1)} KB)`);
});
