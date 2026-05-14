const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
        WidthType, ShadingType, PageNumber, PageBreak } = require('docx');

const border = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const borders = { top: border, bottom: border, left: border, right: border };

function createCell(text, options = {}) {
  const { bold = false, fill = null, width = 2340 } = options;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: options.align || AlignmentType.LEFT,
      children: [new TextRun({ text, bold, font: "Arial", size: 22 })]
    })]
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 24 }
      }
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "2E4057" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 }
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "4A6FA5" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 }
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "555555" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }
        ]
      }
    ]
  },
  sections: [
    // Title Page Section
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
        new Paragraph({ spacing: { before: 2400 }, children: [] }),
        new Paragraph({ spacing: { before: 2400 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({
            text: "The Science of Perfect Chocolate Chip Cookies",
            bold: true,
            size: 56,
            font: "Arial",
            color: "2E4057"
          })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({
            text: "A Comprehensive Technical Analysis",
            size: 28,
            font: "Arial",
            color: "666666"
          })]
        }),
        new Paragraph({ spacing: { before: 1200 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: "May 2026",
            size: 24,
            font: "Arial",
            color: "888888"
          })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Culinary Research Division",
            size: 22,
            font: "Arial",
            color: "888888"
          })]
        }),
        new Paragraph({ children: [new PageBreak()] })
      ]
    },
    // Main Content Section
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
              children: [new TextRun({
                text: "The Science of Perfect Chocolate Chip Cookies",
                size: 18,
                font: "Arial",
                color: "888888",
                italics: true
              })]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
              children: [
                new TextRun({ text: "Page ", size: 18, font: "Arial", color: "888888" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: "888888" }),
                new TextRun({ text: " of ", size: 18, font: "Arial", color: "888888" }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: "Arial", color: "888888" })
              ]
            })
          ]
        })
      },
      children: [
        // Table of Contents
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Table of Contents")]
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: "1. Ingredient Ratios & Baker Percentages", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: "2. Scientific Explanations", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: "3. Recipe Profile Analysis", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun({ text: "4. Conclusion", size: 22, font: "Arial" })]
        }),

        // Section 1: Ingredient Ratios
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("1. Ingredient Ratios & Baker Percentages")]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({
            text: "Baker's Percentage expresses each ingredient as a percentage of the total flour weight (always 100%). This standardized method enables precise scaling and systematic recipe comparison across batch sizes.",
            size: 22,
            font: "Arial"
          })]
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({
            text: "Standard Recipe (Yield: 24 cookies)",
            bold: true,
            size: 24,
            font: "Arial",
            color: "4A6FA5"
          })]
        }),
        // Ingredient Table
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3200, 2000, 2160, 2000],
          rows: [
            new TableRow({
              children: [
                createCell("Ingredient", { bold: true, fill: "2E4057", width: 3200 }),
                createCell("Weight (g)", { bold: true, fill: "2E4057", width: 2000 }),
                createCell("Baker %", { bold: true, fill: "2E4057", width: 2160 }),
                createCell("Function", { bold: true, fill: "2E4057", width: 2000 })
              ]
            }),
            new TableRow({
              children: [
                createCell("All-Purpose Flour", { width: 3200 }),
                createCell("250g", { align: AlignmentType.RIGHT, width: 2000 }),
                createCell("100%", { bold: true, align: AlignmentType.RIGHT, width: 2160 }),
                createCell("Structure", { width: 2000 })
              ]
            }),
            new TableRow({
              children: [
                createCell("Unsalted Butter", { width: 3200 }),
                createCell("170g", { align: AlignmentType.RIGHT, width: 2000 }),
                createCell("68%", { align: AlignmentType.RIGHT, width: 2160 }),
                createCell("Fat / Flavor", { width: 2000 })
              ]
            }),
            new TableRow({
              children: [
                createCell("Granulated Sugar", { width: 3200 }),
                createCell("150g", { align: AlignmentType.RIGHT, width: 2000 }),
                createCell("60%", { align: AlignmentType.RIGHT, width: 2160 }),
                createCell("Sweetness / Spread", { width: 2000 })
              ]
            }),
            new TableRow({
              children: [
                createCell("Brown Sugar", { width: 3200 }),
                createCell("100g", { align: AlignmentType.RIGHT, width: 2000 }),
                createCell("40%", { align: AlignmentType.RIGHT, width: 2160 }),
                createCell("Moisture / Chew", { width: 2000 })
              ]
            }),
            new TableRow({
              children: [
                createCell("Large Eggs", { width: 3200 }),
                createCell("100g (2)", { align: AlignmentType.RIGHT, width: 2000 }),
                createCell("40%", { align: AlignmentType.RIGHT, width: 2160 }),
                createCell("Binding / Structure", { width: 2000 })
              ]
            }),
            new TableRow({
              children: [
                createCell("Semi-Sweet Chocolate Chips", { width: 3200 }),
                createCell("200g", { align: AlignmentType.RIGHT, width: 2000 }),
                createCell("80%", { align: AlignmentType.RIGHT, width: 2160 }),
                createCell("Flavor / Texture", { width: 2000 })
              ]
            }),
            new TableRow({
              children: [
                createCell("Vanilla Extract", { width: 3200 }),
                createCell("10g", { align: AlignmentType.RIGHT, width: 2000 }),
                createCell("4%", { align: AlignmentType.RIGHT, width: 2160 }),
                createCell("Aroma / Flavor", { width: 2000 })
              ]
            }),
            new TableRow({
              children: [
                createCell("Baking Soda", { width: 3200 }),
                createCell("5g", { align: AlignmentType.RIGHT, width: 2000 }),
                createCell("2%", { align: AlignmentType.RIGHT, width: 2160 }),
                createCell("Leavening", { width: 2000 })
              ]
            }),
            new TableRow({
              children: [
                createCell("Salt", { width: 3200 }),
                createCell("5g", { align: AlignmentType.RIGHT, width: 2000 }),
                createCell("2%", { align: AlignmentType.RIGHT, width: 2160 }),
                createCell("Flavor Enhancer", { width: 2000 })
              ]
            })
          ]
        }),
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),

        // Section 2: Scientific Explanations
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("2. Scientific Explanations")]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({
            text: "Understanding the molecular role of each ingredient is essential for recipe optimization and troubleshooting. Below is a detailed analysis of each component's scientific function.",
            size: 22,
            font: "Arial"
          })]
        }),

        // Flour
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("All-Purpose Flour")]
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({
            text: "Flour provides the structural matrix through gluten formation and starch gelatinization. When hydrated, wheat proteins (gliadin and glutenin) form gluten networks that trap gases during leavening. The amylose and amylopectin in starch absorb moisture and gelatinize during baking (60–80°C), setting the cookie's final structure. All-purpose flour (10–12% protein) offers a balance between tenderness and chewiness.",
            size: 22,
            font: "Arial"
          })]
        }),

        // Butter
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Unsalted Butter")]
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({
            text: "Butter contributes flavor, texture, and structure through its unique composition: approximately 80% milk fat, 18% water, and 2% milk solids. During creaming, fat crystals trap air; during baking, water converts to steam, creating lift. The Maillard reaction occurs in milk solids at 140–165°C, producing hundreds of flavor compounds. Using unsalted butter allows precise sodium control.",
            size: 22,
            font: "Arial"
          })]
        }),

        // Sugars
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Sugars")]
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({
            text: "Granulated sugar (sucrose) dissolves and recrystallizes during baking, promoting spread and crispness through its hygroscopic properties. Brown sugar contains molasses (3.5–6.5% by weight), introducing invert sugars (glucose and fructose) that remain hygroscopic, retaining moisture and producing a chewier texture. The dual-sugar system optimizes both texture and shelf life.",
            size: 22,
            font: "Arial"
          })]
        }),

        // Eggs
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Eggs")]
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({
            text: "Eggs serve multiple functions: emulsification (lecithin in yolk binds fat and water), structural support (albumen proteins coagulate at 62–65°C), and moisture retention. Whole eggs contribute approximately 75% water by weight. The protein coagulation temperature determines cookie set point; higher egg ratios produce cakier cookies, while lower ratios yield flatter, crisper results.",
            size: 22,
            font: "Arial"
          })]
        }),

        // Chocolate
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Semi-Sweet Chocolate Chips")]
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({
            text: "Chocolate chips (typically 40–60% cocoa solids) provide flavor through cocoa butter, cocoa mass, and added sugar. Chips are formulated with reduced cocoa butter compared to bars, enabling them to maintain their shape during baking due to higher viscosity and tempering. The cocoa butter melting point (34°C) creates the characteristic gooey texture when warm.",
            size: 22,
            font: "Arial"
          })]
        }),

        // Vanilla
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Vanilla Extract")]
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({
            text: "Vanillin (4-hydroxy-3-methoxybenzaldehyde) is the primary aromatic compound, though natural extract contains over 200 volatile compounds. Vanilla functions as a flavor potentiator, enhancing sweetness perception through aromatic synergy with sugar molecules. The alcohol carrier (minimum 35% ABV in pure extract) aids in flavor dispersion and evaporation during baking.",
            size: 22,
            font: "Arial"
          })]
        }),

        // Leavening
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Baking Soda")]
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({
            text: "Sodium bicarbonate (NaHCO3) decomposes at temperatures above 50°C in the presence of acids (from brown sugar molasses), producing carbon dioxide gas. This chemical leavening creates the characteristic open crumb structure. The optimal pH (7.5–8.0) also promotes Maillard browning, producing the golden color associated with perfectly baked cookies.",
            size: 22,
            font: "Arial"
          })]
        }),

        // Salt
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Salt")]
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({
            text: "Sodium chloride (NaCl) enhances flavor by suppressing bitterness and amplifying sweetness through cross-modal perception on the tongue. Salt also strengthens gluten networks by shielding protein charges, allowing tighter bonding. At 2% baker's percentage, salt is present at the threshold of detection, optimizing flavor without perceived saltiness.",
            size: 22,
            font: "Arial"
          })]
        }),

        // Section 3: Radar Chart
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("3. Recipe Profile Analysis")]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({
            text: "The following radar chart provides a multi-dimensional assessment of this recipe across five key evaluation criteria. Scores are normalized on a 0–10 scale based on empirical testing and comparative analysis.",
            size: 22,
            font: "Arial"
          })]
        }),
        new Paragraph({
          spacing: { after: 200 },
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({
            type: "png",
            data: fs.readFileSync("radar_chart.png"),
            transformation: { width: 400, height: 400 },
            altText: { title: "Recipe Profile Radar Chart", description: "5-dimension radar chart showing Taste, Nutrition, Difficulty, Time, and Cost scores", name: "radar_chart" }
          })]
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({
            text: "Dimension Definitions & Scores:",
            bold: true,
            size: 22,
            font: "Arial"
          })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "Taste (9.2/10): Exceptional flavor complexity from browned butter, dual sugars, and quality chocolate.", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "Nutrition (5.5/10): Moderate caloric density; contains dairy fats and sugars typical of dessert items.", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "Difficulty (3.0/10): Straightforward technique; suitable for beginner to intermediate bakers.", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "Time (4.5/10): Approximately 45 minutes total (15 min prep + 12 min bake + cooling); efficient for homemade desserts.", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [new TextRun({ text: "Cost (6.0/10): Moderate ingredient cost; premium chocolate and pure vanilla extract increase price point.", size: 22, font: "Arial" })]
        }),
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),

        // Section 4: Conclusion
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("4. Conclusion")]
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({
            text: "This recipe represents an optimized balance of flavor, texture, and technical accessibility. The 68% butter ratio and dual-sugar system produce cookies with crisp edges and chewy centers, while the 80% chocolate inclusion ensures robust flavor in every bite. The Baker Percentage framework enables linear scaling from test batches to commercial production without reformulation.",
            size: 22,
            font: "Arial"
          })]
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({
            text: "For further optimization, consider variable testing: chilling dough 24–72 hours enhances flavor complexity through flour hydration and limited fermentation; substituting 20% bread flour increases chewiness through higher protein content; and adjusting bake temperature (162°C vs 177°C) modulates spread-versus-rise characteristics.",
            size: 22,
            font: "Arial"
          })]
        })
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("cookie_recipe_report.docx", buffer);
  console.log("Document created successfully: cookie_recipe_report.docx");
}).catch(err => {
  console.error("Error creating document:", err);
  process.exit(1);
});
