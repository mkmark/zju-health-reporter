const MAX_VC_COUNT_PER_SUBMISSION = 7;
const MAX_SUBMISSION_COUNT = 3;

const FORM_URL = 'https://healthreport.zju.edu.cn/ncov/wap/default/index';
const LOGIN_URL = FORM_URL;
const INTL_LOGIN_URL = 'https://login.microsoftonline.com/292620c5-ae10-4553-accf-68ec80325008/oauth2/v2.0/authorize?client_id=b85e9cdb-5584-4536-9108-5136aa1db133&response_type=code&redirect_uri=https%3a%2f%2fzjuam.zju.edu.cn%2fcas%2flogin%3fclient_name%3dAdfsClient&scope=https%3A%2F%2Fgraph.microsoft.com%2FUser.read'
const SAVE_URL = 'https://healthreport.zju.edu.cn/ncov/wap/default/save';
const VC_URL_HEAD = 'https://healthreport.zju.edu.cn/ncov/wap/default/code';
const GEOAPI_URL_HEAD = 'https://restapi.amap.com/v3/geocode/regeo';

var IS_VC_PROCESSING = true;
var IS_VC_RECOGNIZED = false;
var IS_SUCCESSFUL = false;


// args
var argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Usage: node $0 [options]')
  .example('node $0 -u username -p password -n 30.000000 -e 120.0000000 --now --log')

  .alias('u', 'username')
  .nargs('u', 1)
  .describe('u', 'username')
  .string('u')
  .demandOption('u')

  .alias('p', 'password')
  .nargs('p', 1)
  .describe('p', 'password')
  .string('p')
  .demandOption('p')

  .alias('n', 'latitude')
  .nargs('n', 1)
  .describe('n', 'latitude override')

  .alias('e', 'longitude')
  .nargs('e', 1)
  .describe('e', 'longitude override')

  .describe('intl', 'use INTL id to login')
  .boolean('intl')

  .describe('now', 'skip waiting')
  .boolean('now')

  .describe('log', 'log')
  .boolean('log')

  .help('h')
  .alias('h', 'help')

  .argv;


// log
var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/' + argv.username + '.log', {flags : 'a'});
var log_stdout = process.stdout;

function append_time(s){
    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
    return localISOTime + ' ' + s
    // return new Date().toISOString() + ' ' + s
}

console.log = function(d) { //
  log_file.write(append_time(util.format(d)) + '\n');
  log_stdout.write(append_time(util.format(d)) + '\n');
};


const puppeteer = require('puppeteer');
// const tesseract = require("node-tesseract-ocr");
const tesseract_config = {
  lang: "eng",
  oem: 1,
  psm: 7,
};
var browser_config = {};
if (argv.log) {
  browser_config = {
    headless: true,
    args: [`--window-size=1920,3000,--lang=en-US,en`],
    defaultViewport: {
      width:1920,
      height:3000
    }
  }
}

function random_between(min, max) {  
  return Math.floor(
    Math.random() * (max - min) + min
  )
}

