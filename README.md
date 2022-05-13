# zju-health-reporter

浙大自动健康打卡

This tool reports status to healthreport.zju.edu.cn

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
  -u, --username   username                                           [required]
  -p, --password   password                                           [required]
  -n, --latitude   latitude
  -e, --longitude  longitude
  -h, --help       Show help                                           [boolean]

Examples:
  node main.js -u username -p password -n 30.000000 -e 120.0000000

Missing required arguments: u, p
```

## example

```
node main.js -u username -p password -n 30.000000 -e 120.0000000
```
Get your precise location from a map, do not use this example!
