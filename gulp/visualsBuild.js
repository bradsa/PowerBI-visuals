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
    merge = require("merge2"),
    path = require("path"),
    concat = require("gulp-concat"),
    sourcemaps = require("gulp-sourcemaps"),
    uglify = require("gulp-uglifyjs"),
    rename = require("gulp-rename"),
    runSequence = require("run-sequence"),
    ts = require("gulp-typescript"),
    less = require("gulp-less"),
    minifyCSS = require("gulp-minify-css"),
    tslint = require("gulp-tslint"),
    spritesmith = require("gulp.spritesmith"),
    cliParser = require("./cliParser.js"),
    common = require("./utils.js"),
    visualsCommon = require("./visualsCommon.js");

var filesOption = common.getOptionFromCli(cliParser.cliOptions.files);
var jsUglifyOptions = {
    compress: {
        drop_console: true,
        pure_funcs: [
            "debug.assertValue",
            "debug.assertFail",
            "debug.assert",
            "debug.assertAnyValue"
        ],
        warnings: false,
        dead_code: true,
        sequences: true,
        properties: true,
        conditionals: true,
        comparisons: true,
        booleans: true,
        cascade: true,
        unused: true,
        loops: true,
        if_return: true,
        join_vars: true,
        global_defs: {
            "DEBUG": false
        }
    }
};
var internalsPaths = [
    "src/Clients/VisualsCommon/obj/VisualsCommon.js",
    "src/Clients/VisualsData/obj/VisualsData.js",
    "src/Clients/Visuals/obj/Visuals.js"];
var externalsPath = [
    "src/Clients/Externals/ThirdPartyIP/JQuery/2.1.3/jquery.min.js",
    "src/Clients/Externals/ThirdPartyIP/D3/d3.min.js",
    "src/Clients/Externals/ThirdPartyIP/D3/d3.plugin.boxWhisker.js",
    "src/Clients/Externals/ThirdPartyIP/LoDash/lodash.min.js",
    "src/Clients/Externals/ThirdPartyIP/GlobalizeJS/globalize.min.js",
    "src/Clients/Externals/ThirdPartyIP/GlobalizeJS/globalize.culture.en-US.js",
    "src/Clients/Externals/ThirdPartyIP/jqueryui/1.11.4/jquery-ui.min.js"];