async function delay() {
  if (argv.now){
    console.log('skip sleeping')
  } else {
    ms = random_between(0, 1200000);
    console.log('start sleeping', ms)
    await sleep(ms);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function init(browser, page) {
  const context = browser.defaultBrowserContext()
  await context.overridePermissions(FORM_URL, ['geolocation'])

  // // listener
  // page.on('response', async response => {
  //   // listen verifyCode
  //   // console.log(response.url())
  //   if (response.url().startsWith(VC_URL_HEAD) && response.status() === 200) {
  //     const img = await response.buffer()
  //     .catch((error) => {
  //       console.log(error.message);
  //     });
  //     img && await tesseract
  //       .recognize(img, tesseract_config)
  //       .then((text) => {
  //         text = text.replace(/[^A-Z]/g, '');
  //         console.log('vc recognized ' + text)
  //         if (text.length == 4 && text[0]<text[1] && text[1]<text[2] && text[2]<text[3]){
  //           page.type('input[name="verifyCode"]', text);
  //           IS_VC_RECOGNIZED = true;
  //         }
  //       })
  //       .catch((error) => {
  //         console.log(error.message);
  //       })
  //       IS_VC_PROCESSING = false;
  //   }
  // });
}

async function login(browser, page) {
  console.log('logging in');
  await page.goto(LOGIN_URL);

  await page.type('#username', argv.username);
  await page.type('#password', argv.password);

  await page.click('#dl');
  await page.waitForNavigation({ waitUntil: "networkidle0" });
}

async function login_intl(browser, page) {
  console.log('logging in using intl');
  await page.goto(INTL_LOGIN_URL, {waitUntil: 'networkidle0'});

  await page.waitForSelector('input[name="loginfmt"]');
  await page.type('input[name="loginfmt"]', argv.username);
  await page.waitForSelector('input[value="Next"]');
  await page.click('input[value="Next"]');

  await page.type('input[name="passwd"]', argv.password);
  await page.waitForSelector('input[value="Sign in"]');
  await page.click('input[value="Sign in"]');

  await page.waitForSelector('input[value="No"]');
  await page.click('input[value="No"]');

  await page.waitForNavigation({ waitUntil: "networkidle0" });

  await page.goto(FORM_URL, {waitUntil: 'networkidle0'});
}

async function fill_form(browser, page) {
  await page.waitForFunction(() => typeof vm === 'object');

  // 是否在校
  if (await page.evaluate(() => vm.oldInfo.sfzx) == '1'){
    await page.click('div[name="sfzx"] > div > div:nth-child(1)');
  } else {
    await page.click('div[name="sfzx"] > div > div:nth-child(2)');
    await page.click('div[name="sfymqjczrj"] > div > div:nth-child(2)');
    await page.click('div[name="ismoved"] > div > div:nth-child(4)');
  }

  // area
  if (argv.latitude && argv.longitude){
    await page.setGeolocation({latitude:argv.latitude, longitude:argv.longitude})
  } else {
    let geo_api_info_str = await page.evaluate(() => vm.oldInfo.geo_api_info);
    let geo_api_info = JSON.parse(geo_api_info_str);
    if (geo_api_info.position.lat && geo_api_info.position.lng) {
      console.log('use old location ', geo_api_info.position.lat, geo_api_info.position.lng)
      await page.setGeolocation({latitude:geo_api_info.position.lat, longitude:geo_api_info.position.lng})
    } else {
      console.log('fail to get location, exiting.');
      await browser.close();
      process.exit();
    }
  }
  console.log('getting area');
  await page.click('div[name="area"] > input[type=text]');
  await page.waitForResponse(response => response.url().startsWith(GEOAPI_URL_HEAD) && response.status() === 200);

  // 是否确认信息属实
  await page.click('div[name="sfqrxxss"] > div > div:nth-child(1)');

  argv.log && await page.screenshot({ path: 'form_filled.png' });
}

async function fill_vc(browser, page) {
  var vc_count = 0;
  let vc_processing_time = 0;
  while (IS_VC_PROCESSING && vc_processing_time < 5000){
    console.log('waiting for verify_code_processing');
    vc_processing_time += 100;
    await page.waitForTimeout(100);
  }
  while (!IS_VC_RECOGNIZED && ++vc_count<MAX_VC_COUNT_PER_SUBMISSION){
    console.log('requesting new verifyCode');
    IS_VC_PROCESSING = true;
    await page.click('input[name="verifyCode"] + span > img');
    vc_processing_time = 0;
    while (IS_VC_PROCESSING && vc_processing_time < 5000){
      console.log('waiting for verify_code_processing');
      vc_processing_time += 100;
      await page.waitForTimeout(100);
    }
  }
  if (!IS_VC_RECOGNIZED){
    console.log('verifyCode error for too many times. Something is wrong. Exiting.');
    await browser.close();
    process.exit();
  }
}

async function try_submit(browser, page) {
  // fill the form
  await fill_form(browser, page)

  // verifyCode
  // await fill_vc(browser, page)

  // submit
  await page.click('div.list-box > div.footers > a'),
  argv.log && await page.screenshot({ path: 'submit_clicked.png' });

  // confirm
  await page.click('div.wapcf-btn.wapcf-btn-ok')
  .catch(async (error) => {
    await page.screenshot({ path: 'error.png' });
    console.log('确认提交按钮未找到。请查看error.png。');
    await browser.close();
    process.exit();
  })
  let response_save;
  await page.waitForResponse(
    async response => {
      if (response.url() == SAVE_URL && response.status() === 200){
        response_save = response;
        return true;
      } else {
        return false;
      }
    }
  );
  argv.log && await page.screenshot({ path: 'wapcf-btn-ok_clicked.png' });

  let response_save_json = await response_save.json();
  console.log(response_save_json);
  if (response_save_json['e'] == 0){
    IS_SUCCESSFUL = true;
  } else {
    await page.screenshot({ path: 'error.png' });
    console.log('提交失败。请查看error.png。');
  }
}

async function submit(browser, page) {
  var submission_count = 0;
  while (!IS_SUCCESSFUL && submission_count++<MAX_SUBMISSION_COUNT){
    console.log('start processing ' + submission_count)
    if (submission_count>1){
      // IS_VC_RECOGNIZED = false;
      await page.reload({ waitUntil: ["networkidle0"] });
    }
    await try_submit(browser, page);
  }

  if (!IS_SUCCESSFUL){
    console.log('Submission error for too many times. Something is wrong. Exiting.');
  }
}

async function main(){
  await delay();
  const browser = await puppeteer.launch(browser_config);
  const page = await browser.newPage();
  await init(browser, page);
  if (argv.intl){
    await login_intl(browser, page);
  } else {
    await login(browser, page);
  }
  await submit(browser, page);
  await browser.close();
}

main();
