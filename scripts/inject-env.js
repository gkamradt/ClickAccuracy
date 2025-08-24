// Script to inject environment variables into static files
const fs = require('fs');
const path = require('path');

// Read the .env file
const envPath = path.join(__dirname, '..', '.env');
const loggerPath = path.join(__dirname, '..', 'public', 'js', 'utils', 'logger.js');

let logLevel = 'production'; // default

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const logLevelMatch = envContent.match(/NEXT_PUBLIC_LOG_LEVEL=(.+)/);
    if (logLevelMatch) {
        logLevel = logLevelMatch[1].trim();
    }
}

// Read the logger file
if (fs.existsSync(loggerPath)) {
    let loggerContent = fs.readFileSync(loggerPath, 'utf8');
    
    // Replace the LOG_LEVEL value
    loggerContent = loggerContent.replace(
        /const LOG_LEVEL = '[^']+';/,
        `const LOG_LEVEL = '${logLevel}';`
    );
    
    // Write back the modified content
    fs.writeFileSync(loggerPath, loggerContent);
    console.log(`✅ Updated logger.js with LOG_LEVEL='${logLevel}'`);
} else {
    console.error('❌ Logger file not found');
}