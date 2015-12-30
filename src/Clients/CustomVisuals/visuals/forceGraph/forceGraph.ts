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

/*
 *  This file is based on or incorporates material from the projects listed below (Third Party IP). 
 *  The original copyright notice and the license under which Microsoft received such Third Party IP, 
 *  are set forth below. Such licenses and notices are provided for informational purposes only. 
 *  Microsoft licenses the Third Party IP to you under the licensing terms for the Microsoft product. 
 *  Microsoft reserves all other rights not expressly granted under this agreement, whether by 
 *  implication, estoppel or otherwise.
 *  
 *  d3 Force Layout
 *  Copyright (c) 2010-2015, Michael Bostock
 *  All rights reserved.
 *  
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are met:
 *  
 *  * Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *  
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *  
 *  * The name Michael Bostock may not be used to endorse or promote products
 *    derived from this software without specific prior written permission.
 *  
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 *  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 *  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *  DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 *  BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 *  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 *  OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 *  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/// <reference path="../../_references.ts"/>

module powerbi.visuals.samples {
    export interface ForceGraphData {
        nodes: any;
        links: any;
        minFiles: number;
        maxFiles: number;
        linkedByName: any;
    }

    export class ForceGraph implements IVisual {
        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Values',
                    kind: VisualDataRoleKind.GroupingOrMeasure,
                },
            ],
            objects: {
                general: {
                    properties: {
                        formatString: {
                            type: { formatting: { formatString: true } },
                        },
                    },
                }
            },
            dataViewMappings: [{
                table: {
                    rows: {
                        for: { in: 'Values' },
                        dataReductionAlgorithm: { window: {} }
                    },
                    rowCount: { preferred: { min: 1 } }
                },
            }],
            suppressDefaultTitle: true,
        };

        private static VisualClassName = 'forceGraph';

        private root: D3.Selection;
        private paths: D3.Selection;
        private nodes: D3.Selection;
        private dataView: DataView;
        private data: ForceGraphData;
        private forceLayout: D3.Layout.ForceLayout;

        private marginValue: IMargin;
        private get margin(): IMargin {
            return this.marginValue || { left: 0, right: 0, top: 0, bottom: 0 };
        }

        private set margin(value: IMargin) {
            this.marginValue = $.extend({}, value);
            this.viewportInValue = ForceGraph.substractMargin(this.viewport, this.margin);
        }

        private viewportValue: IViewport;
        private get viewport(): IViewport {
            return this.viewportValue || { width: 0, height: 0 };
        }

        private set viewport(value: IViewport) {
            this.viewportValue = $.extend({}, value);
            this.viewportInValue = ForceGraph.substractMargin(this.viewport, this.margin);
        }

        private viewportInValue: IViewport;
        private get viewportIn(): IViewport {
            return this.viewportInValue || this.viewport;
        }

        private static substractMargin(viewport: IViewport, margin: IMargin): IViewport {
            return {
                width: Math.max(viewport.width - (margin.left + margin.right), 0),
                height: Math.max(viewport.height - (margin.top + margin.bottom), 0)
            };
        }
        
        // converts data from Values to two dimensional array
        // expected order: MemberFrom MemberTo Value Valu2 (optional - for coloring)
        public static converter(dataView: DataView): ForceGraphData {
            var nodes = {};
            var minFiles = Number.MAX_VALUE;
            var maxFiles = 0;
            var linkedByName = {};

            //var links = [
            //    { "source": "john", "target": "joe", "filecount": 50 },
            //    { "source": "john", "target": "bob", "filecount": 150 },
            //    { "source": "mary", "target": "joe", "filecount": 80 },
            //    { "source": "bob", "target": "mary", "filecount": 70 },
            //    { "source": "joe", "target": "bob", "filecount": 20 },
            //];

            //links.forEach(function (link) {
            //    link.source = nodes[link.source] ||
            //    (nodes[link.source] = { name: link.source });
            //    link.target = nodes[link.target] ||
            //    (nodes[link.target] = { name: link.target });
            //    //link.value = +link.filecount;
            //    if (link.filecount < minFiles) { minFiles = link.filecount };
            //    if (link.filecount > maxFiles) { maxFiles = link.filecount };
            //    linkedByName[link.source.name + "," + link.target.name] = 1;
            //});

            var links = [];
            //var rows = [
            //    ["Harry", "Sally", 4631],
            //    ["Harry", "Mario", 4018]
            //];
            if (dataView && dataView.table) {
                var rows = dataView.table.rows;
                rows.forEach(function (item) {
                    linkedByName[item[0] + "," + item[1]] = 1;
                    var link = {
                        "source": nodes[item[0]] || (nodes[item[0]] = { name: item[0] }),
                        "target": nodes[item[1]] || (nodes[item[1]] = { name: item[1] }),
                        "filecount": item[2]
                    };
                    if (link.filecount < minFiles) {
                        minFiles = link.filecount;
                    }

                    if (link.filecount > maxFiles) {
                        maxFiles = link.filecount;
                    }

                    links.push(link);
                });
            };
            var data = {
                "nodes": nodes, "links": links, "minFiles": minFiles, "maxFiles": maxFiles, "linkedByName": linkedByName
            };

            return data;
        }

        public init(options: VisualInitOptions): void {
            this.root = d3.select(options.element.get(0));
            this.forceLayout = d3.layout.force();
        }

        public update(options: VisualUpdateOptions) {
            if (!options.dataViews || (options.dataViews.length < 1)) return;
            this.data = ForceGraph.converter(this.dataView = options.dataViews[0]);
            this.viewport = options.viewport;

            var k = Math.sqrt(Object.keys(this.data.nodes).length / (this.viewport.width * this.viewport.height));
            this.root.selectAll("svg").remove();

            var svg = this.root
                .append("svg")
                .attr("width", this.viewport.width)
                .attr("height", this.viewport.height)
                .classed(ForceGraph.VisualClassName, true);

            this.updateNodes();
            this.forceLayout
                .links(this.data.links)
                .gravity(100 * k)
                .size([this.viewport.width, this.viewport.height])
                .linkDistance(100)
                .charge(-15 / k)
                .on("tick", this.tick());
            this.updateNodes();
            this.forceLayout.start();

            var scale0to100 = d3.scale.linear().domain([this.data.minFiles, this.data.maxFiles]).range([2, 10]).clamp(true);

            this.paths = svg.selectAll(".link")
                .data(this.forceLayout.links())
                .enter().append("path")
                .attr("class", "link")
                .attr("stroke-width", d => scale0to100(d.filecount))
                .on("mouseover", this.fadePath(.3))
                .on("mouseout", this.fadePath(1));

            this.paths.append("title").text(d => d.source.name + "-" + d.target.name + ":" + d.filecount);

            // define the nodes
            this.nodes = svg.selectAll(".node")
                .data(this.forceLayout.nodes())
                .enter().append("g")
                .attr("class", "node")
                .call(this.forceLayout.drag)
                .on("mouseover", this.fadeNode(.3))
                .on("mouseout", this.fadeNode(1))
                .on("mousedown", () => d3.event.stopPropagation());
                
            // add the nodes
            this.nodes.append("circle")
                .attr("r", d => d.weight < 10 ? 10 : d.weight);

            // add the text 
            this.nodes.append("text")
                .attr("x", 12)
                .attr("dy", ".35em")
                .text(d => d.name);
        }

        private updateNodes() {
            var oldNodes = this.forceLayout.nodes();
            this.forceLayout.nodes(d3.values(this.data.nodes));
            this.forceLayout.nodes().forEach((node, i) => {
                if (!oldNodes[i]) {
                    return;
                }
                node.x = oldNodes[i].x;
                node.y = oldNodes[i].y;
                node.px = oldNodes[i].px;
                node.py = oldNodes[i].py;
                node.weight = oldNodes[i].weight;
            });
        }

        private fadePath(opacity) {
            return (d) => {
                this.paths.style("stroke-opacity", o => o.source === d.source && o.target === d.target ? 1 : opacity);
                this.paths.style("stroke", o => o.source === d.source && o.target === d.target ? "#f00" : "#bbb");
            };
        }

        private fadeNode(opacity) {
            var isConnected = (a, b) => this.data.linkedByName[a.name + "," + b.name]
                                            || this.data.linkedByName[b.name + "," + a.name]
                                            || a.name === b.name;
            return (d) => {
                this.nodes.style("stroke-opacity", function (o) {
                    var thisOpacity = isConnected(d, o) ? 1 : opacity;
                    this.setAttribute('fill-opacity', thisOpacity);
                    return thisOpacity;
                });

                this.paths.style("stroke-opacity", o => o.source === d || o.target === d ? 1 : opacity);
                this.paths.style("stroke", o => o.source === d || o.target === d ? "#f00" : "#bbb");
            };
        }
         
        // add the curvy lines
        private tick() {
            var viewport = this.viewportIn;
            //"width/height * 20" seems enough to move nodes freely by force layout.
            var maxWidth = viewport.width * 20;
            var maxHeight = viewport.height * 20;

            var limitX = x => Math.max((viewport.width - maxWidth) / 2, Math.min((viewport.width + maxWidth) / 2, x));
            var limitY = y => Math.max((viewport.height - maxHeight) / 2, Math.min((viewport.height + maxHeight) / 2, y));
            var getPath = d => {
                d.source.x = limitX(d.source.x);
                d.source.y = limitY(d.source.y);
                d.target.x = limitX(d.target.x);
                d.target.y = limitY(d.target.y);
                var dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = Math.sqrt(dx * dx + dy * dy);
                return "M" +
                    d.source.x + "," +
                    d.source.y + "A" +
                    dr + "," + dr + " 0 0,1 " +
                    d.target.x + "," +
                    d.target.y;
            };

            return () => {
                this.paths.each(function () { this.parentNode.insertBefore(this, this); });
                this.paths.attr("d", getPath);
                this.nodes.attr("transform", d => "translate(" + limitX(d.x) + "," + limitY(d.y) + ")");
            };
        }

        public destroy(): void {
            this.root = null;
        }
    }
}