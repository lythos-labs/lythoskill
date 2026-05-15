const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, PageBreak
} = require('docx');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({ text: text, bold: opts.bold || false, size: 22, font: "Arial" })]
    })]
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 32, font: "Arial" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 28, font: "Arial" })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before || 120, after: opts.after || 120 },
    children: [new TextRun({ text, size: 22, font: "Arial", bold: opts.bold || false })]
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: "Arial" })]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Cookie Recipe Report", italics: true, size: 20, font: "Arial", color: "666666" })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ", size: 20, font: "Arial", color: "666666" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 20, font: "Arial", color: "666666" })
        ]
      })] })
    },
    children: [
      // Title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: "Professional Cookie Recipe Report", bold: true, size: 40, font: "Arial" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        children: [new TextRun({ text: "Classic Chocolate Chip Cookie with Baker's Percentages & Baking Science", size: 24, font: "Arial", color: "555555" })]
      }),

      // Executive Summary / Radar Chart
      h1("Recipe Profile Overview"),
      p("The following radar chart provides a quantitative assessment of this cookie recipe across five critical dimensions: Taste, Nutrition, Difficulty, Time, and Cost. Each dimension is scored on a 1-10 scale based on standard baking benchmarks."),

      // Embedded radar chart
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 },
        children: [new ImageRun({
          type: "png",
          data: fs.readFileSync("radar_chart.png"),
          transformation: { width: 400, height: 400 },
          altText: { title: "Cookie Recipe Radar Chart", description: "5-dimension radar chart for cookie recipe", name: "radar_chart" }
        })]
      }),

      p("Interpretation: This recipe scores exceptionally high on Taste (9/10) due to the Maillard browning and caramelization effects. Nutrition is moderate-low (4/10) reflecting the high butter and sugar content. Difficulty is low (3/10), making it accessible to beginners. Time investment is moderate (7/10) including dough chilling. Cost is moderate (6/10) driven by butter and chocolate chips.", { after: 240 }),

      // Ingredients with Baker's Percentages
      h1("Ingredients & Baker's Percentages"),
      p("Baker's Percentages express every ingredient as a percentage of the total flour weight, which is always set to 100%. This system enables easy scaling and provides immediate insight into dough hydration, fat content, and sugar levels."),

      // Ingredient table
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 2340, 2340, 1560],
        rows: [
          new TableRow({ children: [
            cell("Ingredient", 3120, { bold: true, shading: "2E75B6", align: AlignmentType.CENTER }),
            cell("Weight (g)", 2340, { bold: true, shading: "2E75B6", align: AlignmentType.CENTER }),
            cell("Baker's %", 2340, { bold: true, shading: "2E75B6", align: AlignmentType.CENTER }),
            cell("Role", 1560, { bold: true, shading: "2E75B6", align: AlignmentType.CENTER }),
          ]}),
          new TableRow({ children: [
            cell("All-Purpose Flour", 3120), cell("250 g", 2340, { align: AlignmentType.RIGHT }),
            cell("100%", 2340, { align: AlignmentType.RIGHT }), cell("Structure", 1560),
          ]}),
          new TableRow({ children: [
            cell("Unsalted Butter", 3120), cell("170 g", 2340, { align: AlignmentType.RIGHT }),
            cell("68%", 2340, { align: AlignmentType.RIGHT }), cell("Fat / Flavor", 1560),
          ]}),
          new TableRow({ children: [
            cell("Granulated Sugar", 3120), cell("150 g", 2340, { align: AlignmentType.RIGHT }),
            cell("60%", 2340, { align: AlignmentType.RIGHT }), cell("Sweetness / Crisp", 1560),
          ]}),
          new TableRow({ children: [
            cell("Brown Sugar", 3120), cell("100 g", 2340, { align: AlignmentType.RIGHT }),
            cell("40%", 2340, { align: AlignmentType.RIGHT }), cell("Moisture / Chew", 1560),
          ]}),
          new TableRow({ children: [
            cell("Eggs (whole)", 3120), cell("100 g", 2340, { align: AlignmentType.RIGHT }),
            cell("40%", 2340, { align: AlignmentType.RIGHT }), cell("Binder / Rise", 1560),
          ]}),
          new TableRow({ children: [
            cell("Chocolate Chips", 3120), cell("200 g", 2340, { align: AlignmentType.RIGHT }),
            cell("80%", 2340, { align: AlignmentType.RIGHT }), cell("Inclusion", 1560),
          ]}),
          new TableRow({ children: [
            cell("Vanilla Extract", 3120), cell("5 g", 2340, { align: AlignmentType.RIGHT }),
            cell("2%", 2340, { align: AlignmentType.RIGHT }), cell("Aroma", 1560),
          ]}),
          new TableRow({ children: [
            cell("Baking Soda", 3120), cell("5 g", 2340, { align: AlignmentType.RIGHT }),
            cell("2%", 2340, { align: AlignmentType.RIGHT }), cell("Leavening", 1560),
          ]}),
          new TableRow({ children: [
            cell("Salt", 3120), cell("5 g", 2340, { align: AlignmentType.RIGHT }),
            cell("2%", 2340, { align: AlignmentType.RIGHT }), cell("Flavor enhancer", 1560),
          ]}),
        ]
      }),

      p("Total dough weight: approximately 985 g. Yield: 24 cookies (~41 g each).", { before: 120, after: 240 }),

      // Scientific Explanations
      h1("The Science of Baking"),

      h2("1. Gluten Development & Flour"),
      p("All-purpose flour contains approximately 10-12% protein by weight, primarily glutenin and gliadin. When hydrated and mechanically worked, these proteins form gluten networks that trap gases produced by leavening agents. In cookies, minimal mixing is desired to limit gluten development, yielding a tender, crumbly texture rather than a chewy bread-like structure."),

      h2("2. The Maillard Reaction & Caramelization"),
      p("Cookie browning arises from two distinct chemical pathways:"),
      bullet("Maillard Reaction: Amino acids from egg and flour proteins react with reducing sugars at 140-165 degrees C, producing hundreds of flavor compounds (pyrazines, furans, thiazoles) responsible for the nutty, toasted aroma."),
      bullet("Caramelization: Sucrose and glucose undergo thermal decomposition above 170 degrees C, yielding caramel-like flavors and dark brown pigments. Brown sugar accelerates this via its invert sugar content (glucose + fructose)."),

      h2("3. Fat Chemistry: Butter & Spread"),
      p("Butter is approximately 80% milk fat, 18% water, and 2% milk solids. During creaming, mechanical agitation creates an emulsion where sugar crystals cut microscopic air pockets into solid fat. These air cells expand with leavening CO2 during baking. The water fraction converts to steam, contributing to rise. Using melted butter instead of creamed butter increases spread because the fat cannot hold pre-formed air cells."),

      h2("4. Leavening: Baking Soda (Sodium Bicarbonate)"),
      p("Baking soda (NaHCO3) is a base that reacts with acidic brown sugar (pH ~5.0-5.5 due to molasses) to produce carbon dioxide:"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "NaHCO3 + H+  ->  Na+ + H2O + CO2 (gas)", italics: true, size: 22, font: "Arial" })]
      }),
      p("At 2% Baker's Percentage (5 g per 250 g flour), the reaction yields sufficient CO2 for moderate lift without excessive alkaline aftertaste. Over-leavening (>3%) produces a soapy flavor and coarse, cake-like crumb."),

      h2("5. Sugar Science: Hygroscopy & Texture"),
      p("Sugars are hygroscopic, meaning they attract and bind water molecules. Brown sugar, containing ~3.5% molasses, is more hygroscopic than granulated sugar. The 60:40 ratio of white to brown sugar in this recipe produces a balanced texture:"),
      bullet("Granulated sugar promotes spread and crisp edges by dissolving and recrystallizing into a glassy matrix."),
      bullet("Brown sugar retains moisture, producing a softer, chewier center via its fructose and glucose content, which remain syrupy at room temperature."),

      h2("6. Egg Function: Emulsification & Coagulation"),
      p("Whole eggs (~74% water, 13% protein, 11% fat) serve dual roles. The lecithin in yolk acts as an emulsifier, stabilizing the fat-water interface in the dough. During baking, egg proteins (primarily ovalbumin) denature and coagulate at 65-70 degrees C, setting the cookie structure and preventing excessive spread. At 40% Baker's Percentage, the egg provides sufficient binding without introducing excessive moisture."),

      h2("7. Chocolate Chip Dispersion"),
      p("Chocolate chips at 80% Baker's Percentage ensure approximately 8-10 chips per cookie. The high cocoa butter content (~30%) in semisweet chips creates localized fat pockets that remain soft at room temperature, contributing to the dual-texture experience (crisp exterior, gooey interior). The chips also act as thermal insulators, creating temperature gradients within the dough that enhance textural complexity."),

      // Methodology
      h1("Methodology"),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { before: 120, after: 60 }, children: [new TextRun({ text: "Cream butter and sugars on medium speed for 3-4 minutes until light and fluffy. This mechanically incorporates air and begins sugar dissolution.", size: 22, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Add eggs one at a time, beating well after each addition. Mix in vanilla extract.", size: 22, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Whisk flour, baking soda, and salt separately. Add to wet ingredients on low speed until just combined. Over-mixing develops gluten and toughens cookies.", size: 22, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Fold in chocolate chips by hand to prevent chip fracture and over-mixing.", size: 22, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Chill dough for at least 30 minutes (preferably 2-24 hours). Cold solidifies butter, reducing spread and intensifying flavor via flour hydration.", size: 22, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "Portion dough into 40-42 g balls. Bake at 190 degrees C (375 degrees F) for 10-12 minutes until edges are golden but centers appear slightly underdone.", size: 22, font: "Arial" })] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { before: 60, after: 120 }, children: [new TextRun({ text: "Cool on baking sheet for 5 minutes (carryover cooking continues), then transfer to wire rack.", size: 22, font: "Arial" })] }),

      // Nutrition Summary
      h1("Nutritional Summary"),
      p("Per cookie (41 g serving, approximate values):"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 2340, 2340, 1560],
        rows: [
          new TableRow({ children: [
            cell("Nutrient", 3120, { bold: true, shading: "2E75B6", align: AlignmentType.CENTER }),
            cell("Amount", 2340, { bold: true, shading: "2E75B6", align: AlignmentType.CENTER }),
            cell("% Daily Value*", 2340, { bold: true, shading: "2E75B6", align: AlignmentType.CENTER }),
            cell("Source", 1560, { bold: true, shading: "2E75B6", align: AlignmentType.CENTER }),
          ]}),
          new TableRow({ children: [
            cell("Calories", 3120), cell("~195 kcal", 2340, { align: AlignmentType.RIGHT }),
            cell("~10%", 2340, { align: AlignmentType.RIGHT }), cell("Fat/Sugar", 1560),
          ]}),
          new TableRow({ children: [
            cell("Total Fat", 3120), cell("~10 g", 2340, { align: AlignmentType.RIGHT }),
            cell("~13%", 2340, { align: AlignmentType.RIGHT }), cell("Butter/Chips", 1560),
          ]}),
          new TableRow({ children: [
            cell("Saturated Fat", 3120), cell("~6 g", 2340, { align: AlignmentType.RIGHT }),
            cell("~30%", 2340, { align: AlignmentType.RIGHT }), cell("Butter", 1560),
          ]}),
          new TableRow({ children: [
            cell("Carbohydrates", 3120), cell("~25 g", 2340, { align: AlignmentType.RIGHT }),
            cell("~9%", 2340, { align: AlignmentType.RIGHT }), cell("Flour/Sugar", 1560),
          ]}),
          new TableRow({ children: [
            cell("Sugars", 3120), cell("~15 g", 2340, { align: AlignmentType.RIGHT }),
            cell("—", 2340, { align: AlignmentType.RIGHT }), cell("Granulated/Brown", 1560),
          ]}),
          new TableRow({ children: [
            cell("Protein", 3120), cell("~2.5 g", 2340, { align: AlignmentType.RIGHT }),
            cell("~5%", 2340, { align: AlignmentType.RIGHT }), cell("Flour/Egg", 1560),
          ]}),
          new TableRow({ children: [
            cell("Sodium", 3120), cell("~120 mg", 2340, { align: AlignmentType.RIGHT }),
            cell("~5%", 2340, { align: AlignmentType.RIGHT }), cell("Salt/Soda", 1560),
          ]}),
        ]
      }),
      p("*Based on a 2,000-calorie daily diet. Values are approximate and vary with specific ingredient brands.", { before: 120, after: 240 }),

      // Conclusion
      h1("Conclusion"),
      p("This Classic Chocolate Chip Cookie recipe represents an optimized balance of flavor, texture, and accessibility. The Baker's Percentage framework (100% flour baseline) enables precise scaling from home batches to commercial production. The underlying chemistry — Maillard browning, gluten moderation, controlled leavening, and sugar-mediated moisture retention — produces the iconic dual-texture cookie: crisp edges with a chewy, tender center. The moderate cost and low difficulty make this an ideal benchmark recipe for both novice bakers and professional kitchens."),

      p("— Report generated by Arena Evaluation Cell", { align: AlignmentType.RIGHT, before: 360, after: 0 }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("Cookie_Recipe_Report.docx", buffer);
  console.log("Cookie_Recipe_Report.docx created");
}).catch(err => {
  console.error("Error creating docx:", err);
  process.exit(1);
});
