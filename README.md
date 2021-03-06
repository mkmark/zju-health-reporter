# zju-health-reporter

浙大自动健康打卡

This tool reports status to healthreport.zju.edu.cn after a random time within 20 minutes (can be skipped by specifying '--now')

## prerequisite

need nodejs installed, then

```sh
git clone git@github.com:mkmark/zju-health-reporter.git
cd zju-health-reporter
```

then install dependencies

```sh
npm install
```

or

```sh
yarn install
```

## usage

```sh
node main.js
```

will show

```plain
Usage: node main.js [options]

Options:
      --version    Show version number                                 [boolean]
  -u, --username   username                                  [string] [required]
  -p, --password   password                                  [string] [required]
  -n, --latitude   latitude override
  -e, --longitude  longitude override
      --intl       use INTL id to login                                [boolean]
      --now        skip waiting                                        [boolean]
      --log        log                                                 [boolean]
  -h, --help       Show help                                           [boolean]

Examples:
  node main.js -u username -p password -n 30.000000 -e 120.0000000 --now --log

Missing required arguments: u, p
```

## example

```sh
node main.js -u username -p password --now
```
