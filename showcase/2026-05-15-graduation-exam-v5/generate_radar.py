import matplotlib.pyplot as plt
import numpy as np

# 5-dimension radar chart for Classic Chocolate Chip Cookie
labels = ['Taste', 'Nutrition', 'Difficulty', 'Time', 'Cost']
values = [9.0, 5.0, 3.0, 4.0, 6.0]

# Number of variables
N = len(labels)

# Compute angle for each axis
angles = np.linspace(0, 2 * np.pi, N, endpoint=False).tolist()
values += values[:1]
angles += angles[:1]

# Create figure with transparent background
fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))
fig.patch.set_alpha(0)

# Draw the outline
ax.fill(angles, values, color='#D4A373', alpha=0.25)
ax.plot(angles, values, color='#D4A373', linewidth=2, linestyle='solid')

# Add markers at each point
ax.scatter(angles[:-1], values[:-1], color='#8B4513', s=60, zorder=5)

# Add labels
ax.set_xticks(angles[:-1])
ax.set_xticklabels(labels, fontsize=12, fontweight='bold')

# Set y-axis limits and labels
ax.set_ylim(0, 10)
ax.set_yticks([2, 4, 6, 8, 10])
ax.set_yticklabels(['2', '4', '6', '8', '10'], color='grey', size=10)

# Add grid
ax.grid(color='gray', linestyle='--', linewidth=0.5, alpha=0.7)

# Title
ax.set_title('Cookie Recipe Profile', fontsize=14, fontweight='bold', pad=20)

plt.tight_layout()
plt.savefig('/private/var/folders/h1/lfp3fxf11cl4nhh90sz320zw0000gn/T/arena-single-1778830621273/radar_chart.png', dpi=150, bbox_inches='tight', transparent=True)
print("Radar chart saved.")