module.exports.load = function (options) {
    var isRelease = Boolean(cliParser.cliOptions.release);
    if (options && typeof options.isRelease !== "undefined") {
        isRelease = options.isRelease;
    }

    var noTSEmitOnError = false;
    if (options && typeof options.noTSEmitOnError !== "undefined") {
        noTSEmitOnError = options.noTSEmitOnError;
    }

    var exported = {
        getBuildPaths: getBuildPaths,
        internalsPaths: internalsPaths,
        externalsPath: externalsPath,
        combineInternalDts: combineInternalDts,
        combineExternalDts: combineExternalDts,
        buildVisualsCommon: buildVisualsCommon,
        buildVisualsData: buildVisualsData,
        buildVisualsProjectTs: buildVisualsProjectTs,
        buildVisualsProjectSprite: buildVisualsProjectSprite,
        buildVisualsProjectLess: buildVisualsProjectLess,
        combineInternalJs: combineInternalJs,
        combineExternalJs: combineExternalJs,
        combineVisualJsAll: combineVisualJsAll,
        buildVisualsTestsTs: buildVisualsTestsTs,
        buildVisualsProject: buildVisualsProject,
        buildVisualsScripts: buildVisualsScripts,
        tslintVisuals: tslintVisuals,
        buildCustomVisuals: buildCustomVisuals
    };

    function getBuildPaths(projectPath, outFileName, includePaths) {
        // include _references.ts first
        var paths = [path.join(projectPath, "_references.ts")];

        if (includePaths && includePaths.length > 0) {
            paths = paths.concat(includePaths.map(function (path) {
                return projectPath + "/" + path;
            }));
        } else {
            paths.push(projectPath + "/**/*.ts");
        }

        paths.push("!" + projectPath + "/obj/**");
        paths.push("!" + projectPath + "/**/*.d.ts");

        return paths;
    }

    function getPathsForVisualsTests(paths) {
        var includePaths = [];

        if (paths && paths.length > 0) {
            includePaths.push("_references.ts");
            includePaths = includePaths.concat(paths.map(function (path) {
                return "visuals/" + path;
            }));
        }

        return includePaths;
    }

    function buildProject(projectPath, outFileName, includePaths) {
        var paths = getBuildPaths(projectPath, outFileName, includePaths);
        var srcResult = gulp.src(paths);
        if (!isRelease)
            srcResult = srcResult.pipe(sourcemaps.init());

        var tscResult = srcResult
            .pipe(ts({
                sortOutput: true,
                target: "ES5",
                declarationFiles: true,
                noEmitOnError: noTSEmitOnError,
                out: projectPath + "/obj/" + outFileName + ".js"
            }));

        if (!isRelease) {
            tscResult.js = tscResult.js.pipe(sourcemaps.write());
        }

        if (!isRelease) {
            return merge([tscResult.js.pipe(gulp.dest("./")),
                tscResult.dts.pipe(gulp.dest("./"))]);
        }
        else {
            return merge([tscResult.dts.pipe(gulp.dest("./")),
                tscResult.js
                    .pipe(uglify(outFileName + ".js", jsUglifyOptions))
                    .pipe(gulp.dest(projectPath + "/obj"))
            ]);
        }
    }

    function buildVisualsCommonTs() {
        return buildProject("src/Clients/VisualsCommon", "VisualsCommon");
    }

    function buildVisualsDataTs() {
        return buildProject("src/Clients/VisualsData", "VisualsData");
    }

    gulp.task("build:visualsProject:ts", function () {
        return buildVisualsProjectTs();
    });

    function buildVisualsProjectTs() {
        return buildProject("src/Clients/Visuals", "Visuals");
    }

    function buildVisualsPlaygroundTs() {
        return buildProject("src/Clients/PowerBIVisualsPlayground", "PowerBIVisualsPlayground");
    }

    gulp.task("build:visualsTests:ts", function () {
        return buildVisualsTestsTs();
    });

    function buildVisualsTestsTs() {
        return buildProject(
            "src/Clients/PowerBIVisualsTests",
            "PowerBIVisualsTests",
            getPathsForVisualsTests(filesOption));
    }

    gulp.task("build:visuals:sprite", function () {
        return buildVisualsProjectSprite();
    });

    function buildVisualsProjectSprite() {
        var spriteData = gulp.src("src/Clients/Visuals/images/sprite-src/*.png")
            .pipe(spritesmith({
                imgName: "images/visuals.sprites.png",
                cssName: "styles/sprites.less"
            }));

        return spriteData.pipe(gulp.dest("src/Clients/Visuals/"));
    }

    gulp.task("build:visuals:less", function () {
        return buildVisualsProjectLess(); 
    });

    function buildVisualsProjectLess() {
        var source,
            destination,
            fileName = "visuals.css";

        source = [
            "src/Clients/Externals/ThirdPartyIP/jqueryui/1.11.4/jquery-ui.min.css",
            "src/Clients/Visuals/styles/visuals.less"
        ];

        destination = [
            "build/styles",
            "src/Clients/PowerBIVisualsPlayground"
        ];

        return buildLess(source, destination, fileName);
    }

    function buildLess(sources, destinations, fileName) {
        sources = [].concat(sources);
        destinations = [].concat(destinations);

        var css =  gulp.src(sources)
            .pipe(less({
                modifyVars: { themeName: 'default' }
            }))
            .pipe(concat(fileName));

        if (isRelease) {
            css = css.pipe(minifyCSS());
        }

        return merge(destinations.map(function (destination) {
             return css.pipe(gulp.dest(destination))
        }));
    }

    function buildVisualsScripts() {
        return visualsCommon.runScriptSequence([
            combineInternalJs,
            combineExternalJs]);
    }

    function concatFilesWithSourceMap(source, outFileName) {
        var result = source;

        if (!isRelease) {
            result = result.pipe(sourcemaps.init({ loadMaps: true }));
        }

        result = result.pipe(concat(outFileName));

        if (!isRelease) {
            result = result.pipe(sourcemaps.write());
        }

        return result;
    }

    function combineInternalJs() {
        var srcResult = gulp.src(internalsPaths, {
            base: "build"
        });
        if (isRelease) {
            return concatFilesWithSourceMap(srcResult, "powerbi-visuals.js")
                .pipe(uglify("powerbi-visuals.js", jsUglifyOptions))
                .pipe(gulp.dest("build/scripts"))
                .pipe(gulp.dest("src/Clients/PowerBIVisualsPlayground"));
        }
        else {
            return concatFilesWithSourceMap(srcResult, "powerbi-visuals.js")
                .pipe(gulp.dest("build/scripts"))
                .pipe(gulp.dest("src/Clients/PowerBIVisualsPlayground"));
        }
    }

    function combineVisualJsAll() {
        var src = [
            "build/scripts/externals.min.js",
            "build/scripts/powerbi-visuals.js"];
        return concatFilesWithSourceMap(gulp.src(src), "powerbi-visuals.all.js")
            .pipe(gulp.dest("build/scripts"));
    }

    function combineExternalJs() {
        return gulp.src(externalsPath)
            .pipe(concat("externals.min.js"))
            .pipe(gulp.dest("build/scripts"))
            .pipe(gulp.dest("src/Clients/PowerBIVisualsPlayground"));
    }

    var tslintPaths = [
        "src/Clients/VisualsCommon/**/*.ts",
        "!src/Clients/VisualsCommon*/obj/*.*",
        "!src/Clients/VisualsCommon/**/*.d.ts",
        "src/Clients/VisualsData/**/*.ts",
        "!src/Clients/VisualsData*/obj/*.*",
        "!src/Clients/VisualsData/**/*.d.ts",
        "src/Clients/Visuals/**/*.ts",
        "!src/Clients/Visuals*/obj/*.*",
        "!src/Clients/Visuals/**/*.d.ts",
        "src/Clients/PowerBIVisualsTests/**/*.ts",
        "!src/Clients/PowerBIVisualsTests*/obj/*.*",
        "!src/Clients/PowerBIVisualsTests/**/*.d.ts",
        "src/Clients/PowerBIVisualsPlayground/**/*.ts",
        "!src/Clients/PowerBIVisualsPlayground*/obj/*.*",
        "!src/Clients/PowerBIVisualsPlayground/**/*.d.ts",
        "src/Clients/CustomVisuals/**/*.ts",
        "!src/Clients/CustomVisuals*/obj/*.*",
        "!src/Clients/CustomVisuals/**/*.d.ts"];

    gulp.task("tslint:visuals", function () {
        return tslintVisuals();
    });

    function tslintVisuals() {
        if (cliParser.cliOptions.noLint) {
            return;
        }
        return gulp.src(tslintPaths)
            .pipe(tslint())
            .pipe(tslint.report("verbose"));
    }


    function copyInternalDependenciesVisualsPlayground() {
        return gulp.src(["src/Clients/PowerBIVisualsPlayground/obj/PowerBIVisualsPlayground.js"])
            .pipe(rename("PowerBIVisualsPlayground.js"))
            .pipe(gulp.dest("src/Clients/PowerBIVisualsPlayground"));
    }

    function copyImageDependenciesVisualsPlayground() {
        return gulp.src(["src/Clients/Visuals/images/visuals.sprites.png"])
            .pipe(gulp.dest("src/Clients/PowerBIVisualsPlayground/images"));
    }

    gulp.task("build:visualsCommon", function () {
        return buildVisualsCommon();
    });

    function buildVisualsCommon() {
        return buildVisualsCommonTs();
    }

    gulp.task("build:visualsData", function () {
        return buildVisualsData();
    });

    function buildVisualsData() {
        return buildVisualsDataTs();
    }

    gulp.task("build:visualsProject", function () {
        return buildVisualsProject();
    });

    function buildVisualsProject() {
        return visualsCommon.runScriptSequence([
            buildVisualsProjectTs,
            buildVisualsProjectSprite,
            buildVisualsProjectLess]);
    }

    gulp.task("build:visuals:projects", function (callback) {
        gulp.task("build:visuals:scripts", function () {
            return buildVisualsScripts();
        });

        runSequence(
            "build:visualsCommon",
            "build:visualsData",
            "build:visualsProject",
            "build:visuals:scripts",
            "build:customVisuals",
            "build:visuals:playground",
            callback);
    });

    function buildCustomVisualsTS() {
        return buildProject("src/Clients/CustomVisuals", "CustomVisuals");
    }

    function copyCustomVisualsJsFile() {
        var scriptSrc = "src/Clients/CustomVisuals/obj/CustomVisuals.js",
            playgroundFolder = "src/Clients/PowerBIVisualsPlayground";

        return gulp.src(scriptSrc)
            .pipe(gulp.dest("build/scripts"))
            .pipe(gulp.dest(playgroundFolder));
    }

    gulp.task("build:customVisuals:ts", function () {
        return visualsCommon.runScriptSequence([
            buildCustomVisualsTS,
            copyCustomVisualsJsFile
        ]);
    });

    function buildCustomVisualsStyles() {
        var fileName = "CustomVisuals.css",
            sources,
            destinations;

        sources = [
            "src/Clients/CustomVisuals/styles/styles.less",
            "src/Clients/CustomVisuals/visuals/**/*.less"
        ];

        destinations = [
            "build/styles",
            "src/Clients/PowerBIVisualsPlayground"
        ];

        return buildLess(sources, destinations, fileName);
    }

    gulp.task("build:customVisuals:less", function () {
        return buildCustomVisualsStyles();
    });

    function buildCustomVisuals() {
        return visualsCommon.runScriptSequence([
            buildCustomVisualsTS,
            copyCustomVisualsJsFile,
            buildCustomVisualsStyles]);
    }

    gulp.task("build:customVisuals", function () {
        return buildCustomVisuals();
    });

    gulp.task("build:visuals:playground", function () {
        return visualsCommon.runScriptSequence([
            buildVisualsPlaygroundTs,
            copyInternalDependenciesVisualsPlayground,
            copyImageDependenciesVisualsPlayground]);
    });

    gulp.task("build:visuals", function (callback) {
        if (isRelease) {
            runSequence(
                "tslint:visuals",
                "build:visuals:projects",
                callback);
        }
        else {
            runSequence(
                "build:visuals:projects",
                callback);
        }
    });

    function combineInternalDts() {
        return combine({
            src: [
                "src/Clients/VisualsCommon/obj/VisualsCommon.d.ts",
                "src/Clients/VisualsData/obj/VisualsData.d.ts",
                "src/Clients/Visuals/obj/Visuals.d.ts"
            ],
            name: "powerbi-visuals.d.ts",
            destinationPath: "lib"
        });
    }

    function combineExternalDts() {
        return combine({
            src: [
            "src/Clients/Typedefs/jquery/jquery.d.ts",
            "src/Clients/Typedefs/d3/d3.d.ts"],
            name: "powerbi-externals.d.ts",
            destinationPath: "lib"
        });
    }

    function combine(options) {
        return gulp.src(options.src)
            .pipe(concat(options.name))
            .pipe(gulp.dest(options.destinationPath));
    }

    return exported;
};