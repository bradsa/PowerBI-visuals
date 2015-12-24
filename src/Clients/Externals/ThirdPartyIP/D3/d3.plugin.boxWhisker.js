(function () {
    // Inspired by http://informationandvisualization.de/blog/box-plot
    d3.box = function () {
        var width = 1,
            height = 1,
            duration = 0,
            domain = null,
            range = null,
            value = Number,
            whiskers = boxWhiskers,
            quartiles = boxQuartiles,
            showLabels = true, // whether or not to show text labels
            showDataPoints = true, //whether or not to show data points
            numBars = 4,
            curBar = 1,
            tickFormat = null;

        // For each small multiple…
        function box(g) {
            g.each(function (data, i) {

                // each data entry is now a type with the following properties
                var d = data.Points;

                var g = d3.select(this),
                    n = data.ComputeFromPoints ? data.Points.length : data.NumDataPoints,
                    min = data.Minimum,
                    max = data.Maximum;

                // Compute mean. Must return exactly 1 element.
                var meanData;
                var whiskerData, outlierData;
                var quartileData;

                if (data.ComputeFromPoints) {
                    d = data.Points = data.Points.sort(d3.ascending);
                    meanData = mean(d);
                    quartileData = quartiles(d);
                    data.Q1 = quartileData[0];
                    data.Median = quartileData[1];
                    data.Q3 = quartileData[2];
                    data.LowWhisker = d3.quantile(data.Points, 0.05);
                    data.HighWhisker = d3.quantile(data.Points, 0.95);
                    data.Mean = meanData;

                    // Compute whiskers. Must return exactly 2 elements, or null.
                    var whiskerIndices = whiskers && whiskers.call(this, data, i);
                    whiskerData = whiskerIndices && whiskerIndices.map(function (i) { return d[i]; });

                    // Compute outliers. If no whiskers are specified, all data are "outliers".
                    // We compute the outliers as indices, so that we can join across transitions!
                    var outlierIndices = whiskerIndices
                        ? d3.range(0, whiskerIndices[0]).concat(d3.range(whiskerIndices[1] + 1, n))
                        : d3.range(n);
                    outlierData = outlierIndices.map(function (i) { return d[i]; });
                }
                else {
                    quartileData = [data.Q1, data.Median, data.Q3];
                    whiskerData = [data.LowWhisker, data.HighWhisker];
                    outlierData = data.Outliers;
                    meanData = data.Mean;
                }

                // Compute the new x-scale.
                var x1 = d3.scale.linear()
                    .domain(domain && domain.call(this, d, i) || [min, max])
                    .range(range && range.call(this, d, i) || [height, 0]);

                // Note: the box, median, and box tick elements are fixed in number,
                // so we only have to handle enter and update. In contrast, the outliers
                // and other elements are variable, so we need to exit them! Variable
                // elements also fade in and out.

                // Update center line: the vertical line spanning the whiskers.
                var center = g.selectAll("line.center")
                    .data(whiskerData ? [whiskerData] : []);

                //vertical line
                center.enter().insert("line", "rect")
                    .attr("class", "center")
                    .attr("x1", width / 2)
                    .attr("x2", width / 2)
                    .attr("y1", function (d) { return x1(d[0]); })
                    .attr("y2", function (d) { return x1(d[1]); });

                center.exit().transition()
                    .duration(duration)
                    .style("opacity", 1e-6)
                    .attr("y1", function (d) { return x1(d[0]); })
                    .attr("y2", function (d) { return x1(d[1]); })
                    .remove();

                // Update innerquartile box.
                var box = g.selectAll("rect.box")
                    .data([quartileData]);

                box.enter().append("rect")
                    .attr("class", "box")
                    .attr("x", 0)
                    .attr("width", width)
                    .attr("y", function (d) { return x1(d[2]); })
                    .attr("height", function (d) { return x1(d[0]) - x1(d[2]); });

                // Update median line.
                var medianLine = g.selectAll("line.median")
                    .data([quartileData[1]]);

                medianLine.enter().append("line")
                    .attr("class", "median")
                    .attr("x1", 0)
                    .attr("x2", width)
                    .attr("y1", x1)
                    .attr("y2", x1);

                // Update mean.
                var meanPoint = g.selectAll("circle")
                .data([meanData], Number);

                meanPoint.enter().insert("circle", "text")
                    .attr("class", "mean")
                    .attr("r", 4)
                    .attr("cx", width * 3 / 4)
                    .attr("cy", function (i) { return x1(meanData); })

                meanPoint.exit().transition()
                    .duration(duration)
                    .attr("cy", function (i) { return x1(meanData); })
                    .remove();

                // Update whiskers.
                var whisker = g.selectAll("line.whisker")
                    .data(whiskerData || []);

                whisker.enter().insert("line", "circle, text")
                    .attr("class", "whisker")
                    .attr("x1", 0)
                    .attr("x2", 0 + width)
                    .attr("y1", x1)
                    .attr("y2", x1);

                whisker.exit().transition()
                    .duration(duration)
                    .attr("y1", x1)
                    .attr("y2", x1)
                    .remove();

                // Update outliers.
                var outlier = g.selectAll("circle.outlier")
                    .data(outlierData, Number);

                outlier.enter().insert("circle", "text")
                    .attr("class", "outlier")
                    .attr("r", 3)
                    .attr("cx", width / 2)
                    .attr("cy", function (i) { return x1(i); });

                outlier.exit().transition()
                    .duration(duration)
                    .attr("cy", function (i) { return x1(i); })
                    .remove();

                if (showDataPoints == true) {
                    var nonOutliers = d3.set(d);
                    outlierData.forEach(function (i) { nonOutliers.remove(i); });
                    var dataPlot = g.selectAll("circle.datapoint")
                        .data(nonOutliers.values(), Number);

                    dataPlot.enter().insert("circle", "text")
                        .attr("class", "datapoint")
                        .attr("r", 3)
                        .attr("cx", width / 2)
                        .attr("cy", function (i) { return x1(i); });

                    dataPlot.exit().transition()
                        .duration(duration)
                        .attr("cy", function (i) { return x1(i); })
                        .remove();
                }

                // Compute the tick format.
                var format = tickFormat || x1.tickFormat(8);

                // Update box ticks.
                var boxTick = g.selectAll("text.box")
                    .data(quartileData);
                if (showLabels == true) {
                    boxTick.enter().append("text")
                        .attr("class", "box")
                        .attr("dy", ".3em")
                        .attr("dx", function (d, i) { return i & 1 ? 6 : -6 })
                        .attr("x", function (d, i) { return i & 1 ? +width : 0 })
                        .attr("y", x1)
                        .attr("text-anchor", function (d, i) { return i & 1 ? "start" : "end"; })
                        .text(format);
                }

                boxTick.transition()
                    .duration(duration)
                    .text(format)
                    .attr("y", x1);

                // Update whisker ticks. These are handled separately from the box
                // ticks because they may or may not exist, and we want don't want
                // to join box ticks pre-transition with whisker ticks post-.
                var whiskerTick = g.selectAll("text.whisker")
                    .data(whiskerData || []);
                if (showLabels == true) {
                    whiskerTick.enter().append("text")
                        .attr("class", "whisker")
                        .attr("dy", ".3em")
                        .attr("dx", 6)
                        .attr("x", width)
                        .text(format)
                        .attr("y", x1)
                        .style("opacity", 1);
                }

                whiskerTick.exit().transition()
                    .duration(duration)
                    .attr("y", x1)
                    .style("opacity", 1e-6)
                    .remove();
            });
            d3.timer.flush();
        }

        box.width = function (x) {
            if (!arguments.length) return width;
            width = x;
            return box;
        };

        box.height = function (x) {
            if (!arguments.length) return height;
            height = x;
            return box;
        };

        box.tickFormat = function (x) {
            if (!arguments.length) return tickFormat;
            tickFormat = x;
            return box;
        };

        box.duration = function (x) {
            if (!arguments.length) return duration;
            duration = x;
            return box;
        };

        box.domain = function (x) {
            if (!arguments.length) return domain;
            domain = x == null ? x : d3.functor(x);
            return box;
        };

        box.range = function (x) {
            if (!arguments.length) return range;
            range = x == null ? x : d3.functor(x);
            return box;
        }

        box.value = function (x) {
            if (!arguments.length) return value;
            value = x;
            return box;
        };

        box.whiskers = function (x) {
            if (!arguments.length) return whiskers;
            whiskers = x;
            return box;
        };

        box.showLabels = function (x) {
            if (!arguments.length) return showLabels;
            showLabels = x;
            return box;
        };

        box.showDataPoints = function (x) {
            if (!arguments.length) return showDataPoints;
            showDataPoints = x;
            return box;
        };

        box.quartiles = function (x) {
            if (!arguments.length) return quartiles;
            quartiles = x;
            return box;
        };

        box.mean = function (x) {
            if (!arguments.length) return mean;
            mean = x;
            return box;
        };

        return box;
    };

    function mean(d) {
        return d3.mean(d);
    }

    function boxWhiskers(d) {
        return [0, d.length - 1];
    }

    function boxQuartiles(d) {
        return [
          d3.quantile(d, .25),
          d3.quantile(d, .5),
          d3.quantile(d, .75)
        ];
    }

})();
(function () {
    // Inspired by http://informationandvisualization.de/blog/box-plot
    d3.box = function () {
        var width = 1,
            height = 1,
            duration = 0,
            domain = null,
            range = null,
            value = Number,
            whiskers = boxWhiskers,
            quartiles = boxQuartiles,
            showLabels = true, // whether or not to show text labels
            showDataPoints = true, //whether or not to show data points
            numBars = 4,
            curBar = 1,
            tickFormat = null;

        // For each small multiple…
        function box(g) {
            g.each(function (data, i) {

                // each data entry is now a type with the following properties
                var d = data.Points;

                var g = d3.select(this),
                    n = data.ComputeFromPoints ? data.Points.length : data.NumDataPoints,
                    min = data.Minimum,
                    max = data.Maximum;

                // Compute mean. Must return exactly 1 element.
                var meanData;
                var whiskerData, outlierData;
                var quartileData;

                if (data.ComputeFromPoints) {
                    d = data.Points = data.Points.sort(d3.ascending);
                    meanData = mean(d);
                    quartileData = quartiles(d);
                    data.Q1 = quartileData[0];
                    data.Median = quartileData[1];
                    data.Q3 = quartileData[2];
                    data.LowWhisker = d3.quantile(data.Points, 0.05);
                    data.HighWhisker = d3.quantile(data.Points, 0.95);
                    data.Mean = meanData;

                    // Compute whiskers. Must return exactly 2 elements, or null.
                    var whiskerIndices = whiskers && whiskers.call(this, data, i);
                    whiskerData = whiskerIndices && whiskerIndices.map(function (i) { return d[i]; });

                    // Compute outliers. If no whiskers are specified, all data are "outliers".
                    // We compute the outliers as indices, so that we can join across transitions!
                    var outlierIndices = whiskerIndices
                        ? d3.range(0, whiskerIndices[0]).concat(d3.range(whiskerIndices[1] + 1, n))
                        : d3.range(n);
                    outlierData = outlierIndices.map(function (i) { return d[i]; });
                }
                else {
                    quartileData = [data.Q1, data.Median, data.Q3];
                    whiskerData = [data.LowWhisker, data.HighWhisker];
                    outlierData = data.Outliers;
                    meanData = data.Mean;
                }

                // Compute the new x-scale.
                var x1 = d3.scale.linear()
                    .domain(domain && domain.call(this, d, i) || [min, max])
                    .range(range && range.call(this, d, i) || [height, 0]);

                // Note: the box, median, and box tick elements are fixed in number,
                // so we only have to handle enter and update. In contrast, the outliers
                // and other elements are variable, so we need to exit them! Variable
                // elements also fade in and out.

                // Update center line: the vertical line spanning the whiskers.
                var center = g.selectAll("line.center")
                    .data(whiskerData ? [whiskerData] : []);

                //vertical line
                center.enter().insert("line", "rect")
                    .attr("class", "center")
                    .attr("x1", width / 2)
                    .attr("x2", width / 2)
                    .attr("y1", function (d) { return x1(d[0]); })
                    .attr("y2", function (d) { return x1(d[1]); });

                center.exit().transition()
                    .duration(duration)
                    .style("opacity", 1e-6)
                    .attr("y1", function (d) { return x1(d[0]); })
                    .attr("y2", function (d) { return x1(d[1]); })
                    .remove();

                // Update innerquartile box.
                var box = g.selectAll("rect.box")
                    .data([quartileData]);

                box.enter().append("rect")
                    .attr("class", "box")
                    .attr("x", 0)
                    .attr("width", width)
                    .attr("y", function (d) { return x1(d[2]); })
                    .attr("height", function (d) { return x1(d[0]) - x1(d[2]); });

                // Update median line.
                var medianLine = g.selectAll("line.median")
                    .data([quartileData[1]]);

                medianLine.enter().append("line")
                    .attr("class", "median")
                    .attr("x1", 0)
                    .attr("x2", width)
                    .attr("y1", x1)
                    .attr("y2", x1);

                // Update mean.
                var meanPoint = g.selectAll("circle")
                .data([meanData], Number);

                meanPoint.enter().insert("circle", "text")
                    .attr("class", "mean")
                    .attr("r", 4)
                    .attr("cx", width * 3 / 4)
                    .attr("cy", function (i) { return x1(meanData); })

                meanPoint.exit().transition()
                    .duration(duration)
                    .attr("cy", function (i) { return x1(meanData); })
                    .remove();

                // Update whiskers.
                var whisker = g.selectAll("line.whisker")
                    .data(whiskerData || []);

                whisker.enter().insert("line", "circle, text")
                    .attr("class", "whisker")
                    .attr("x1", 0)
                    .attr("x2", 0 + width)
                    .attr("y1", x1)
                    .attr("y2", x1);

                whisker.exit().transition()
                    .duration(duration)
                    .attr("y1", x1)
                    .attr("y2", x1)
                    .remove();

                // Update outliers.
                var outlier = g.selectAll("circle.outlier")
                    .data(outlierData, Number);

                outlier.enter().insert("circle", "text")
                    .attr("class", "outlier")
                    .attr("r", 3)
                    .attr("cx", width / 2)
                    .attr("cy", function (i) { return x1(i); });

                outlier.exit().transition()
                    .duration(duration)
                    .attr("cy", function (i) { return x1(i); })
                    .remove();

                if (showDataPoints == true) {
                    var nonOutliers = d3.set(d);
                    outlierData.forEach(function (i) { nonOutliers.remove(i); });
                    var dataPlot = g.selectAll("circle.datapoint")
                        .data(nonOutliers.values(), Number);

                    dataPlot.enter().insert("circle", "text")
                        .attr("class", "datapoint")
                        .attr("r", 3)
                        .attr("cx", width / 2)
                        .attr("cy", function (i) { return x1(i); });

                    dataPlot.exit().transition()
                        .duration(duration)
                        .attr("cy", function (i) { return x1(i); })
                        .remove();
                }

                // Compute the tick format.
                var format = tickFormat || x1.tickFormat(8);

                // Update box ticks.
                var boxTick = g.selectAll("text.box")
                    .data(quartileData);
                if (showLabels == true) {
                    boxTick.enter().append("text")
                        .attr("class", "box")
                        .attr("dy", ".3em")
                        .attr("dx", function (d, i) { return i & 1 ? 6 : -6 })
                        .attr("x", function (d, i) { return i & 1 ? +width : 0 })
                        .attr("y", x1)
                        .attr("text-anchor", function (d, i) { return i & 1 ? "start" : "end"; })
                        .text(format);
                }

                boxTick.transition()
                    .duration(duration)
                    .text(format)
                    .attr("y", x1);

                // Update whisker ticks. These are handled separately from the box
                // ticks because they may or may not exist, and we want don't want
                // to join box ticks pre-transition with whisker ticks post-.
                var whiskerTick = g.selectAll("text.whisker")
                    .data(whiskerData || []);
                if (showLabels == true) {
                    whiskerTick.enter().append("text")
                        .attr("class", "whisker")
                        .attr("dy", ".3em")
                        .attr("dx", 6)
                        .attr("x", width)
                        .text(format)
                        .attr("y", x1)
                        .style("opacity", 1);
                }

                whiskerTick.exit().transition()
                    .duration(duration)
                    .attr("y", x1)
                    .style("opacity", 1e-6)
                    .remove();
            });
            d3.timer.flush();
        }

        box.width = function (x) {
            if (!arguments.length) return width;
            width = x;
            return box;
        };

        box.height = function (x) {
            if (!arguments.length) return height;
            height = x;
            return box;
        };

        box.tickFormat = function (x) {
            if (!arguments.length) return tickFormat;
            tickFormat = x;
            return box;
        };

        box.duration = function (x) {
            if (!arguments.length) return duration;
            duration = x;
            return box;
        };

        box.domain = function (x) {
            if (!arguments.length) return domain;
            domain = x == null ? x : d3.functor(x);
            return box;
        };

        box.range = function (x) {
            if (!arguments.length) return range;
            range = x == null ? x : d3.functor(x);
            return box;
        }

        box.value = function (x) {
            if (!arguments.length) return value;
            value = x;
            return box;
        };

        box.whiskers = function (x) {
            if (!arguments.length) return whiskers;
            whiskers = x;
            return box;
        };

        box.showLabels = function (x) {
            if (!arguments.length) return showLabels;
            showLabels = x;
            return box;
        };

        box.showDataPoints = function (x) {
            if (!arguments.length) return showDataPoints;
            showDataPoints = x;
            return box;
        };

        box.quartiles = function (x) {
            if (!arguments.length) return quartiles;
            quartiles = x;
            return box;
        };

        box.mean = function (x) {
            if (!arguments.length) return mean;
            mean = x;
            return box;
        };

        return box;
    };

    function mean(d) {
        return d3.mean(d);
    }

    function boxWhiskers(d) {
        return [0, d.length - 1];
    }

    function boxQuartiles(d) {
        return [
          d3.quantile(d, .25),
          d3.quantile(d, .5),
          d3.quantile(d, .75)
        ];
    }

})();
