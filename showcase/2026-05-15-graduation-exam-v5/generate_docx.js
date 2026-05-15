const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
        Header, Footer, AlignmentType, PageOrientation, LevelFormat,
        HeadingLevel, BorderStyle, WidthType, ShadingType,
        VerticalAlign, PageNumber, PageBreak } = require('docx');

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
      children: [new TextRun({ text, bold: opts.bold || false, size: 22, font: "Arial" })]
    })]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "5D4037" },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "795548" },
        paragraph: { spacing: { before: 280, after: 180 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "8D6E63" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
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
        children: [new TextRun({ text: "Cookie Recipe Report", italics: true, size: 20, color: "888888", font: "Arial" })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ", size: 20, color: "888888", font: "Arial" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 20, color: "888888", font: "Arial" })
        ]
      })] })
    },
    children: [
      // Title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: "Classic Chocolate Chip Cookie", bold: true, size: 48, font: "Arial", color: "5D4037" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [new TextRun({ text: "A Professional Recipe Report with Scientific Analysis", size: 24, italics: true, font: "Arial", color: "795548" })]
      }),

      // Executive Summary
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Executive Summary")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "This report presents a detailed analysis of the classic chocolate chip cookie recipe, combining traditional baking techniques with scientific insights. The recipe has been evaluated across five dimensions: Taste, Nutrition, Difficulty, Time, and Cost. Using Baker\u2019s Percentages, all ingredient ratios are expressed relative to total flour weight, enabling precise scaling and formulation adjustments. Scientific explanations accompany each ingredient to illuminate the underlying chemistry of cookie baking.", size: 22, font: "Arial" })]
      }),

      // Radar Chart
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Recipe Profile")] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new ImageRun({
          type: "png",
          data: fs.readFileSync("/private/var/folders/h1/lfp3fxf11cl4nhh90sz320zw0000gn/T/arena-single-1778830621273/radar_chart.png"),
          transformation: { width: 400, height: 400 },
          altText: { title: "Radar Chart", description: "5-dimension radar chart for cookie recipe", name: "radar_chart" }
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        children: [new TextRun({ text: "Figure 1. Five-dimension recipe profile: Taste (9/10), Nutrition (5/10), Difficulty (3/10), Time (4/10), Cost (6/10).", italics: true, size: 20, color: "666666", font: "Arial" })]
      }),

      // Interpretation of radar chart
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Profile Analysis")] }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "Taste (9/10): ", bold: true, size: 22, font: "Arial" }), new TextRun({ text: "The Maillard reaction between amino acids and reducing sugars produces hundreds of flavor compounds during baking, while caramelization of sucrose adds complex bittersweet notes. The high butter content contributes rich dairy flavors and a tender crumb.", size: 22, font: "Arial" })]
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "Nutrition (5/10): ", bold: true, size: 22, font: "Arial" }), new TextRun({ text: "Each cookie provides approximately 150 kcal, with significant contributions from fat (butter) and carbohydrates (sugars and flour). While not a health food, the recipe contains no artificial additives and provides modest protein from eggs.", size: 22, font: "Arial" })]
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "Difficulty (3/10): ", bold: true, size: 22, font: "Arial" }), new TextRun({ text: "The recipe requires only basic mixing techniques\u2014creaming, combining wet and dry ingredients, and folding. No specialized equipment is needed beyond a standard oven and mixing bowl.", size: 22, font: "Arial" })]
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "Time (4/10): ", bold: true, size: 22, font: "Arial" }), new TextRun({ text: "Total time from preparation to cooling is approximately 45 minutes: 15 minutes prep, 12 minutes baking, and 18 minutes cooling. Dough may be refrigerated for up to 72 hours to develop deeper flavors.", size: 22, font: "Arial" })]
      }),
      new Paragraph({
        spacing: { after: 360 },
        children: [new TextRun({ text: "Cost (6/10): ", bold: true, size: 22, font: "Arial" }), new TextRun({ text: "Ingredients are commonly available pantry staples. The primary expense is high-quality chocolate and butter, which together account for roughly 60% of ingredient cost.", size: 22, font: "Arial" })]
      }),

      // Recipe with Baker's Percentages
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Recipe & Baker\u2019s Percentages")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "Baker\u2019s Percentages express every ingredient as a percentage of total flour weight (always 100%). This system, developed by professional bakers, allows recipes to be scaled accurately to any yield and facilitates formula comparison across different recipes.", size: 22, font: "Arial" })]
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 2340, 2340, 1560],
        rows: [
          new TableRow({
            children: [
              cell("Ingredient", 3120, { bold: true, shading: "D7CCC8", align: AlignmentType.CENTER }),
              cell("Weight (g)", 2340, { bold: true, shading: "D7CCC8", align: AlignmentType.CENTER }),
              cell("Baker\u2019s %", 2340, { bold: true, shading: "D7CCC8", align: AlignmentType.CENTER }),
              cell("Function", 1560, { bold: true, shading: "D7CCC8", align: AlignmentType.CENTER }),
            ]
          }),
          new TableRow({ children: [cell("Bread Flour", 3120), cell("250 g", 2340, { align: AlignmentType.RIGHT }), cell("100%", 2340, { align: AlignmentType.RIGHT }), cell("Structure", 1560, { align: AlignmentType.CENTER })] }),
          new TableRow({ children: [cell("Unsalted Butter", 3120), cell("175 g", 2340, { align: AlignmentType.RIGHT }), cell("70%", 2340, { align: AlignmentType.RIGHT }), cell("Fat/Tender", 1560, { align: AlignmentType.CENTER })] }),
          new TableRow({ children: [cell("Brown Sugar", 3120), cell("150 g", 2340, { align: AlignmentType.RIGHT }), cell("60%", 2340, { align: AlignmentType.RIGHT }), cell("Sweet/Moist", 1560, { align: AlignmentType.CENTER })] }),
          new TableRow({ children: [cell("Granulated Sugar", 3120), cell("50 g", 2340, { align: AlignmentType.RIGHT }), cell("20%", 2340, { align: AlignmentType.RIGHT }), cell("Sweet/Crisp", 1560, { align: AlignmentType.CENTER })] }),
          new TableRow({ children: [cell("Whole Eggs", 3120), cell("100 g", 2340, { align: AlignmentType.RIGHT }), cell("40%", 2340, { align: AlignmentType.RIGHT }), cell("Bind/Rich", 1560, { align: AlignmentType.CENTER })] }),
          new TableRow({ children: [cell("Chocolate Chips", 3120), cell("200 g", 2340, { align: AlignmentType.RIGHT }), cell("80%", 2340, { align: AlignmentType.RIGHT }), cell("Flavor", 1560, { align: AlignmentType.CENTER })] }),
          new TableRow({ children: [cell("Vanilla Extract", 3120), cell("5 g", 2340, { align: AlignmentType.RIGHT }), cell("2%", 2340, { align: AlignmentType.RIGHT }), cell("Aroma", 1560, { align: AlignmentType.CENTER })] }),
          new TableRow({ children: [cell("Baking Soda", 3120), cell("5 g", 2340, { align: AlignmentType.RIGHT }), cell("2%", 2340, { align: AlignmentType.RIGHT }), cell("Leaven", 1560, { align: AlignmentType.CENTER })] }),
          new TableRow({ children: [cell("Salt", 3120), cell("3 g", 2340, { align: AlignmentType.RIGHT }), cell("1.2%", 2340, { align: AlignmentType.RIGHT }), cell("Enhance", 1560, { align: AlignmentType.CENTER })] }),
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 360 },
        children: [new TextRun({ text: "Table 1. Ingredient formulation with Baker\u2019s Percentages relative to 250 g flour base.", italics: true, size: 20, color: "666666", font: "Arial" })]
      }),

      // Scientific Explanations
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Scientific Explanations")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Flour: The Structural Backbone")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "Wheat flour contains two key proteins\u2014gliadin and glutenin\u2014which hydrate in the presence of water to form gluten. In cookies, minimal mixing limits gluten development, yielding a tender, crumbly texture rather than chewy bread. The starch granules in flour gelatinize during baking, setting the cookie\u2019s structure. Using bread flour (higher protein, ~12%) instead of cake flour produces a slightly chewier cookie due to greater gluten potential.", size: 22, font: "Arial" })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Butter: Flavor, Texture, and Spread")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "Butter is approximately 80% fat, 18% water, and 2% milk solids. During creaming with sugar, air pockets are trapped in the fat matrix, contributing to leavening. The water content turns to steam in the oven, expanding the dough. Milk solids undergo the Maillard reaction, producing nutty, toffee-like flavors. The fat content interferes with gluten formation (tenderization) and promotes spread as it melts early in baking. At 70% Baker\u2019s Percentage, this recipe achieves a balance between richness and structural integrity.", size: 22, font: "Arial" })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Sugars: Sweetness, Moisture, and Browning")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "Brown sugar contains molasses (approximately 3.5% for light brown sugar), which is hygroscopic\u2014it attracts and retains moisture, producing a softer, chewier cookie. Granulated sugar, being pure sucrose, promotes spread and creates a crispier edge through rapid dissolution and recrystallization. The combined 80% sugar concentration ensures adequate browning via the Maillard reaction (reducing sugars + amino acids) and caramelization (pyrolysis of sucrose above 170\u00B0C).", size: 22, font: "Arial" })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Eggs: Binding and Emulsification")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "Eggs serve multiple functions in cookie dough. The proteins (ovalbumin, conalbumin) coagulate during baking, setting the cookie structure. Lecithin in the yolk acts as a natural emulsifier, stabilizing the fat-in-water dispersion created when butter melts. This emulsification ensures uniform texture and prevents oil separation. At 40% Baker\u2019s Percentage, eggs provide sufficient binding without making the cookie cake-like.", size: 22, font: "Arial" })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Leavening: Baking Soda Chemistry")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "Sodium bicarbonate (NaHCO\u2083) is the sole chemical leavening agent. When heated and in the presence of acidic molasses from brown sugar, it decomposes to produce carbon dioxide gas: 2 NaHCO\u2083 \u2192 Na\u2082CO\u2083 + H\u2082O + CO\u2082. The CO\u2082 expands existing air pockets, creating a lighter texture. At 2% Baker\u2019s Percentage, the leavening is subtle\u2014cookies are dense compared to cakes, which may use 3\u20134%.", size: 22, font: "Arial" })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Salt and Vanilla: Flavor Modulation")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "Salt (NaCl) at 1.2% suppresses bitterness, enhances sweetness perception, and strengthens gluten indirectly by tightening the gluten network. Vanilla extract contains over 200 volatile aromatic compounds, primarily vanillin (4-hydroxy-3-methoxybenzaldehyde), which interacts with olfactory receptors to produce a perception of warmth and sweetness. Even at 2%, vanilla significantly elevates perceived flavor complexity.", size: 22, font: "Arial" })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Chocolate: The Signature Ingredient")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "Chocolate chips at 80% Baker\u2019s Percentage deliver intense cocoa flavor and textural contrast. During baking, the chips melt but retain enough shape to create pockets of molten chocolate. Cocoa butter\u2019s unique melting point (~34\u00B0C) ensures it remains solid at room temperature but melts on the palate, releasing encapsulated flavor compounds. The high percentage relative to flour makes this a chocolate-forward cookie.", size: 22, font: "Arial" })]
      }),

      // Baking Instructions
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Method")] }),
      new Paragraph({
        spacing: { after: 160 },
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Preheat oven to 190\u00B0C (375\u00B0F). Line baking sheets with parchment paper.", size: 22, font: "Arial" })]
      }),
      new Paragraph({
        spacing: { after: 160 },
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Cream butter and sugars together until light and fluffy (3\u20134 minutes). This incorporates air and begins sugar dissolution.", size: 22, font: "Arial" })]
      }),
      new Paragraph({
        spacing: { after: 160 },
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Add eggs one at a time, beating well after each addition. Mix in vanilla extract.", size: 22, font: "Arial" })]
      }),
      new Paragraph({
        spacing: { after: 160 },
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "In a separate bowl, whisk flour, baking soda, and salt. Gradually add to wet mixture, mixing just until combined to minimize gluten development.", size: 22, font: "Arial" })]
      }),
      new Paragraph({
        spacing: { after: 160 },
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Fold in chocolate chips evenly.", size: 22, font: "Arial" })]
      }),
      new Paragraph({
        spacing: { after: 160 },
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Portion dough into 40 g balls (approximately 24 cookies). Space 5 cm apart.", size: 22, font: "Arial" })]
      }),
      new Paragraph({
        spacing: { after: 360 },
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Bake 10\u201312 minutes until edges are golden and centers appear slightly underdone. Cool on sheet 5 minutes, then transfer to wire rack.", size: 22, font: "Arial" })]
      }),

      // Conclusion
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Conclusion")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: "This classic chocolate chip cookie recipe exemplifies the intersection of culinary tradition and food science. By understanding the role of each ingredient\u2014from gluten development in flour to Maillard browning in sugars\u2014bakers can make informed adjustments for desired textures and flavors. The Baker\u2019s Percentage system ensures reproducibility at any scale, while the five-dimension profile provides an at-a-glance assessment of recipe characteristics. Whether for home baking or commercial production, this formulation offers a robust, scientifically grounded foundation for exceptional cookies.", size: 22, font: "Arial" })]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/private/var/folders/h1/lfp3fxf11cl4nhh90sz320zw0000gn/T/arena-single-1778830621273/Cookie_Recipe_Report.docx", buffer);
  console.log("DOCX created successfully.");
});
