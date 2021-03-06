const OUTPUT_DIR = 'capture';

const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path')
const helmet = require('helmet');
const validator = require('validator');
const app = express();
const port = 3000;

app.use(helmet());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

let browser = null;

(async () => {
    browser = await puppeteer.launch({headless: true});
})();

async function generateScreenshotFile(url) {
    console.log('Generating screenshot file...');

    // open new page
    const page = await browser.newPage();
    page.on('console', msg => console.log(`Page Console: ${msg.text()}`));

    // set view port
    await page.setViewport({width: 800, height: 1000});

    // wait until network idle
    await page.goto(url, {waitUntil: 'networkidle2'});

    // remove the first, second and last <p>
    await page.evaluate(() => {
        try {
            elements = document.querySelectorAll('body > p');
            elements[0].remove();
            elements[1].remove();
            elements[elements.length - 1].remove();
        } catch (err) {
            console.error(err);
        }
    });

    let ts = new Date().toISOString();
    ts = ts.replace(/:/g, '').replace(/\./g, '');
    const filename = `capture-${ts}.png`;
    const filePath = `${OUTPUT_DIR}${path.sep}${filename}`;

    // generate full page screenshot
    await page.screenshot({path: `${filePath}`, fullPage: true});

    // close the page
    await page.close();

    return filePath;
};

app.post('/convert', async(req, res) => {
    try {
        // input validation
        const inputUrl = req.body['url'];
        const validUrl = validator.isURL(inputUrl, {protocols: ['http', 'https']});
        if (!validUrl) {
            res.send("Please input a valid URL!");
            return;
        }

        const filePath = await generateScreenshotFile(inputUrl);
        console.log(`File generated at ${filePath}`);

        var options = {
            root: __dirname,
            dotfiles: 'deny',
            headers: {
                'X-Timestamp': Date.now(),
                'X-Sent': true
            }
        };

        res.sendFile(filePath, options, function(err) {
            if (err) {
                next(err);
            } else {
                console.log('Sent:', filePath);
            }
        });
    } catch (err) {
        console.log(err);
        res.send(`Error generating screenshot: ${err.message}`);
    }
});

app.listen(port, () => console.log(`App listening on port ${port}`));