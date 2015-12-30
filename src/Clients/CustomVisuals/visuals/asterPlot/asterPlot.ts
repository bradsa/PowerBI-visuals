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
    import SelectionManager = utility.SelectionManager;
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;

    export interface AsterDatapoint {
        color: string;
        sliceHeight: number;
        sliceWidth: number;
        label: string;
        selector: SelectionId;
        tooltipInfo: TooltipDataItem[];
    }

    export class AsterPlot implements IVisual {
        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Category',
                    kind: powerbi.VisualDataRoleKind.Grouping,
                },
                {
                    name: 'Y',
                    kind: powerbi.VisualDataRoleKind.Measure,
                },
            ],
            dataViewMappings: [{
                conditions: [
                    { 'Category': { max: 1 }, 'Y': { max: 2 } }
                ],
                categorical: {
                    categories: {
                        for: { in: 'Category' },
                        dataReductionAlgorithm: { top: {} }
                    },
                    values: {
                        select: [{ bind: { to: 'Y' } }]
                    },
                }
            }],
            objects: {
                general: {
                    displayName: data.createDisplayNameGetter('Visual_General'),
                    properties: {
                        formatString: {
                            type: { formatting: { formatString: true } },
                        },
                    },
                },
                label: {
                    displayName: 'Label',
                    properties: {
                        fill: {
                            displayName: 'Fill',
                            type: { fill: { solid: { color: true } } }
                        }
                    }
                },
                outerLine: {
                    displayName: 'Outer line',
                    properties: {
                        show: {
                            displayName: 'Show',
                            type: { bool: true }
                        },
                        thickness: {
                            displayName: 'Thickness',
                            type: { numeric: true }
                        }
                    }
                }
            }
        };

        private static properties = {
            formatString: { objectName: 'general', propertyName: 'formatString' },
            labelFill: { objectName: 'label', propertyName: 'fill' },
            showLine: { objectName: 'outerLine', propertyName: 'show' },
            lineThickness: { objectName: 'outerLine', propertyName: 'thickness' },
        };

        private static VisualClassName = 'asterPlot';
        private static AsterSlice: ClassAndSelector = createClassAndSelector('asterSlice');
        private static OuterLine: ClassAndSelector = createClassAndSelector('outerLine');

        private svg: D3.Selection;
        private mainGroupElement: D3.Selection;
        private centerText: D3.Selection;
        private colors: IDataColorPalette;
        private selectionManager: SelectionManager;
        private dataView: DataView;

        private static CenterTextFontHeightCoefficient = 0.4;
        private static CenterTextFontWidthCoefficient = 1.9;
        private static GetCenterTextProperties(fontSize: number, text?: string): TextProperties {
            return {
                fontFamily: 'Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif',
                fontWeight: 'bold',
                fontSize: jsCommon.PixelConverter.toString(fontSize),
                text: text
            };
        }

        public static converter(dataView: DataView, colors: IDataColorPalette): AsterDatapoint[] {
            if (!dataView.categorical
                || !dataView.categorical.categories
                || dataView.categorical.categories.length !== 1)
                return;
            var catDv: DataViewCategorical = dataView.categorical;
            var cat = catDv.categories[0];
            var catValues = cat.values;
            var values = catDv.values;
            var dataPoints: AsterDatapoint[] = [];

            if (!catValues || catValues.length < 1 || !values || values.length < 1)
                return dataPoints;

            var formatStringProp = <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'formatString' };
            var categorySourceFormatString = valueFormatter.getFormatString(cat.source, formatStringProp);
            var minValue: number = Math.min(0, d3.min(values[0].values));

            for (var i = 0, length = Math.min(colors.getAllColors().length, catValues.length); i < length; i++) {
                var formattedCategoryValue = valueFormatter.format(catValues[i], categorySourceFormatString);

                var tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(
                    formatStringProp,
                    catDv,
                    formattedCategoryValue,
                    values[0].values[i],
                    null,
                    null,
                    0);

                if (values.length > 1) {
                    var toolTip = TooltipBuilder.createTooltipInfo(
                        formatStringProp,
                        catDv,
                        formattedCategoryValue,
                        values[1].values[i],
                        null,
                        null,
                        1)[1];
                    if (toolTip) {
                        tooltipInfo.push(toolTip);
                    }
                }

                dataPoints.push({
                    sliceHeight: values[0].values[i] - minValue,
                    sliceWidth: Math.max(0, values.length > 1 ? values[1].values[i] : 1),
                    label: catValues[i],
                    color: colors.getColorByIndex(i).value,
                    selector: SelectionId.createWithId(cat.identity[i]),
                    tooltipInfo: tooltipInfo
                });
            }

            return dataPoints;
        }

        public init(options: VisualInitOptions): void {
            var element = options.element;
            this.selectionManager = new SelectionManager({ hostServices: options.host });
            var svg = this.svg = d3.select(element.get(0))
                .append('svg')
                .classed(AsterPlot.VisualClassName, true);

            this.colors = options.style.colorPalette.dataColors;
            this.mainGroupElement = svg.append('g');
            this.centerText = this.mainGroupElement.append('text');
        }

        public update(options: VisualUpdateOptions) {
            if (!options.dataViews || !options.dataViews[0]) return; // or clear the view, display an error, etc.

            var duration = options.suppressAnimations ? 0 : AnimatorCommon.MinervaAnimationDuration;
            var viewport = options.viewport;

            this.svg
                .attr({
                    'height': viewport.height,
                    'width': viewport.width
                })
                .on('click', () => this.selectionManager.clear().then(() => selection.style('opacity', 1)));

            var width = viewport.width - 20;
            var height = viewport.height - 20;
            var radius = Math.min(width, height) / 2;
            var innerRadius = 0.3 * radius;

            var mainGroup = this.mainGroupElement;

            mainGroup.attr('transform', SVGUtil.translate((width + 10) / 2, (height + 10) / 2));

            var dataView = this.dataView = options.dataViews[0];
            var dataPoints = AsterPlot.converter(dataView, this.colors);
            if (!dataPoints)
                return;

            var maxScore = d3.max(dataPoints, d => d.sliceHeight);
            var totalWeight = d3.sum(dataPoints, d => d.sliceWidth);

            var pie = d3.layout.pie()
                .sort(null)
                .value(d => (d && !isNaN(d.sliceWidth) ? d.sliceWidth : 0) / totalWeight);

            var arc = d3.svg.arc()
                .innerRadius(innerRadius)
                .outerRadius(d => (radius - innerRadius) * (d && d.data && !isNaN(d.data.sliceHeight) ? d.data.sliceHeight : 1) / maxScore + innerRadius + 1);

            var selectionManager = this.selectionManager;

            var selection = mainGroup.selectAll(AsterPlot.AsterSlice.selector)
                .data(pie(dataPoints), (d, idx) => dataPoints[idx] ? dataPoints[idx].selector.getKey() : idx);

            selection.enter()
                .append('path')
                .attr('stroke', '#333')
                .classed(AsterPlot.AsterSlice.class, true);

            selection
                .on('click', function (d) {
                    selectionManager.select(d.data.selector).then((ids) => {
                        if (ids.length > 0) {
                            selection.style('opacity', 0.5);
                            d3.select(this).style('opacity', 1);
                        } else {
                            selection.style('opacity', 1);
                        }
                    });
                    d3.event.stopPropagation();
                })
                .attr('fill', d => d.data.color)
                .transition().duration(duration)
                .attrTween('d', function (data) {
                    if (!this.oldData) {
                        this.oldData = data;
                        return () => arc(data);
                    }

                    var interpolation = d3.interpolate(this.oldData, data);
                    this.oldData = interpolation(0);
                    return (x) => arc(interpolation(x));
                });

            selection.exit().remove();

            this.drawCenterText(innerRadius);
            this.drawOuterLine(innerRadius, radius, pie(dataPoints));
            TooltipManager.addTooltip(selection, (tooltipEvent: TooltipEvent) => tooltipEvent.data.data.tooltipInfo);
        }

        private drawOuterLine(innerRadius: number, radius: number, data) {
            var mainGroup = this.mainGroupElement;
            var outlineArc = d3.svg.arc()
                .innerRadius(innerRadius)
                .outerRadius(radius);
            if (this.getShowOuterline(this.dataView)) {
                var outerLine = mainGroup.selectAll(AsterPlot.OuterLine.selector).data(data);
                outerLine.enter().append('path');
                outerLine.attr("fill", "none")
                    .attr({
                        'stroke': '#333',
                        'stroke-width': this.getOuterThickness(this.dataView) + 'px',
                        'd': outlineArc
                    })
                    .style('opacity', 1)
                    .classed(AsterPlot.OuterLine.class, true);
            } else {
                mainGroup.selectAll(AsterPlot.OuterLine.selector).style('opacity', 0);
            }
        }

        private getCenterText(dataView: DataView) {
            var columns = dataView.metadata.columns;
            for (var i = 0; i < columns.length; i++) {
                if (!columns[i].isMeasure) {
                    return columns[i].displayName;
                }
            }

            return '';
        }
        private drawCenterText(innerRadius: number) {
            var centerTextProperties: TextProperties
                = AsterPlot.GetCenterTextProperties(innerRadius * AsterPlot.CenterTextFontHeightCoefficient, this.getCenterText(this.dataView));
            this.centerText
                .style({
                    'line-height': 1,
                    'font-weight': centerTextProperties.fontWeight,
                    'font-size': centerTextProperties.fontSize,
                    'fill': this.getLabelFill(this.dataView).solid.color
                })
                .attr({
                    'dy': '0.35em',
                    'text-anchor': 'middle'
                })
                .text(TextMeasurementService.getTailoredTextOrDefault(
                    centerTextProperties,
                    innerRadius * AsterPlot.CenterTextFontWidthCoefficient));
        }

        private getShowOuterline(dataView: DataView): boolean {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, AsterPlot.properties.showLine, false);
        }

        private getOuterThickness(dataView: DataView): number {
            if (dataView && dataView.metadata && dataView.metadata.objects) {
                return DataViewObjects.getValue(dataView.metadata.objects, { objectName: 'outerLine', propertyName: 'thickness' }, 1);
            }

            return 1;
        }

        // This extracts fill color of the label from the DataView
        private getLabelFill(dataView: DataView): Fill {
            if (dataView && dataView.metadata && dataView.metadata.objects) {
                var label = dataView.metadata.objects['label'];
                if (label) {
                    return <Fill>label['fill'];
                }
            }

            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, AsterPlot.properties.labelFill, { solid: { color: '#333' } });
        }
        
        // This function retruns the values to be displayed in the property pane for each object.
        // Usually it is a bind pass of what the property pane gave you, but sometimes you may want to do
        // validation and return other values/defaults
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [];
            switch (options.objectName) {
                case 'label':
                    var label: VisualObjectInstance = {
                        objectName: 'label',
                        displayName: 'Label',
                        selector: null,
                        properties: {
                            fill: this.getLabelFill(this.dataView)
                        }
                    };
                    instances.push(label);
                    break;
                case 'outerLine':
                    var outerLine: VisualObjectInstance = {
                        objectName: 'outerLine',
                        displayName: 'Outer Line',
                        selector: null,
                        properties: {
                            show: this.getShowOuterline(this.dataView),
                            thickness: this.getOuterThickness(this.dataView)
                        }
                    };
                    instances.push(outerLine);
                    break;
            }

            return instances;
        }
    }
}