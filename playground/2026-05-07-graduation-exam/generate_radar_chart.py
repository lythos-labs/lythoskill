import matplotlib.pyplot as plt
import numpy as np

# Define the dimensions and values
labels = ['Taste', 'Nutrition', 'Difficulty', 'Time', 'Cost']
values = [9.2, 5.5, 3.0, 4.5, 6.0]

# Number of variables
num_vars = len(labels)

# Compute angle for each axis
angles = np.linspace(0, 2 * np.pi, num_vars, endpoint=False).tolist()

# Complete the loop
values += values[:1]
angles += angles[:1]

# Create figure
fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))

# Draw the radar chart
ax.fill(angles, values, color='#D4A373', alpha=0.35)
ax.plot(angles, values, color='#8B4513', linewidth=2.5, marker='o', markersize=8, markerfacecolor='#D4A373')

# Set the labels
ax.set_xticks(angles[:-1])
ax.set_xticklabels(labels, fontsize=13, fontweight='bold', color='#333333')

# Set y-axis limits and labels
ax.set_ylim(0, 10)
ax.set_yticks([2, 4, 6, 8, 10])
ax.set_yticklabels(['2', '4', '6', '8', '10'], color='#666666', fontsize=9)
ax.yaxis.grid(True, linestyle='--', alpha=0.5)
ax.xaxis.grid(True, linestyle='--', alpha=0.5)

# Add a subtle title
ax.set_title('Recipe Profile Analysis', fontsize=15, fontweight='bold', color='#333333', pad=20)

# Style the plot
ax.spines['polar'].set_color('#CCCCCC')
ax.spines['polar'].set_linewidth(1)

plt.tight_layout()
plt.savefig('radar_chart.png', dpi=200, bbox_inches='tight', facecolor='white', edgecolor='none')
plt.close()
print("Radar chart saved as radar_chart.png")
