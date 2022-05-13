const max_vc_count_per_submission = 5;
const max_submission_count = 2;

var argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Usage: node $0 [options]')
  .example('node $0 -u username -p password -n 30.000000 -e 120.0000000')
  .alias('u', 'username')
  .nargs('u', 1)
  .describe('u', 'username')
  .alias('p', 'password')
  .nargs('p', 1)
  .describe('p', 'password')
  .alias('n', 'latitude')
  .nargs('n', 1)
  .describe('n', 'latitude')
  .alias('e', 'longitude')
  .nargs('e', 1)
  .describe('e', 'longitude')
  .demandOption(['u', 'p'])
  .help('h')
  .alias('h', 'help')
  .argv;
const puppeteer = require('puppeteer');
const tesseract = require("node-tesseract-ocr");
const config = {
  lang: "eng",
  oem: 1,
  psm: 7,
};

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    args: [`--window-size=1920,3000`],
    defaultViewport: {
      width:1920,
      height:3000
    }
  });

  const page = await browser.newPage();

  const context = browser.defaultBrowserContext()
  await context.overridePermissions("https://healthreport.zju.edu.cn/ncov/wap/default/index", ['geolocation'])
  if (argv.latitude && argv.longitude){
    await page.setGeolocation({latitude:argv.latitude, longitude:argv.longitude})
  }

  await page.goto('https://healthreport.zju.edu.cn/ncov/wap/default/index');

  await page.type('#username', argv.username);
  await page.type('#password', argv.password);

  // listener
  var is_verify_code_processing = true;
  var is_verify_code_recognized = false;
  var is_submitting = true;
  var is_successful = false;
  page.on('response', async response => {
    // listen verifyCode
    if (response.url().startsWith('https://healthreport.zju.edu.cn/ncov/wap/default/code')) {
      const img = await response.buffer();
      await tesseract
        .recognize(img, config)
        .then((text) => {
          return text.replace(/[^A-Z]/gi, '');
        })
        .then(async (text) => {
          console.log(text)
          if (text.length == 4 && text[0]<text[1] && text[1]<text[2] && text[2]<text[3]){
            await page.type('input[name="verifyCode"]', text);
            is_verify_code_recognized = true;
          }
        })
        .catch((error) => {
          console.log(error.message);
        })
        is_verify_code_processing = false;
    }

    // listen save success
    if (response.url() == 'https://healthreport.zju.edu.cn/ncov/wap/default/save') {
      const rsp_json = await response.json();
      is_submitting = false;
      console.log(rsp_json);
      if (rsp_json['e'] == '0'){
        is_successful = true;
      }
    }
  });

  // login
  await page.click('#dl');
  await page.waitForNavigation();

  var submission_count = 0;
  while (!is_successful && ++submission_count<max_submission_count){
    console.log('start processing', submission_count)
    if (submission_count>1){
      page.goto('https://healthreport.zju.edu.cn/ncov/wap/default/index');
      page.waitForNavigation()
    }

    // 是否在校
    await page.click('div[name="sfzx"] > div > div:nth-child(1)');

    // area
    console.log('getting area');
    await page.click('div[name="area"] > input[type=text]');

    // 是否确认信息属实
    await page.click('div[name="sfqrxxss"] > div > div:nth-child(1)');
    // await page.screenshot({ path: 'form_filled.png' });

    // verifyCode
    var vc_count = 0;
    while (is_verify_code_processing){
      console.log('waiting for verify_code_processing');
      await page.waitForTimeout(100);
    }
    while (!is_verify_code_recognized && ++vc_count<max_vc_count_per_submission){
      console.log('requesting new verifyCode');
      is_verify_code_processing = true;
      await page.click('input[name="verifyCode"] + span > img');
      while (is_verify_code_processing){
        console.log('waiting for verify_code_processing');
        await page.waitForTimeout(100);
      }
    }

    // submit
    await page.click('div.list-box > div.footers > a'),
    // await page.screenshot({ path: 'submit_clicked.png' });

    // confirm
    is_submitting = true;
    await page.click('div.wapcf-btn.wapcf-btn-ok')
    .catch((error) => {
      console.log('确认提交按钮未找到。打过卡了？');
      process.exit();
    })
    while (is_submitting){
      console.log('waiting for submission');
      await page.waitForTimeout(100);
    }
    // await page.screenshot({ path: 'wapcf-btn-ok_clicked.png' });
  }

  await browser.close();
})();