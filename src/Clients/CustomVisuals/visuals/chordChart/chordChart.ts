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

/// <reference path="../../_references.ts"/>

module powerbi.visuals.samples {
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;

    export interface ChordChartData {
        dataMatrix: number[][];
        labelDataPoints: ChordArcDescriptor[];
        legendData?: LegendData;
        tooltipData: ChordTooltipData[][];
        sliceTooltipData: ChordTooltipData[];
        tickUnit: number;
        differentFromTo: boolean;
        defaultDataPointColor?: string;
        prevAxisVisible: boolean;
        showAllDataPoints?: boolean;
        showLabels: boolean;
        showAxis: boolean;
        
    }

    export interface ChordArcDescriptor extends D3.Layout.ArcDescriptor {
        data: ChordArcLabelData;
    }

    export interface ChordArcLabelData extends LabelEnabledDataPoint, SelectableDataPoint {
        label: string;
        labelColor: string;
        barColor: string;
        isCategory: boolean;
    }

    export interface ChordTooltipData {
        tooltipInfo: TooltipDataItem[];
    }

    export class ChordChart implements IVisual {
        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Category',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: 'From',
                }, {
                    name: 'Series',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: 'To',
                }, {
                    name: 'Y',
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Values'),
                }
            ],
            dataViewMappings: [{
                conditions: [
                    { 'Category': { max: 1 }, 'Series': { max: 0 } },
                    { 'Category': { max: 1 }, 'Series': { min: 1, max: 1 }, 'Y': { max: 1 } },
                    { 'Category': { max: 1 }, 'Series': { max: 0 }, 'Y': { min: 0, max: 1 } },
                ],
                categorical: {
                    categories: {
                        for: { in: 'Category' },
                        dataReductionAlgorithm: { top: {} }
                    },
                    values: {
                        group: {
                            by: 'Series',
                            select: [{ bind: { to: 'Y' } }],
                            dataReductionAlgorithm: { top: {} }
                        },
                    },
                    rowCount: { preferred: { min: 2 }, supported: { min: 1 } }
                },
            }],
            objects: {
                dataPoint: {
                    displayName: data.createDisplayNameGetter('Visual_DataPoint'),
                    properties: {
                        defaultColor: {
                            displayName: data.createDisplayNameGetter('Visual_DefaultColor'),
                            type: { fill: { solid: { color: true } } }
                        },
                        showAllDataPoints: {
                            displayName: data.createDisplayNameGetter('Visual_DataPoint_Show_All'),
                            type: { bool: true }
                        },
                        fill: {
                            displayName: data.createDisplayNameGetter('Visual_Fill'),
                            type: { fill: { solid: { color: true } } }
                        },
                    },
                },
                axis: {
                    displayName: 'Axis',
                    properties: {
                        show: {
                            type: { bool: true }
                        },
                    },
                },
                labels: {
                    displayName: 'Labels',
                    properties: {
                        show: {
                            type: { bool: true }
                        },
                    },
                }
            }
        };

        public static chordChartProps = {
            general: {
                formatString: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'formatString' },
            },
            dataPoint: {
                defaultColor: <DataViewObjectPropertyIdentifier>{ objectName: 'dataPoint', propertyName: 'defaultColor' },
                fill: <DataViewObjectPropertyIdentifier>{ objectName: 'dataPoint', propertyName: 'fill' },
                showAllDataPoints: <DataViewObjectPropertyIdentifier>{ objectName: 'dataPoint', propertyName: 'showAllDataPoints' },
            },
            axis: {
                show: <DataViewObjectPropertyIdentifier>{ objectName: 'axis', propertyName: 'show' },
            },
            labels: {
                show: <DataViewObjectPropertyIdentifier>{ objectName: 'labels', propertyName: 'show' },
            },
        };

        public static PolylineOpacity = 0.5;

        private static OuterArcRadiusRatio = 0.9;
        private static InnerArcRadiusRatio = 0.8;
        private static defaultLabelColor = "#777777";

        private static VisualClassName = 'chordChart';

        private static sliceClass: ClassAndSelector = {
            class: 'slice',
            selector: '.slice',
        };

        private static chordClass: ClassAndSelector = {
            class: 'chord',
            selector: '.chord',
        };

        private static sliceTicksClass: ClassAndSelector = {
            class: 'slice-ticks',
            selector: '.slice-ticks'
        };

        private static tickPairClass: ClassAndSelector = {
            class: 'tick-pair',
            selector: '.tick-pair'
        };

        private static tickLineClass: ClassAndSelector = {
            class: 'tick-line',
            selector: '.tick-line'
        };

        private static tickTextClass: ClassAndSelector = {
            class: 'tick-text',
            selector: '.tick-text'
        };

        private static labelGraphicsContextClass: ClassAndSelector = {
            class: 'labels',
            selector: '.labels',
        };

        private static labelsClass: ClassAndSelector = {
            class: 'data-labels',
            selector: '.data-labels',
        };

        private static linesGraphicsContextClass: ClassAndSelector = {
            class: 'lines',
            selector: '.lines',
        };

        private static lineClass: ClassAndSelector = {
            class: 'line-label',
            selector: '.line-label',
        };

        private chordLayout: D3.Layout.ChordLayout;
        private element: JQuery;

        private svg: D3.Selection;
        private mainGraphicsContext: D3.Selection;

        private data: ChordChartData;
        private colors: IDataColorPalette;
        private selectionManager: utility.SelectionManager;
        private dataView: DataView;
        
        /* Convert a DataView into a view model */
        public static converter(dataView: DataView, colors: IDataColorPalette, prevAxisVisible: boolean): ChordChartData {
            let catDv: DataViewCategorical = dataView.categorical;

            let defaultDataPointColor: string = ChordChart.getDefaultDataPointColor(dataView).solid.color;

            if (catDv.categories && catDv.categories.length > 0 && catDv.values && catDv.categories[0].values) {

                let cat: DataViewCategoryColumn = catDv.categories[0];
                let catValues = cat.values;
                let values = catDv.values;
                let dataMatrix: number[][] = [];

                let legendData: LegendData = {
                    dataPoints: [],
                    title: values[0].source.displayName
                };

                let toolTipData: ChordTooltipData[][] = [];
                let sliceTooltipData: ChordTooltipData[] = [];

                let max: number = 1000;

                let seriesName: string[] = [];  /* series name array */
                let seriesIndex: number[] = []; /* series index array */

                let catIndex: number[] = [];    /* index array for category names */

                let isDiffFromTo: boolean = false;  /* boolean variable indicates that From and To are different */

                let labelData: ChordArcLabelData[] = [];    /* label data: !important */

                let colorHelper = new ColorHelper(colors,
                    ChordChart.chordChartProps.dataPoint.fill,
                    defaultDataPointColor);

                for (let i: number = 0, iLen = catValues.length; i < iLen; i++) {
                    catIndex[catValues[i]] = i;
                }

                for (let i: number = 0, iLen = values.length; i < iLen; i++) {
                    let seriesNameStr: string = converterHelper.getSeriesName(values[i].source);

                    seriesName.push(seriesNameStr);
                    seriesIndex[seriesNameStr] = i;
                }

                let totalFields: any[] = this.union_arrays(catValues, seriesName);

                if (ChordChart.getValidArrayLength(totalFields) ===
                    ChordChart.getValidArrayLength(catValues) + ChordChart.getValidArrayLength(seriesName)) {
                    isDiffFromTo = true;
                }

                let formatStringProp = ChordChart.chordChartProps.general.formatString;
                let categorySourceFormatString = valueFormatter.getFormatString(cat.source, formatStringProp);

                for (let i: number = 0, iLen = totalFields.length; i < iLen; i++) {
                    let id: SelectionId = null;
                    let color: string = '';
                    let isCategory: boolean = false;

                    if (catIndex[totalFields[i]] !== undefined) {
                        let index = catIndex[totalFields[i]];
                        id = SelectionIdBuilder
                            .builder()
                            .withCategory(cat, catIndex[totalFields[i]])
                            .createSelectionId();
                        isCategory = true;
                        let thisCategoryObjects = cat.objects ? cat.objects[index] : undefined;

                        color = colorHelper.getColorForSeriesValue(thisCategoryObjects, /* cat.identityFields */ undefined, catValues[index]);

                    } else if (seriesIndex[totalFields[i]] !== undefined) {
                        let index = seriesIndex[totalFields[i]];

                        let seriesData = values[index];
                        let seriesObjects = seriesData.objects && seriesData.objects[0];
                        let seriesNameStr = converterHelper.getSeriesName(seriesData.source);

                        id = SelectionId.createWithId(seriesData.identity);
                        isCategory = false;

                        color = colorHelper.getColorForSeriesValue(seriesObjects, /* values.identityFields */ undefined, seriesNameStr);
                    }

                    labelData.push({
                        label: totalFields[i],
                        labelColor: ChordChart.defaultLabelColor,
                        barColor: color,
                        isCategory: isCategory,
                        identity: id,
                        selected: false
                    });

                    dataMatrix.push([]);
                    toolTipData.push([]);

                    let formattedCategoryValue = valueFormatter.format(catValues[i], categorySourceFormatString);

                    for (let j = 0, jLen = totalFields.length; j < jLen; j++) {
                        let elementValue: number = 0;
                        let tooltipInfo: TooltipDataItem[] = [];

                        if (catIndex[totalFields[i]] !== undefined &&
                            seriesIndex[totalFields[j]] !== undefined) {
                            let row: number = catIndex[totalFields[i]];
                            let col: number = seriesIndex[totalFields[j]];
                            if (values[col].values[row] !== null) {
                                elementValue = values[col].values[row];

                                if (elementValue > max)
                                    max = elementValue;

                                tooltipInfo = TooltipBuilder.createTooltipInfo(
                                    formatStringProp,
                                    catDv,
                                    formattedCategoryValue,
                                    elementValue,
                                    null,
                                    null,
                                    col,
                                    row);
                            }
                        } else if (isDiffFromTo && catIndex[totalFields[j]] !== undefined &&
                            seriesIndex[totalFields[i]] !== undefined) {
                            let row: number = catIndex[totalFields[j]];
                            let col: number = seriesIndex[totalFields[i]];
                            if (values[col].values[row] !== null) {
                                elementValue = values[col].values[row];
                            }
                        }

                        dataMatrix[i].push(elementValue);
                        toolTipData[i].push({
                            tooltipInfo: tooltipInfo
                        });
                    }

                    let totalSum = d3.sum(dataMatrix[i]);

                    sliceTooltipData.push({
                        tooltipInfo: [{
                            displayName: totalFields[i],
                            value: (ChordChart.isInt(totalSum)) ? totalSum.toFixed(0) : totalSum.toFixed(2)
                        }]
                    });
                }

                let chordLayout = d3.layout.chord()
                    .padding(0.1)
                    .matrix(dataMatrix);

                let unitLength: number = Math.round(max / 5).toString().length - 1;

                return {
                    dataMatrix: dataMatrix,
                    labelDataPoints: ChordChart.convertToChordArcDescriptor(chordLayout.groups(), labelData),
                    legendData: legendData,
                    tooltipData: toolTipData,
                    sliceTooltipData: sliceTooltipData,
                    tickUnit: Math.pow(10, unitLength),
                    differentFromTo: isDiffFromTo,
                    defaultDataPointColor: defaultDataPointColor,
                    prevAxisVisible: prevAxisVisible,
                    showAllDataPoints: ChordChart.getShowAllDataPoints(dataView),
                    showLabels: ChordChart.getLabelsShow(dataView),
                    showAxis: ChordChart.getAxisShow(dataView),
                };
            } else {
                return {
                    dataMatrix: [],
                    labelDataPoints: [],
                    legendData: null,
                    tooltipData: [],
                    sliceTooltipData: [],
                    tickUnit: 1000,
                    differentFromTo: false,
                    defaultDataPointColor: defaultDataPointColor,
                    prevAxisVisible: prevAxisVisible,
                    showAllDataPoints: ChordChart.getShowAllDataPoints(dataView),
                    showLabels: ChordChart.getLabelsShow(dataView),
                    showAxis: ChordChart.getAxisShow(dataView),
                };
            }
        }

        /* Check every element of the array and returns the count of elements which are valid(not undefined) */
        public static getValidArrayLength(array: any[]): number {
            let len = 0;
            for (let i: number = 0, iLen = array.length; i < iLen; i++) {
                if (array[i] !== undefined) {
                    len++;
                }
            }
            return len;
        }

        /* Convert ChordLayout to ChordArcDescriptor */
        public static convertToChordArcDescriptor(groups: D3.Layout.ArcDescriptor[], datum: ChordArcLabelData[]): ChordArcDescriptor[] {
            let labelDataPoints: ChordArcDescriptor[] = [];
            for (let i: number = 0, iLen = groups.length; i < iLen; i++) {
                let labelDataPoint: ChordArcDescriptor = groups[i];
                labelDataPoint.data = datum[i];
                labelDataPoints.push(labelDataPoint);
            }

            return labelDataPoints;
        }

        /* Calculate radius */
        private calculateRadius(viewport: IViewport): number {
            if (this.data && this.data.showLabels) {
                // if we have category or data labels, use a sigmoid to blend the desired denominator from 2 to 3.
                // if we are taller than we are wide, we need to use a larger denominator to leave horizontal room for the labels.
                let hw = viewport.height / viewport.width;
                let denom = 2 + (1 / (1 + Math.exp(-5 * (hw - 1))));
                return Math.min(viewport.height, viewport.width) / denom;
            }

            // no labels
            return Math.min(viewport.height, viewport.width) / 2;
        }
        
        /* Draw category labels */
        public static drawDefaultCategoryLabels(graphicsContext: D3.Selection, chordData: ChordChartData, radius: number, viewport: IViewport): void {
            /** Multiplier to place the end point of the reference line at 0.05 * radius away from the outer edge of the chord/pie. */

            let arc: D3.Svg.Arc = d3.svg.arc()
                .innerRadius(0)
                .outerRadius(radius * ChordChart.InnerArcRadiusRatio);

            let outerArc: D3.Svg.Arc = d3.svg.arc()
                .innerRadius(radius * ChordChart.OuterArcRadiusRatio)
                .outerRadius(radius * ChordChart.OuterArcRadiusRatio);

            if (chordData.showLabels) {
                let labelLayout = ChordChart.getChordChartLabelLayout(radius, outerArc, viewport);

                ChordChart.drawDefaultLabelsForChordChart(chordData.labelDataPoints,
                    graphicsContext,
                    labelLayout, viewport,
                    radius, arc, outerArc);
            }
            else
                dataLabelUtils.cleanDataLabels(graphicsContext, true);
        }

        /* One time setup*/
        public init(options: VisualInitOptions): void {
            let element = this.element = options.element;
            this.selectionManager = new utility.SelectionManager({ hostServices: options.host });

            this.svg = d3.select(element.get(0))
                .append('svg')
                .style('position', 'absolute')
                .classed(ChordChart.VisualClassName, true);

            this.mainGraphicsContext = this.svg
                .append('g');

            this.mainGraphicsContext
                .append('g')
                .classed('slices', true);

            this.mainGraphicsContext
                .append('g')
                .classed('ticks', true);

            this.mainGraphicsContext
                .append('g')
                .classed('chords', true);

            this.colors = options.style.colorPalette.dataColors;
        }
    
        /* Called for data, size, formatting changes*/
        public update(options: VisualUpdateOptions) {
            // assert dataView           
            if (!options.dataViews || !options.dataViews[0]) return;
            
            // get animation duration
            let duration = options.suppressAnimations ? 0 : AnimatorCommon.MinervaAnimationDuration;

            let dataView = this.dataView = options.dataViews[0];
            let prevAxisShow: boolean = (this.data) ? this.data.showAxis : !ChordChart.getAxisShow(dataView);

            let data = this.data = ChordChart.converter(dataView, this.colors, prevAxisShow);

            let viewport = options.viewport;

            let chordLayout = this.chordLayout = d3.layout.chord()
                .padding(0.1)
                //.sortGroups(d3.descending)
                .matrix(data.dataMatrix);

            let width = viewport.width;
            let height = viewport.height;

            let radius = this.calculateRadius(viewport);
            let sm = this.selectionManager;

            let innerRadius: number = radius;
            let outerRadius: number = radius * ChordChart.InnerArcRadiusRatio;

            let arc: D3.Svg.Arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);

            this.svg
                .attr({
                    'width': width,
                    'height': height
                });

            let mainGraphicsContext = this.mainGraphicsContext
                .attr('transform', SVGUtil.translate(width / 2, height / 2));

            let sliceShapes = this.svg.select('.slices')
                .selectAll('path' + ChordChart.sliceClass.selector)
                .data(chordLayout.groups);

            sliceShapes.enter()
                .insert("path")
                .classed(ChordChart.sliceClass.class, true);

            sliceShapes.style('fill', (d, i) => data.labelDataPoints[i].data.barColor)
                .style("stroke", (d, i) => data.labelDataPoints[i].data.barColor)
                .on('click', function(d, i) {
                    sm.select(data.labelDataPoints[i].data.identity).then(ids=> {
                        if (ids.length > 0) {
                            mainGraphicsContext.selectAll(".chords path.chord")
                                .style("opacity", 1);

                            mainGraphicsContext.selectAll(".slices path.slice")
                                .style('opacity', 0.3);

                            mainGraphicsContext.selectAll(".chords path.chord")
                                .filter(function(d) { return d.source.index !== i && d.target.index !== i; })
                                .style("opacity", 0.3);

                            d3.select(this).style('opacity', 1);
                        } else {
                            sliceShapes.style('opacity', 1);
                            mainGraphicsContext.selectAll(".chords path.chord")
                                .filter(function(d) { return d.source.index !== i && d.target.index !== i; })
                                .style("opacity", 1);
                        }
                    });

                    d3.event.stopPropagation();
                })
                .transition()
                .duration(duration)
                .attr("d", arc);

            sliceShapes.exit()
                .remove();

            TooltipManager.addTooltip(sliceShapes, (tooltipEvent: TooltipEvent) => {
                return data.sliceTooltipData[tooltipEvent.data.index].tooltipInfo;
            });

            let chordShapes = this.svg.select('.chords')
                .selectAll('path' + ChordChart.chordClass.selector)
                .data(chordLayout.chords);

            chordShapes
                .enter().insert("path")
                .classed(ChordChart.chordClass.class, true);

            chordShapes.style("fill", (d, i) => data.labelDataPoints[d.target.index].data.barColor)
                .style("opacity", 1)
                .transition()
                .duration(duration)
                .attr("d", d3.svg.chord().radius(innerRadius));

            chordShapes.exit()
                .remove();

            this.svg
                .on('click', () => this.selectionManager.clear().then(() => {
                    sliceShapes.style('opacity', 1);
                    chordShapes.style('opacity', 1);
                }));
            
            ChordChart.drawTicks(this.mainGraphicsContext, data, chordLayout, outerRadius, duration, viewport);
            ChordChart.drawDefaultCategoryLabels(this.mainGraphicsContext, data, radius, viewport);

            TooltipManager.addTooltip(chordShapes, (tooltipEvent: TooltipEvent) => {
                let tooltipInfo: TooltipDataItem[] = [];
                if (data.differentFromTo) {
                    tooltipInfo = data.tooltipData[tooltipEvent.data.source.index]
                    [tooltipEvent.data.source.subindex]
                        .tooltipInfo;
                } else {
                    tooltipInfo.push({
                        displayName: data.labelDataPoints[tooltipEvent.data.source.index].data.label
                        + '->' + data.labelDataPoints[tooltipEvent.data.source.subindex].data.label,
                        value: data.dataMatrix[tooltipEvent.data.source.index]
                        [tooltipEvent.data.source.subindex].toString()
                    });
                    tooltipInfo.push({
                        displayName: data.labelDataPoints[tooltipEvent.data.target.index].data.label
                        + '->' + data.labelDataPoints[tooltipEvent.data.target.subindex].data.label,
                        value: data.dataMatrix[tooltipEvent.data.target.index]
                        [tooltipEvent.data.target.subindex].toString()
                    });
                }
                return tooltipInfo;
            });
        }

        /*About to remove your visual, do clean up here */
        public destroy() {
            
        }

        /* Clean ticks */
        public static cleanTicks(context: D3.Selection) {
            let empty = [];
            let tickLines = context.selectAll(ChordChart.tickLineClass.selector).data(empty);
            tickLines.exit().remove();

            let tickTexts = context.selectAll(ChordChart.tickTextClass.selector).data(empty);
            tickTexts.exit().remove();

            context.selectAll(ChordChart.tickPairClass.selector).remove();
            context.selectAll(ChordChart.sliceTicksClass.selector).remove();
        }
        
        /* Draw axis(ticks) around the arc */
        public static drawTicks(graphicsContext: D3.Selection, chordData: ChordChartData, chordLayout: D3.Layout.ChordLayout, outerRadius: number, duration: number, viewport: IViewport): void {

            if (chordData.showAxis) {
                let tickShapes = graphicsContext.select('.ticks')
                    .selectAll('g' + ChordChart.sliceTicksClass.selector)
                    .data(chordLayout.groups);
                let animDuration = (chordData.prevAxisVisible === chordData.showAxis) ? duration : 0;

                tickShapes.enter().insert('g')
                    .classed(ChordChart.sliceTicksClass.class, true);

                let tickPairs = tickShapes.selectAll('g' + ChordChart.tickPairClass.selector)
                    .data(function (d) {
                        let k = (d.endAngle - d.startAngle) / d.value;
                        let range = d3.range(0, d.value, d.value - 1 < 0.15 ? 0.15 : d.value - 1);
                        let retval = 
                        range.map(function (v, i) {
                            let divider: number = 1000;
                            let unitStr: string = 'k';
                            
                            if( chordData.tickUnit >= 1000 * 1000) {
                                divider = 1000 * 1000;
                                unitStr = 'm'; 
                            }
                            else if( chordData.tickUnit >= 1000) {
                                divider = 1000;
                                unitStr = 'k';
                            } else {
                                divider = 1;
                                unitStr = '';
                            } 
                            let retv =         
                             {
                                angle: v * k + d.startAngle,
                                label: Math.floor(v / divider) + unitStr
                            };
                            return retv;
                            
                        });
                        return retval;
                    });

                tickPairs.enter().insert('g')
                    .classed(ChordChart.tickPairClass.class, true);

                tickPairs.transition()
                    .duration(animDuration)
                    .attr('transform', function(d) {
                        return 'rotate(' + (d.angle * 180 / Math.PI - 90) + ')'
                            + 'translate(' + outerRadius + ',0)';
                    });

                tickPairs.selectAll('line' + ChordChart.tickLineClass.selector)
                    .data((d) => [d])
                    .enter().insert('line')
                    .classed(ChordChart.tickLineClass.class, true)
                    .style("stroke", "#000")
                    .attr("x1", 1)
                    .attr("y1", 0)
                    .attr("x2", 5)
                    .attr("y2", 0);

                tickPairs.selectAll('text' + ChordChart.tickTextClass.selector)
                    .data((d) => [d])
                    .enter().insert('text')
                    .classed(ChordChart.tickTextClass.class, true)
                    .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
                    .text(function(d) { return d.label; })
                    .attr("transform", function(d) { return d.angle > Math.PI ? "rotate(180)translate(-16)" : null; })
                    .attr("x", 8)
                    .attr("dy", ".35em");

                tickPairs.exit()
                    .remove();

                tickShapes.exit()
                    .remove();

            } else {
                ChordChart.cleanTicks(graphicsContext);
            }

        }

        /* Get format parameter axis whether it determines show ticks or not. Default value is true */
        private static getAxisShow(dataView: DataView): boolean {
            if (dataView) {
                let objects = dataView.metadata.objects;
                if (objects) {
                    let axis = objects['axis'];
                    if (axis && axis.hasOwnProperty('show')) {
                        return <boolean>axis['show'];
                    }
                }
            }
            return true;
        }
        
        /* Get format parameter labels whether it determines show labels or not. Default value is true */
        private static getLabelsShow(dataView: DataView): boolean {
            if (dataView) {
                let objects = dataView.metadata.objects;
                if (objects) {
                    let labels = objects['labels'];
                    if (labels && labels.hasOwnProperty('show')) {
                        return <boolean>labels['show'];
                    }
                }
            }
            return true;
        }
       
        /* Select labels */
        public static selectLabels(filteredData: LabelEnabledDataPoint[], context: D3.Selection, isDonut: boolean = false, forAnimation: boolean = false): D3.UpdateSelection {

            // Check for a case where resizing leaves no labels - then we need to remove the labels 'g'
            if (filteredData.length === 0) {
                dataLabelUtils.cleanDataLabels(context, true);
                return null;
            }

            if (context.select(ChordChart.labelGraphicsContextClass.selector).empty())
                context.append('g').classed(ChordChart.labelGraphicsContextClass.class, true);

            // line chart ViewModel has a special 'key' property for point identification since the 'identity' field is set to the series identity
            let hasKey: boolean = (<any>filteredData)[0].key !== null;
            let hasDataPointIdentity: boolean = (<any>filteredData)[0].identity !== null;
            let getIdentifier = hasKey ?
                (d: any) => d.key
                : hasDataPointIdentity ?
                    (d: SelectableDataPoint) => d.identity.getKey()
                    : undefined;

            let labels = isDonut ?
                context.select(ChordChart.labelGraphicsContextClass.selector).selectAll(ChordChart.labelsClass.selector).data(filteredData, (d: DonutArcDescriptor) => d.data.identity.getKey())
                : getIdentifier !== null ?
                    context.select(ChordChart.labelGraphicsContextClass.selector).selectAll(ChordChart.labelsClass.selector).data(filteredData, getIdentifier)
                    : context.select(ChordChart.labelGraphicsContextClass.selector).selectAll(ChordChart.labelsClass.selector).data(filteredData);

            let newLabels = labels.enter()
                .append('text')
                .classed(ChordChart.labelsClass.class, true);
            if (forAnimation)
                newLabels.style('opacity', 0);

            return labels;
        }
        
        /* Draw labels */
        public static drawDefaultLabelsForChordChart(data: any[], context: D3.Selection, layout: ILabelLayout, viewport: IViewport, radius: number, arc: D3.Svg.Arc, outerArc: D3.Svg.Arc) {
            // Hide and reposition labels that overlap
            let dataLabelManager = new DataLabelManager();
            let filteredData = dataLabelManager.hideCollidedLabels(viewport, data, layout,/* addTransform */ true);

            let labels: D3.UpdateSelection = ChordChart.selectLabels(filteredData, context, true);

            if (!labels) {
                return;
            }

            labels
                .attr({ x: (d: LabelEnabledDataPoint) => d.labelX, y: (d: LabelEnabledDataPoint) => d.labelY, dy: '.35em' })
                .text((d: LabelEnabledDataPoint) => d.labeltext)
                .style(layout.style);

            labels
                .exit()
                .remove();

            if (context.select(ChordChart.linesGraphicsContextClass.selector).empty()) {
                context
                    .append('g')
                    .classed(ChordChart.linesGraphicsContextClass.class, true);
            }

            let lines = context.select(ChordChart.linesGraphicsContextClass.selector).selectAll('polyline')
                .data(filteredData, (d: ChordArcDescriptor) => d.data.identity.getKey());
            let innerLinePointMultiplier = 2.05;

            let midAngle = function(d: ChordArcDescriptor) { 
                return d.startAngle + (d.endAngle - d.startAngle) / 2;
            };

            lines.enter()
                .append('polyline')
                .classed(ChordChart.lineClass.class, true);

            lines
                .attr('points', function(d) {
                    let textPoint = outerArc.centroid(d);
                    textPoint[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
                    let midPoint = outerArc.centroid(d);
                    let chartPoint = arc.centroid(d);
                    chartPoint[0] *= innerLinePointMultiplier;
                    chartPoint[1] *= innerLinePointMultiplier;
                    return [chartPoint, midPoint, textPoint];
                }).
                style({
                    'opacity': (d: ChordArcDescriptor) => ChordChart.PolylineOpacity,
                    'stroke': (d: ChordArcDescriptor) => d.data.labelColor,
                });

            lines
                .exit()
                .remove();
        }
        
        /* Get label layout */
        public static getChordChartLabelLayout(radius: number, outerArc: D3.Svg.Arc, viewport: IViewport): ILabelLayout {

            let midAngle = function(d: ChordArcDescriptor) { 
                return d.startAngle + (d.endAngle - d.startAngle) / 2;
            };
            let spaceAvaliableForLabels: number = viewport.width / 2 - radius;

            let minAvailableSpace: number = Math.min(spaceAvaliableForLabels, dataLabelUtils.maxLabelWidth);

            return {
                labelText: (d: DonutArcDescriptor) => {
                    // show only category label
                    return dataLabelUtils.getLabelFormattedText({
                        label: d.data.label,
                        maxWidth: minAvailableSpace,
                    });
                },
                labelLayout: {
                    x: (d: ChordArcDescriptor) => {
                        return radius * (midAngle(d) < Math.PI ? 1 : -1);
                    },
                    y: (d: ChordArcDescriptor) => {
                        let pos = outerArc.centroid(d);
                        return pos[1];
                    },
                },
                filter: (d: ChordArcDescriptor) => (d !== null && d.data !== null && d.data.label !== null),
                style: {
                    'fill': (d: ChordArcDescriptor) => d.data.labelColor,
                    'text-anchor': (d: ChordArcDescriptor) => midAngle(d) < Math.PI ? 'start' : 'end',
                },
            };
        }
        
        /* Get Default Datapoint color */
        private static getDefaultDataPointColor(dataView: DataView, defaultValue?: string): Fill {
            if (dataView) {
                let objects = dataView.metadata.objects;
                if (objects) {
                    let dataPoint = objects['dataPoint'];
                    if (dataPoint && dataPoint.hasOwnProperty('defaultColor')) {
                        let defaultColor = <Fill>dataPoint['defaultColor'];
                        if (defaultColor) {
                            return defaultColor;
                        }
                    }
                }
            }

            return { solid: { color: defaultValue } };
        }

        /* Get format paramter value (showAllDataPoints)  */
        private static getShowAllDataPoints(dataView: DataView): boolean {
            if (!dataView) {
                return false;
            }

            let objects: DataViewObjects = dataView.metadata.objects;
            if (objects) {
                let dataPoint = objects['dataPoint'];
                if (dataPoint && dataPoint.hasOwnProperty('showAllDataPoints')) {
                    return <boolean>dataPoint['showAllDataPoints'];
                }
            }            
            return false;
        }

        /* Enumerate format values */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            let instances: VisualObjectInstance[] = [];
            let axis: VisualObjectInstance;

            switch (options.objectName) {
                case 'axis':
                    axis = {
                        objectName: 'axis',
                        displayName: 'Axis',
                        selector: null,
                        properties: {
                            show: ChordChart.getAxisShow(this.dataView)
                        }
                    };

                    instances.push(axis);
                    break;
                case 'labels':
                    axis = {
                        objectName: 'labels',
                        displayName: 'Labels',
                        selector: null,
                        properties: {
                            show: ChordChart.getLabelsShow(this.dataView)
                        }
                    };

                    instances.push(axis);
                    break;
                case 'dataPoint':
                    let defaultColor: VisualObjectInstance = {
                        objectName: 'dataPoint',
                        selector: null,
                        properties: {
                            defaultColor: { solid: { color: this.data.defaultDataPointColor || this.colors.getColorByIndex(0).value } }
                        }
                    };

                    instances.push(defaultColor);

                    let showAllDataPoints: VisualObjectInstance = {
                        objectName: 'dataPoint',
                        selector: null,
                        properties: {
                            showAllDataPoints: !!this.data.showAllDataPoints
                        }
                    };

                    instances.push(showAllDataPoints);

                    for (let i: number = 0, iLen = this.data.labelDataPoints.length; i < iLen; i++) {
                        let labelDataPoint: ChordArcLabelData = this.data.labelDataPoints[i].data;

                        if (labelDataPoint.isCategory) {
                            let colorInstance: VisualObjectInstance = {
                                objectName: 'dataPoint',
                                displayName: labelDataPoint.label,
                                selector: ColorHelper.normalizeSelector(labelDataPoint.identity.getSelector()),
                                properties: {
                                    fill: { solid: { color: labelDataPoint.barColor } }
                                }
                            };

                            instances.push(colorInstance);
                        }
                    }
                    break;
            }
            return instances;
        }

        /* Utility function for checking if it is integer or float */
        public static isInt(n: number): boolean {
            return n % 1 === 0;
        }
        
        /* Utility function for union two arrays without duplicates */
        public static union_arrays(x: any[], y: any[]): any[] {
            let obj: Object = {};

            for (let i: number = 0; i < x.length; i++) {
                obj[x[i]] = x[i];
            }

            for (let i: number = 0; i < y.length; i++) {
                obj[y[i]] = y[i];
            }

            let res: string[] = [];

            for (let k in obj) {
                if (obj.hasOwnProperty(k)) {  // <-- optional
                    res.push(obj[k]);
                }
            }
            return res;
        }
    }
}
