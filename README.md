# Click Accuracy Game

A minimal single-page application that measures click accuracy on shrinking targets.

## Features

- **Click Accuracy Testing**: Click on shrinking circles that move after each hit
- **Real-time Statistics**: Live tracking of hits, accuracy, target size, and elapsed time
- **Shooting Range Analysis**: Visual analysis showing all your clicks relative to target centers
- **Screenshot-friendly Results**: Modal results perfect for sharing

## Game Rules

1. Click inside the circle
2. After each hit, the circle shrinks and moves to a new random location
3. One miss ends the run
4. Try to achieve the highest accuracy possible!

## Deployment

### Vercel (Recommended)

1. Push your code to a GitHub repository
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy with default settings - no build configuration needed
4. Your game will be live at your Vercel URL

### Local Development

Simply open `index.html` in a web browser, or use a local server:

```bash
# Python
python3 -m http.server 8080

# Node.js (if you have http-server installed)
npx serve .

# PHP
php -S localhost:8080
```

Then visit `http://localhost:8080`

## Technical Details

- **Pure HTML/CSS/JavaScript** - No build process required
- **Tailwind CSS** via CDN for styling
- **Client-side only** - No backend needed
- **Responsive design** - Works on desktop and mobile
- **localStorage** persistence for last scorecard

## Game Metrics

- **Accuracy**: Calculated as `max(0, 1 - distance/radius)`
- **Weighted Scoring**: Uses power-law weighting favoring smaller targets
- **Target Shrinking**: Linear reduction by ~1/20th per hit
- **Timing**: Precise millisecond timing for performance analysis

Built with ❤️ for accuracy enthusiasts!