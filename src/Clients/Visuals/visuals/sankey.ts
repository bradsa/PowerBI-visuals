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

/* Please make sure that this path is correct */
/// <reference path="../_references.ts"/>
module powerbi.visuals {
    //import SelectionManager = utility.SelectionManager;

    export interface SanKeyDataLink {
        source: string;
        target: string;
        name: string;
        value: number;
    }

    export interface SanKeyVisNode extends SanKeyNode {
        color?: string;
        identity?: SelectionId;
    }

    interface SanKeyGraph {
        nodes: SanKeyVisNode[];
        links: SanKeyLink[];
    }

    export class Sankey implements IVisual {

        private root: D3.Selection;
        private dataView: DataView;
        private colors: IDataColorPalette;
        private rootId: string;
        //private selectionManager: SelectionManager;
      
        private static properties = {
            showNames: { objectName: 'linkLabels', propertyName: 'showNames' },
            showValues: { objectName: 'linkLabels', propertyName: 'showValues' },
            showNodeLabels: { objectName: 'nodeLabels', propertyName: 'showNodeLabels' },
        };
        private getShowNames(dataView: DataView): boolean {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, Sankey.properties.showNames, false);
        }
        private getShowValues(dataView: DataView): boolean {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, Sankey.properties.showValues, true);
        }
        private getShowNodeLabels(dataView: DataView): boolean {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, Sankey.properties.showNodeLabels, true);
        }

        private static converter(dataView: DataView): any {
            var data = [];
          
            //// Data from http://www.eia.gov/totalenergy/data/monthly/pdf/flow/electricity.pdf
            //var rows = [
            //    ["Coal", "Fossil Fuels", 16.50],
            //    ["Natural Gas", "Fossil Fuels", 8.75],
            //    //["Petroleum", "Fossil Fuels", 0.31],
            //    //["Other Gases", "Fossil Fuels", 0.11],
            //    ["Fossil Fuels", "Generated", 25.67],
            //    ["Nuclear", "Generated", 8.33],
            //    ["Renewable Energy", "Generated", 5.26],
            //    //["Other", "Generated", 0.18],
            //    ["Generated", "Conversion Losses", 24.66],
            //    ["Generated", "End Use", 14.78],
            //    //["Gross Generated", "Plant Use", 0.81],
            //    //["Gross Generated", "T&D Losses", 0.95],
            //    //["Gross Generated", "Net Generated", 13.97],
            //    //["Imports", "Net Generated", 0.16],
            //    //["Net Generated", "End Use", 13.18],
            //    ["End Use", "Residential", 4.79],
            //    ["End Use", "Commercial", 4.63],
            //    ["End Use", "Industrial", 3.26],
            //    ["End Use", "Transportation", 0.03],
            //    ["End Use", "Direct Use", 0.47],
            //];
            //$.each(data, (index, item) => {
            //    data.push({
            //        "source": data[0],
            //        "target": data[1],
            //        "value": data[2],
            //    });
            //});
            //return data;
            // check for good data or return empty rowset
            if (!dataView || !dataView.categorical || !dataView.categorical.categories ||                                      // ensure categories are present
                !dataView.categorical.categories[0] || !dataView.categorical.categories[0].values ||                           // ensure source
                !dataView.categorical.categories[1] || !dataView.categorical.categories[1].values                              // ensure dest
                || (dataView.categorical.categories[1].values.length !== dataView.categorical.categories[0].values.length)     // ensure source and destination lists are the same size
                || !dataView.categorical.values || !dataView.categorical.values[0] || !dataView.categorical.values[0].values   // ensure values
                || dataView.categorical.categories[1].values.length !== dataView.categorical.values[0].values.length           // ensure values list is the same size as the categories
            ) {
                return [];
            }
            function isEmpty(str) {
                return (!str || 0 === str.length);
            }

            $.each(dataView.categorical.categories[0].values, (index, item) => {

                // the source / dest category data can come in on either index so we need to check for it.
                var sourceCat = 0;
                var targetCat = 1;
                if (dataView.categorical.categories[0].source.roles && dataView.categorical.categories[0].source.roles["Source"] === undefined) {
                    sourceCat = 1;
                    targetCat = 0;
                }
                // check for null, empty and negative values
                if (isEmpty(dataView.categorical.categories[sourceCat].values[index]) ||
                    isEmpty(dataView.categorical.categories[targetCat].values[index]) ||
                    isEmpty(dataView.categorical.values[0].values[index]) ||
                    dataView.categorical.values[0].values[index] <= 0) {
                    return [];
                }
                data.push({
                    "source": dataView.categorical.categories[sourceCat].values[index],
                    "target": dataView.categorical.categories[targetCat].values[index],
                    "value": dataView.categorical.values[0].values[index]
                });
            });
            return data;

        }

        public init(options: VisualInitOptions): void {
            //this.selectionManager = new SelectionManager({ hostServices: options.host });
            this.root = d3.select(options.element.get(0));
            this.colors = options.style.colorPalette.dataColors;
            // make a random string of length 5 for the dom identifier to support multiple sankeys on the same page.
            var s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            this.rootId = Array(5).join().split(',').map(function () { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
        }

        public update(options: VisualUpdateOptions) {
            this.root.selectAll("svg").remove();

            if (!options.dataViews || (options.dataViews.length < 1)) return;

            var data = Sankey.converter(this.dataView = options.dataViews[0]);
            if (data.length === 0) return;

            var fullLinkLabel = this.getShowNames(this.dataView);
            var numberLinkLabel = this.getShowValues(this.dataView);
            var showNodeLabels = this.getShowNodeLabels(this.dataView);
            var rootId = this.rootId;
            
            // get formatter for links
            var valueFormat = "0";
            if (this.dataView.categorical.values[0].source && this.dataView.categorical.values[0].source.format) {
                valueFormat = this.dataView.categorical.values[0].source.format;
            }
            var formatter = valueFormatter.create({ format: valueFormat, value: 0 });
            
            //var sm = this.selectionManager;
            // the d3 sankey visualization graph requires an array of NODES and LINKS
            var graph: SanKeyGraph = { "nodes": [], "links": [] };
            
            // NODES
            // create nodes, one for each name in the list
            var nodeList = [];
            $.each(data, (index, value) => {
                nodeList.push({ "name": value.source });
                nodeList.push({ "name": value.target });
            });

            // create the disinct node list
            var nodes = d3.keys(d3.nest().key(function (d) { return d.name; }).map(nodeList));
       
            // LINKS
            $.each(data, (index, value) => {

                // format the link label according to the ptions
                var linkLabel = "";
                if (fullLinkLabel) {
                    linkLabel = value.name ? value.name : value.source + " " + String.fromCharCode(8594) + " " + value.target; // 8594 is → but TS doesn't handle the conversion well
                    if (numberLinkLabel) {
                        linkLabel += ": ";
                    }
                }
                if (numberLinkLabel) {
                    linkLabel += value.value;
                }

                graph.links.push({
                    source: nodes.indexOf(value.source.toString()),
                    target: nodes.indexOf(value.target.toString()),
                    value: value.value,
                    name: linkLabel
                });
            });

            // reset NODES on the graph back to the normalized list created above.
            graph.nodes = [];
            var colorScale = this.colors.getNewColorScale();

            $.each(nodes, (index, d) => {
                var newColor = colorScale.getColor(d.toString()).value;
                // TODO: click / category filtering
                //var idn = SelectionIdBuilder.builder()
                //    .withCategory(this.dataView.categorical.categories[0], index)
                //    .createSelectionId();
                graph.nodes.push({
                    name: d.toString(),
                    color: newColor,
                    //identity: idn
                });
            });
             
            // scale input
            var myScale = d3.scale.linear()
                .domain([0, 10000])
                .range([0, 5000])
                .clamp(true);

            // clear viewport and create margins
            var viewport = options.viewport;

            var margin = { top: 0, right: 5, bottom: 8, left: 0 },
                width = Math.max(30, viewport.width - margin.left - margin.right),
                height = Math.max(30, viewport.height - margin.top - margin.bottom);

            var svg = d3.select(this.root[0][0])
                .append("svg")
                .attr("width", viewport.width)
                .attr("height", viewport.height)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .attr("class", "sankey");

            var sankey = d3.sankey()
                .nodeWidth(10)
                .nodePadding(4)
                .cycleEnabled(false)
                .scaleFactor(0.5)
                .size([width, height]);

            var path = sankey.link();

            sankey.nodes(graph.nodes)
                .links(graph.links)
                .layout(32);

            // add in the LINKS
            var link = svg.append("g").selectAll(".link")
                .data(graph.links)
                .enter().append("path")
                .attr("id", function (d) { return rootId + d.name + d.source.name + d.target.name; })
                .attr("class", function (d) { return (d.causesCycle ? "link" : "link"); })
                .attr("d", path)
                .style("stroke-width", function (d) { return myScale(Math.max(1, d.dy)); })
                .sort(function (a: any, b: any) { return b.dy - a.dy; });

            svg.append("svg:g").selectAll(".pathRef")
                .data(graph.links)
                .enter().append("use")
                .attr("xlink:href", function (d) { return "#" + rootId + d.name + d.source.name + d.target.name; });

            var pathLabel = svg.append("svg:g").selectAll(".linkLabel")
                .data(graph.links)
                .enter().append("text")
                .attr("class", "linkLabel");

            pathLabel.append("textPath")
                .filter(function (d) { return d.source !== d.target; })
                .attr("xlink:href", function (d) { return "#" + rootId + d.name + d.source.name + d.target.name; })
                .attr("startOffset", "25%")
                .text(function (d) {
                    return d.name;
                });

            // add in the NODES
            var node = svg.append("svg:g").selectAll(".node")
                .data(graph.nodes)
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                })
                .call(d3.behavior.drag()
                    .origin(function (d) { return d; })
                    .on("dragstart", function () {
                        this.parentNode.appendChild(this);
                        d3.event.sourceEvent.stopPropagation();
                    })
                    .on("drag", function (d) {
                        d3.select(this).attr("transform",
                            "translate(" + (
                                d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))
                            ) + "," + (
                                d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
                            ) + ")");
                        sankey.relayout();
                        link.attr("d", path);
                    }));

            // add the rectangles for the NODES

            node.append("rect")
                .attr("height", function (d) { return myScale(d.dy); })
                .attr("width", sankey.nodeWidth())
                .style("fill", function (d) {
                    return d.color;
                })
                .style("stroke", function (d) {
                    return d3.rgb(d.color).darker(2);
                });

            // TODO: click / category filtering
            //node.on('click', function (d) {
            //    sm
            //        .select(d.identity)
            //        .then(ids => {
            //            if (ids.length > 0) {
            //                node.style('opacity', 0.5);
            //                node.style('stroke-width', '1px');
            //                d3.select(this).style('opacity', 1);
            //                d3.select(this).style('stroke-width', '3px');
            //            } else {
            //                node.style('opacity', 1);
            //                node.style('stroke-width', '1px');
            //            }
            //        });
            //});
            
            // Add Power BI tooltip info 
            TooltipManager.addTooltip(node, (tooltipEvent: TooltipEvent) => {
                return [
                    {
                        displayName: tooltipEvent.data.name,
                        value: formatter.format(tooltipEvent.data.value),
                    }
                ];
            }, true);

            if (showNodeLabels) {
                // add in the title for the NODES
                node.append("text")
                    .attr("x", -6)
                    .attr("y", function (d) { return d.dy / 2; })
                    .attr("dy", ".35em")
                    .attr("text-anchor", "end")
                    .attr("transform", null)
                    .text(function (d) { return d.name; })
                    .filter(function (d) { return d.x < width / 2; })
                    .attr("x", 6 + sankey.nodeWidth())
                    .attr("text-anchor", "start");
            }
        }

        public destroy(): void {
            this.root = null;
        }
        
        // This function retruns the values to be displayed in the property pane for each object.
        // Usually it is a bind pass of what the property pane gave you, but sometimes you may want to do
        // validation and return other values/defaults
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [];
            switch (options.objectName) {
                case 'linkLabels':
                    var linkLabels: VisualObjectInstance = {
                        objectName: 'linkLabels',
                        displayName: 'Link Labels',
                        selector: null,
                        properties: {
                            showNames: this.getShowNames(this.dataView),
                            showValues: this.getShowValues(this.dataView)
                        }
                    };
                    instances.push(linkLabels);
                    break;

                case 'nodeLabels':
                    var nodeLabels: VisualObjectInstance = {
                        objectName: 'nodeLabels',
                        displayName: 'Node Labels',
                        selector: null,
                        properties: {
                            showNodeLabels: this.getShowNodeLabels(this.dataView),
                        }
                    };
                    instances.push(nodeLabels);
                    break;
            }

            return instances;
        }
    }
}

