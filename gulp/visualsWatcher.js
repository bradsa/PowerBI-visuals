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
    tslint = require("gulp-tslint"),
    gutil = require("gulp-util"),
    visualsBuild = require("./visualsBuild.js"),
    visualsBuildDefault = visualsBuild.load();

var lessFilesToWatch = [
    "src/Clients/Externals/ThirdPartyIP/jqueryui/1.11.4/jquery-ui.min.css",
    "src/Clients/Visuals/styles/*.less",
    "src/Clients/StyleLibrary/less/*.less",
    "src/Clients/PowerBI/styles/*.less",
    "src/Clients/Visuals/images/visuals.sprites.png",
    "src/Clients/Visuals/styles/sprites.less"
];

var customVisualsLessFilesToWatch = [
    "src/Clients/CustomVisuals/styles/styles.less",
    "src/Clients/CustomVisuals/visuals/**/*.less"
];

var lintErrors = false;
var lintReporter = function (output, file, options) {
    if (output.length > 0) {
        lintErrors = true;
    }
    // file is a reference to the vinyl File object 
    console.log("Found " + output.length + " errors in " + file.path);
    for (var i = 0; i < output.length; i++) {
        var outputItem = output[i];
        var message = " line:" + outputItem.endPosition.line + ", char:" + outputItem.endPosition.character + ", message: " + outputItem.failure;
        gutil.log(
            "TsLint Error " + i + ": ",
            "",
            gutil.colors.red(message)
        );
    }
    waitingMessageLog();
};

gulp.task("start:watchers", function (callback) {
    watchProjectBuild(
        "src/Clients/VisualsCommon",
        "VisualsCommon",
        "build:visualsCommon");
    watchProjectBuild(
        "src/Clients/VisualsData",
        "VisualsData",
        "build:visualsData");
    watchProjectBuild(
        "src/Clients/Visuals",
        "Visuals",
        "build:visualsProject:ts");
    watchProjectBuild(
        "src/Clients/CustomVisuals",
        "CustomVisuals",
        "build:customVisuals:ts");
    watchProjectBuild(
        "src/Clients/PowerBIVisualsPlayground",
        "PowerBIVisualsPlayground",
        "build:visuals:playground",
        waitingMessageLog);

    watchProjectFiles("src/Clients/Visuals/images/sprite-src/*.png", "build:visuals:sprite");
    watchProjectFiles(lessFilesToWatch, "build:visuals:less", waitingMessageLog);
    watchProjectFiles(customVisualsLessFilesToWatch, "build:customVisuals:less", waitingMessageLog);
    watchProjectFiles(visualsBuildDefault.externalsPath, "combine:visuals:externalJs", waitingMessageLog);
    watchProjectFiles(visualsBuildDefault.internalsPaths, "combine:visuals:internalJs", waitingMessageLog);

    gulp.task("combine:visuals:internalJs", function () {
        return visualsBuildDefault.combineInternalJs();
    });

    gulp.task("combine:visuals:externalJs", function () {
        return visualsBuildDefault.combineExternalJs();
    });

    serviceMessageLog("Continuous build successfully started");
    waitingMessageLog();
});

function waitingMessageLog() {
    serviceMessageLog("Waiting for changes...");
}

function serviceMessageLog(message) {
    gutil.log("", "", gutil.colors.magenta(message));
}

function watchProjectFiles(files, taskToRun, callback) {
    if (callback) {
        gulp.watch(files).on("change", function (file) {
            runSequence(taskToRun, callback);
        });
    }
    else {
        gulp.watch(files, [taskToRun]);
    }
}

function watchProjectBuild(projectPath, projectName, buildTask, callback) {
    gulp.watch(visualsBuildDefault.getBuildPaths(projectPath, projectName)).on("change", function (file) {
        lintErrors = false;
        gulp.src(file.path).pipe(tslint()).pipe(tslint.report(lintReporter).on("error", function (error) { })
            .on("end", function () {
                if (!lintErrors) {
                    if (callback) {
                        runSequence(buildTask, callback);
                    } else {
                        runSequence(buildTask);
                    }
                }
            }));
    });
}

gulp.task("init:visuals:release", function (callback) {
    visualsBuild.load({ isRelease: true, noTSEmitOnError: true });
    runSequence(
        "build:visuals:projects",
        "start:watchers",
        callback);
});

gulp.task("init:visuals", function (callback) {
    visualsBuild.load({ noTSEmitOnError: true });
    runSequence(
        "build:visuals:projects",
        "start:watchers",
        callback);
});

