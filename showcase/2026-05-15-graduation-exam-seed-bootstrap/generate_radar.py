import matplotlib.pyplot as plt
import numpy as np

# Radar chart dimensions
categories = ['Taste', 'Nutrition', 'Difficulty', 'Time', 'Cost']
N = len(categories)

# Scores for Classic Chocolate Chip Cookie (1-10 scale)
# Taste: 9 (delicious), Nutrition: 4 (indulgent), Difficulty: 3 (easy),
# Time: 7 (chill+bake), Cost: 6 (moderate)
values = [9, 4, 3, 7, 6]
values += values[:1]  # Close the polygon

# Compute angle for each axis
angles = [n / float(N) * 2 * np.pi for n in range(N)]
angles += angles[:1]

# Create figure
fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))

# Draw one axe per variable and add labels
plt.xticks(angles[:-1], categories, color='grey', size=12, fontweight='bold')

# Draw ylabels
ax.set_rlabel_position(30)
plt.yticks([2, 4, 6, 8, 10], ["2", "4", "6", "8", "10"], color="grey", size=10)
plt.ylim(0, 10)

# Plot data
ax.plot(angles, values, color='#D2691E', linewidth=2, linestyle='solid', marker='o', markersize=8)
ax.fill(angles, values, color='#D2691E', alpha=0.25)

# Title
plt.title('Cookie Recipe Profile\nClassic Chocolate Chip Cookie', size=14, fontweight='bold', pad=20)

# Add score annotations
for angle, value, cat in zip(angles[:-1], values[:-1], categories):
    ax.annotate(f'{value}', xy=(angle, value), xytext=(angle, value + 0.8),
                fontsize=10, ha='center', fontweight='bold', color='#333333')

plt.tight_layout()
plt.savefig('radar_chart.png', dpi=200, bbox_inches='tight', facecolor='white')
print('radar_chart.png saved')
