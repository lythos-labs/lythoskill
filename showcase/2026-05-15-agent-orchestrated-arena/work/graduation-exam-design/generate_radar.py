#!/usr/bin/env python3
"""Generate a 5-dimension radar chart for the cookie recipe report.
Golden Hour theme: Mustard #f4a900, Terracotta #c1666b, Beige #d4b896, Chocolate #4a403a"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Golden Hour palette
MUSTARD = '#f4a900'
TERRACOTTA = '#c1666b'
BEIGE = '#d4b896'
CHOCOLATE = '#4a403a'

# Radar chart data
categories = ['Taste', 'Nutrition', 'Difficulty\n(lower = easier)', 'Time\n(lower = faster)', 'Cost\n(lower = cheaper)']
# Values (0-100, higher = better for all)
values = [92, 35, 25, 55, 20]
values += values[:1]  # Close the loop

N = len(categories)
angles = [n / float(N) * 2 * np.pi for n in range(N)]
angles += angles[:1]

fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))
fig.patch.set_facecolor(BEIGE)
ax.set_facecolor('#f5efe0')

# Draw the radar
ax.fill(angles, values, color=TERRACOTTA, alpha=0.3)
ax.plot(angles, values, color=TERRACOTTA, linewidth=2.5, marker='o', markersize=8,
        markerfacecolor=MUSTARD, markeredgecolor=CHOCOLATE, markeredgewidth=1.5)

# Style
ax.set_xticks(angles[:-1])
ax.set_xticklabels(categories, size=10, fontweight='bold', color=CHOCOLATE)
ax.set_ylim(0, 100)
ax.set_yticks([20, 40, 60, 80, 100])
ax.set_yticklabels(['20', '40', '60', '80', '100'], size=7, color='#6b5e51')
ax.set_rlabel_position(30)

# Grid styling
ax.xaxis.grid(True, color=CHOCOLATE, alpha=0.15, linewidth=0.8)
ax.yaxis.grid(True, color=CHOCOLATE, alpha=0.15, linewidth=0.8)
ax.spines['polar'].set_color(CHOCOLATE)
ax.spines['polar'].set_alpha(0.4)

# Title
ax.set_title('Classic Chocolate Chip Cookie\n5-Dimension Profile', size=14,
             fontweight='bold', color=CHOCOLATE, pad=25)

plt.tight_layout()
plt.savefig('radar_chart.png', dpi=200, bbox_inches='tight', facecolor=BEIGE, edgecolor='none')
print('Radar chart saved: radar_chart.png')
