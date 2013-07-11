#!/usr/bin/env node

/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var http = require('http');

var CHECKSFILE_DEFAULT = "checks.json";

var assertFileExists = function(infile) {
  var instr = infile.toString();
  if (!fs.existsSync(instr)) {
    console.log("%s does not exist. Exiting.", instr);
    process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
  }
  return instr;
};

var assertURLExists = function(inurl, callback) {
  http.get(inurl, function(res) {
    callback("fine");
  }).on('error', function(e) {
    callback("error");
  });
}

var cheerioHtmlFile = function(htmlfile, callback) {
  // Check whether we got an url or a file.
  // Note that this is actually a hack cause the URL could
  // have a different format. A simple https:// could crash
  // the whole thing.
  if (htmlfile.indexOf("http://") !== -1) {
    rest.get(htmlfile).on('complete', function(result) {
      if (result instanceof Error) {
        // Return empty result if URL not available.
        callback("");
      } else {
        callback(cheerio.load(result));
      }
    });
  } else {
    callback(cheerio.load(fs.readFileSync(htmlfile)));
  }
};

var loadChecks = function(checksfile) {
  return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtmlFile = function(htmlfile, checksfile, callback) {
  cheerioHtmlFile(htmlfile, function(result) {
    // First check if we got a result
    if (result !== "") {
      var checks = loadChecks(checksfile).sort();
      var out = {};

      for (var ii in checks) {
        var present = result(checks[ii]).length > 0;
        out[checks[ii]] = present;
      }

      // Return the results
      callback(out);
    } else {
      callback();
    }
  });
};

var clone = function(fn) {
  // Workaround for commander.js issue.
  // http://stackoverflow.com/a/6772648
  return fn.bind({});
};

if (require.main == module) {
  program
    .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
    .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists))
    .option('-u, --url <html_file>', 'URL of index.html')
    .parse(process.argv);

  if (program.file) { // Call to asynchronous checkHtmlFile which starts the checking process.
    checkHtmlFile(program.file, program.checks, function(result) {
      var outJson = JSON.stringify(result, null, 4);
      console.log(outJson);

      process.exit(1);
    });
  } else {
    assertURLExists(program.url, function(error) {
      if (error == "error") {
        console.log("%s does not exist. Exiting.", program.url);
        process.exit(1);
      } else {
        // Call to asynchronous checkHtmlFile which starts the checking process.
        checkHtmlFile(program.url, program.checks, function(result) {
          var outJson = JSON.stringify(result, null, 4);
          console.log(outJson);

          process.exit(1);
        });
      }
    });
  }

} else {
  exports.checkHtmlFile = checkHtmlFile;
}