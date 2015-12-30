/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */
var gulp = require("gulp"),
    runSequence = require("run-sequence"),
    rename = require("gulp-rename"),
    fs = require("fs"),
    jasmineBrowser = require("gulp-jasmine-browser"),
    common = require("./utils.js"),
    cliParser = require("./cliParser.js"),
    visualsCommon = require("./visualsCommon.js"),
    visualsBuildDebug = require("./visualsBuild.js").load(),
    visualsBuildRelease = require("./visualsBuild.js").load({ isRelease: true }),
    visualsDownload = require("./visualsDownload.js");

var openInBrowser = Boolean(cliParser.cliOptions.openInBrowser);

var filesOption = common.getOptionFromCli(cliParser.cliOptions.files);

function copyInternalDependencies() {
    return gulp.src([
        "src/Clients/PowerBIVisualsTests/obj/PowerBIVisualsTests.js"])
        .pipe(rename("powerbi-visuals-tests.js"))
        .pipe(gulp.dest("VisualsTests"));
}

function copyExternalDependencies() {
    return gulp.src([
        "build/styles/visuals.css",
        "build/scripts/powerbi-visuals.all.js",

        "build/styles/CustomVisuals.css",
        "build/scripts/CustomVisuals.js",

        "src/Clients/externals/ThirdPartyIP/JasmineJQuery/jasmine-jquery.js",
        "src/Clients/externals/ThirdPartyIP/MomentJS/moment.min.js",
        "src/Clients/externals/ThirdPartyIP/Velocity/velocity.min.js",
        "src/Clients/externals/ThirdPartyIP/Velocity/velocity.ui.min.js",
        "src/Clients/externals/ThirdPartyIP/QuillJS/quill.min.js",

        "node_modules/jasmine-core/lib/jasmine-core/jasmine.js",
        "node_modules/jasmine-core/lib/jasmine-core/jasmine-html.js",
        "node_modules/jasmine-core/lib/jasmine-core/boot.js",
        "node_modules/jasmine-core/lib/jasmine-core/jasmine.css"
    ]).pipe(gulp.dest("VisualsTests"));
}

function addLink(link) {
    return '<link rel="stylesheet" type="text/css" href="' + link + '"/>';
}

function addScript(script) {
    return '<script type="text/javascript" src="' + script + '"></script>';
}

function addPaths(paths) {
    var cssExtension = /.+\.css/,
        jsExtension = /.+\.js/;

    return (paths.map(function (path) {
        if (jsExtension.test(path)) {
            return addScript(path);
        } else if (cssExtension.test(path)) {
            return addLink(path);
        }
    })).join("");
}

function addTestName(testName) {
    if (testName && testName.length > 0) {
        var specName = "?spec=" + encodeURI(testName);

        return "<script>" + "if (window.location.search !=='" + specName + "') {" +
            "window.location.search = '" + specName + "';}</script>";
    } else {
        return "";
    }
}

function createHtmlTestRunner(fileName, paths, testName) {
    var html = "<!DOCTYPE html><html>",
        head =
            "<head>" +
            '<meta charset="utf-8">' +
            "<title>Jasmine Spec Runner</title>" +
            addPaths(paths) +
            addTestName(testName) + "</head>",
        body = "<body></body>";

    html = html + head + body + "</html>";

    fs.writeFileSync(fileName, html);
}

gulp.task("run:test:visuals", function (callback) {
    return runTestVisuals(callback);
});

function runTestVisuals(callback) {
    var testFolder = "VisualsTests",
        specRunnerFileName = "runner.html",
        specRunnerPath = testFolder + "/" + specRunnerFileName,
        src = [
            "visuals.css",
            "CustomVisuals.css",
            "powerbi-visuals.all.js",
            "CustomVisuals.js",
            "jasmine-jquery.js",
            "velocity.min.js",
            "velocity.ui.min.js",
            "quill.min.js",
            "moment.min.js",
            "powerbi-visuals-tests.js"
        ],
        jasminePaths = [
            "jasmine.css",
            "jasmine.js",
            "jasmine-html.js",
            "boot.js"
        ];

    createHtmlTestRunner(
        specRunnerPath,
        jasminePaths.concat(src),
        common.getOptionFromCli(openInBrowser)[0]
        );

    if (openInBrowser) {
        visualsCommon.runHttpServer({
            path: testFolder,
            port: 3001,
            index: specRunnerFileName
        }, callback);
    } else {
        return gulp.src(src, { cwd: testFolder })
            .pipe(jasmineBrowser.specRunner({ console: true }))
            .pipe(jasmineBrowser.headless());
    }
}

gulp.task("test:visuals:performance", function (callback) {
    filesOption.push("performance/performanceTests.ts");
    runSequence("test:visuals", callback);
});

gulp.task("test:visuals", function (callback) {
    testVisuals(callback);
});

function testVisuals(callback) {
    return visualsCommon.runScriptSequence([
        buildVisuals,
        buildVisualsTests,
        runTestVisuals,
        callback
    ]);
}

function buildVisuals() {
    var isDebug = Boolean(cliParser.cliOptions.debug);
    var buildingVisualsLog = function () {
        console.log('Building visuals...');
    };
    if (isDebug) {
        return visualsCommon.runScriptSequence([
            buildingVisualsLog,
            visualsBuildDebug.buildVisualsCommon,
            visualsBuildDebug.buildVisualsData,
            visualsBuildDebug.buildVisualsProject,
            visualsBuildDebug.buildVisualsScripts,
            visualsBuildDebug.buildCustomVisuals
        ]);
    }
    else {
        var tsLintLog = function () {
            if (!cliParser.cliOptions.noLint) {
                console.log('Linting TypeScript...');
            }
        };
        return visualsCommon.runScriptSequence([
            tsLintLog,
            visualsBuildRelease.tslintVisuals,
            buildingVisualsLog,
            visualsBuildRelease.buildVisualsCommon,
            visualsBuildRelease.buildVisualsData,
            visualsBuildRelease.buildVisualsProject,
            visualsBuildRelease.buildVisualsScripts,
            visualsBuildRelease.buildCustomVisuals,
        ]);
    }
}

gulp.task("build:visualsTests", function () {
    return buildVisualsTests();
});

function buildVisualsTests() {
    // by default, tests are build in release mode
    // but if debug flag exists, then we have to build in debug mode
    var isDebug = Boolean(cliParser.cliOptions.debug);
    var tsBuildMode = isDebug ? visualsBuildDebug : visualsBuildRelease;
    return visualsCommon.runScriptSequence([
        tsBuildMode.buildVisualsTestsTs,
        visualsDownload.installJasmine,
        visualsDownload.installPhantomjs,
        tsBuildMode.combineVisualJsAll,
        copyInternalDependencies,
        copyExternalDependencies
    ]);
}

gulp.task("open:test:visuals", function (callback) {
    openInBrowser = true;
    testVisuals(callback);
});