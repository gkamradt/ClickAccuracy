# Click Accuracy Game

A minimal single-page application that measures click accuracy on shrinking targets. Meant to test how well AI clicks on a screen.

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