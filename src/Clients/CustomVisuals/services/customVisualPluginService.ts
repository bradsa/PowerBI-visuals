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

/// <reference path="../_references.ts" />

module powerbi.visuals.visualPluginFactory {
    export class CustomVisualPluginService extends VisualPluginService {
        private customVisualPlugins: jsCommon.IStringDictionary<IVisualPlugin>;

        public constructor() {
            super({});

            this.initCustomVisualPlugins();
        }

        public getVisuals(): IVisualPlugin[] {
            let registry: jsCommon.IStringDictionary<IVisualPlugin> = this.customVisualPlugins,
                names: string[] = Object.keys(registry);

            return names.map((name: string) => registry[name]);
        }

        public getPlugin(type: string): IVisualPlugin {
            if (!type) {
                return null;
            }

            let plugin: IVisualPlugin = this.customVisualPlugins[type];

            if (!plugin) {
                return null;
            }

            return plugin;
        }

        public capabilities(type: string): VisualCapabilities {
            let plugin: IVisualPlugin = this.getPlugin(type);

            if (plugin) {
                return plugin.capabilities;
            }

            return {};
        }

        private initCustomVisualPlugins(): void {
            // Radar Chart
            createPlugin(this.customVisualPlugins, powerbi.visuals.plugins.radarChart, () => new samples.RadarChart({
                animator: new BaseAnimator()
            }));

            // DotPlot
            createPlugin(this.customVisualPlugins, powerbi.visuals.plugins.dotPlot, () => new samples.DotPlot({
                animator: new BaseAnimator()
            }));

            // Histogram
            createPlugin(this.customVisualPlugins, powerbi.visuals.plugins.histogram, () => new samples.Histogram({
                animator: new BaseAnimator()
            }));

            // Area Range Chart
            createPlugin(this.customVisualPlugins, powerbi.visuals.plugins.areaRangeChart, () => new samples.AreaRangeChart({
                animator: new BaseAnimator()
            }));

            // Chiclet Slicer
            createPlugin(this.customVisualPlugins, powerbi.visuals.plugins.chicletSlicer, () => new samples.ChicletSlicer({
                behavior: new samples.ChicletSlicerWebBehavior()
            }));

            // Tornado Chart
            createPlugin(this.customVisualPlugins, powerbi.visuals.plugins.tornadoChart, () => new samples.TornadoChart({
                animator: new BaseAnimator()
            }));

            // Sankey Diagram
            createPlugin(this.customVisualPlugins, powerbi.visuals.plugins.sankeyDiagram, () => new samples.SankeyDiagram());

            // Word Cloud
            createPlugin(this.customVisualPlugins, powerbi.visuals.plugins.wordCloud, () => new samples.WordCloud({
                animator: new BaseAnimator()
            }));

            // Enhanced Scatter Chart
            createPlugin(this.customVisualPlugins, powerbi.visuals.plugins.enhancedScatterChart, () => new samples.EnhancedScatterChart());

            // Bullet Chart
            createPlugin(this.customVisualPlugins, powerbi.visuals.plugins.bulletChart, () => new samples.BulletChart());

            // Force Graph
            createPlugin(this.customVisualPlugins, powerbi.visuals.plugins.forceGraph, () => new samples.ForceGraph());
        }
    }

    export function createCustomVisualPluginService(): IVisualPluginService {
        return new CustomVisualPluginService();
    }
}