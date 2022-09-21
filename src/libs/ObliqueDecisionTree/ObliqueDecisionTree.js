import * as d3 from 'd3';
import _ from 'lodash';
import textures from 'textures';
import { adjustedClientRect, getEffectiveFeatureContribution,
    traverseTree, maxDepth, maxWidth } from '@/libs/ObliqueDecisionTree/Utils';
import { drawClassDistribution, drawCoefficientBar, drawCoefficientDonutChart, drawSplitHistogram,
    drawExposedSplitHistogram } from '@/libs/ObliqueDecisionTree/RenderSummaryView';
import { drawScatterPlot, drawBeeswarm, drawOneFeatureHistogram, drawFeatureHistogram, drawTwoFeatureBeeswarm,
    drawSplitHistogramInDetailedView, drawExposedSplitHistogramInDetailedView } from '@/libs/ObliqueDecisionTree/RenderDetailedView';

class Odt {
    static initClass() {
        this.diagramIndex = 0;
        this.diagramName = "odt";
        // Add functions to this class by assigning to its prototype
        // Assign functions for rendering summary view
        Odt.prototype.drawClassDistribution = drawClassDistribution;
        Odt.prototype.drawCoefficientBar = drawCoefficientBar;
        Odt.prototype.drawCoefficientDonutChart = drawCoefficientDonutChart;
        Odt.prototype.drawSplitHistogram = drawSplitHistogram;
        Odt.prototype.drawExposedSplitHistogram = drawExposedSplitHistogram;
        // Assign functions for rendering detailed view
        Odt.prototype.drawScatterPlot = drawScatterPlot;
        Odt.prototype.drawBeeswarm = drawBeeswarm;
        Odt.prototype.drawOneFeatureHistogram = drawOneFeatureHistogram;
        Odt.prototype.drawFeatureHistogram = drawFeatureHistogram;
        Odt.prototype.drawTwoFeatureBeeswarm = drawTwoFeatureBeeswarm;
        Odt.prototype.drawSplitHistogramInDetailedView = drawSplitHistogramInDetailedView;
        Odt.prototype.drawExposedSplitHistogramInDetailedView = drawExposedSplitHistogramInDetailedView;
    }

    constructor(unsanitisedElement) {
        this.id = `${Odt.diagramName}-${Odt.diagramIndex}`;
        this.rootElement = _.has(unsanitisedElement, 'length') ? document.querySelector(unsanitisedElement[0]) : document.createElement('div');
        this.registeredStateListeners = [];
        // Bind listeners to self

    }

    /**
     * Initialize Oblique Tree View, including clearing state listeners,
     * updating the container, and reassign this.
     * @date 2022-06-14
     */
    init() {
        // Unregister existing listeners
        this.registeredStateListeners.forEach(dergisterFn => dergisterFn());
        this.rootElement.innerHTML = '';
        // Clear DOM (such as d3-tip)

        // Reset container dimensions
        this.updateContainerDimensions();

        _.assign(this, {
            data: null,
            nodes: null,
            trainX: null,
            trainY: null,
            opts: null,
            selectedPoints: [],
            selectedFeatureNames: [],
            exposedFlowLinks: [],
            uniqueDecisionPaths: [],
            exposedFeatureContributions: [],
            registeredStateListeners: [],
            pathsIdInDetailView: {
                upper: [],
                lower: []
            },
            computed: {},
            constants: {
                nameFontSize: 10,
                nameFontFamily: 'sans-serif',
                minZoom: 0.1,
                maxZoom: 50,
                nodeRectRatio: 25,
                leafNodeRectRatio: 0,
                nodeRectWidth: 0,
                detailedViewNodeRectWidth: 0,
                leafNodeRectHeight: 300,
                histogramHeight: 100,
                scatterPlotPadding: 20,
                histogramScatterPlotPadding: 10,
                nodeRectStrokeWidth: 3,
                leafNodeRectStrokeWidth: 3,
                colorScale: ["#66c2a5", "#fc8d62", "#8da0cb"],
                classNames: {
                    "penguins": ['Adelie','Gentoo','Chinstrap'],
                    "iris": ['setosa', 'versicolor', 'virginica'],
                    "wine": ['class_0', 'class_1', 'class_2']
                },
                featureColorScale: d3.scaleOrdinal(["#4e79a7","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab"]),
                featureArr: null,
                featureTable: null,
                localFeatureContribution: null,
                maxCollisionResolutionAttempts: 7,
                transitionDuration: 400,
                treeMargins: { top: 20, left: 20, bottom: 20, right: 20 },
            },
            parts: {},
        })
    }


    /**
     * Update Oblique Tree View according to information about
     * the size of DOMRect element and its position relative to
     * the viewport.
     * @date 2022-06-14
     */
    updateContainerDimensions() {
        try {
            const { width, height, screenHeight, screenWidth, scale } = adjustedClientRect(this.rootElement);
            _.assign(this, { width, height, screenHeight, screenWidth, scale });
        } catch (err) {
            err.message = `Fail to reset the container: ${err.message}`;
            throw err;
        }
    }

    draw() {
        const { opts, data, parts, height, width, scale, constants: { nodeRectWidth, classNames, colorScale, leafNodeRectHeight } } = this;

        this.computeGlobalFeatureContribution();
        const zoomed = ({ transform }) => {
            parts.svgGroup.attr('transform', transform);
        }

        const zoomListener = d3.zoom()
            .on('zoom', zoomed);
        this.registeredStateListeners.push(zoomListener);
        // Reset zoom listener
        function reset (event, d) {
            if (event.shiftKey !== true && parts.svgGroup.node().querySelector(".detailed") === null) {
                parts.baseSvg.transition()
                    .duration(750)
                    .call(zoomListener.transform,
                        d3.zoomIdentity.scale(scale));
            }
        }
        // Create the base svg binding it to rootElement
        parts.baseSvg = d3.select(this.rootElement)
            .append('svg')
            .attr('id', this.id)
            .attr('class', 'oblique-tree-view')
            .attr('width', width)
            .attr('height', height)
            .on('click', reset);

        // Create a container to group other tree diagram related svg elements
        parts.svgGroup = parts.baseSvg
            .append('g')
            .attr('class', 'oblique-tree-group')
            .attr("transform",`translate(${0},${0})`)
            .attr("transform", `scale(${scale})`);

        // Register zoom listener to set up the initial zoom level
        parts.baseSvg.call(zoomListener)
            .call(zoomListener.transform, 
                d3.zoomIdentity.scale(scale));

        parts.treeMap = d3.tree().size([width, 
            height-leafNodeRectHeight]);
        let nodes = d3.hierarchy(data);
        nodes = parts.treeMap(nodes);
        // Assign y-axis position difference plus half of the node rect width to detail view node rect width
        this.constants.detailedViewNodeRectWidth = Math.abs(nodes.y - nodes.children[0].y) + 0.2 * nodeRectWidth;
        this.nodes = nodes;
        // Modify element for each node recursively
        // traverseTree(nodes);
        // Render Oblique Tree Links and Nodes
        this.renderLinks(nodes.descendants().slice(1));
        this.renderNodes(nodes.descendants());
        // Enable zooming
        // this.enableZooming();
        const legendRectSize = 100;
        const legendSpacing = legendRectSize/4;
        // Render class legend
        parts.svgGroup.selectAll("class-legend")
            .data(this.constants.classNames[opts.dataset_name])
            .enter()
            .append("rect")
            .attr("x", 100)
            .attr("y", (d, i) => legendRectSize+i*(legendRectSize+legendSpacing))
            .attr("width", legendRectSize)
            .attr("height", legendRectSize)
            .style("fill", (d, i) => colorScale[i])

        // Render class legend text
        parts.svgGroup.selectAll("class-legend-text")
            .data(this.constants.classNames[opts.dataset_name])
            .enter()
            .append("text")
            .attr("x", 100 + legendRectSize+legendSpacing)
            .attr("y", (d, i) => legendRectSize+i*(legendRectSize+legendSpacing)+legendRectSize*0.5)
            .text(d => d)
            .style("fill", (d, i) => colorScale[i])
            .style("font-size", legendRectSize*0.5)
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")

    }

    /**
     * Update Oblique Tree View accordingly.
     * @date 2022-07-11
     * @param {status = "on"} parm1
     */
    update(status = "on") {
        const { parts, trainY, trainX, selectedPoints, exposedFlowLinks, uniqueDecisionPaths, 
            constants: { colorScale } } = this;
        let _this = this;
        switch (status) {
            case "on":
                // Remove all exposed flow links
                parts.svgGroup.selectAll("path.exposed-flow-link").remove();

                // Remove all exposed split histograms
                parts.svgGroup.selectAll("g.exposed-split-distribution").remove();

                // Remove all detailed exposed split histograms
                parts.svgGroup.selectAll("g.detail-exposed-split-distribution").remove();
                
                // Update all the links and nodes' opacity to 0.4 in the vis 
                d3.selectAll("g.node")
                    .style("opacity", 0.4);
                d3.selectAll("path.link")
                    .style("opacity", 0.4);

                d3.selectAll("circle.detailed.dot")
                    .style("fill", "white");
                
                selectedPoints.forEach((id) => {
                    d3.selectAll(`circle#dot-${id}`)
                        .style("fill", colorScale[trainY[id]]);
                });

                // Update related links and nodes' opacity to 1 in the vis
                exposedFlowLinks.forEach((exposedFlowLink) => {
                    // Hightlight the full width exposed flow link with opacity 0.8
                    d3.selectAll(`path.link#${exposedFlowLink.pathId}`)
                        .style("opacity", 0.8);
                    // Highlight the exposed flow link by drawing a new link over the old one
                    _this.renderExposedLinks(parts.svgGroup, exposedFlowLink);
                });
                uniqueDecisionPaths?.forEach((uniqueDecisionPath) => {
                    let idArr = uniqueDecisionPath.idArr.slice();
                    uniqueDecisionPath?.path.forEach((decisionNode) => {
                        let currNodeData = d3.selectAll(`g.node#${decisionNode}`).data()[0].data;
                        const decisionNodeData = {
                            data: {
                                totalCount: new Array(3).fill(0),
                                leftCount: new Array(3).fill(0),
                                rightCount: new Array(3).fill(0),
                                subTrainingSet: []
                            }
                        };
                        idArr.forEach((id) => {
                            if (currNodeData.subTrainingSet.includes(id)) {
                                decisionNodeData.data.subTrainingSet.push(id);
                                decisionNodeData.data.totalCount[uniqueDecisionPath.label]++;
                            }
                        });
                        decisionNodeData.data.subTrainingSet.forEach((id) => {
                            if (currNodeData.type === "decision") {
                                let X = Object.values(trainX[id]);
                                let sum = currNodeData.split[currNodeData.split.length-1];
                                sum += X.map((val, i) => val*currNodeData.split[i]).reduce((a, b) => a+b);
                                if (sum < 0) {
                                    decisionNodeData.data.leftCount[uniqueDecisionPath.label]++;
                                } else {
                                    decisionNodeData.data.rightCount[uniqueDecisionPath.label]++;
                                }
                            }
                        });
                        // Select all related svg groups and apply opacity 1
                        const currNodeSvgGroup = d3.select(d3.selectAll(`rect.node-rect#${decisionNode}`).node().parentNode);
                        // Highlight related decision nodes with opacity 1
                        currNodeSvgGroup.style("opacity", 1);
                        if (currNodeSvgGroup.node().querySelector(".detailed") === null) {
                            // Draw new split distribution rects to highlight the selected data points
                            _this.drawExposedSplitHistogram(currNodeSvgGroup, currNodeData, decisionNodeData, _this);
                        }
                        if (currNodeSvgGroup.node().querySelector(".detailed") !== null) {
                            // Draw new split distribution rects to highlight the selected data points
                            if (currNodeData.featureIdx.length !== 1) {
                                _this.drawExposedSplitHistogramInDetailedView(currNodeSvgGroup, currNodeData, decisionNodeData, _this);
                            }
                        }
                    });
                });
                break;
            case "reset":
                // Recover all nodes and links to their original opacity
                d3.selectAll("path.link")
                    .style("opacity", 1);
                d3.selectAll("g.node")
                    .style("opacity", 1);
                
                // Remove all exposed flow links
                parts.svgGroup.selectAll("path.exposed-flow-link").remove();

                // Remove all exposed split histograms
                parts.svgGroup.selectAll("g.exposed-split-distribution").remove();

                // Remove all detailed exposed split histograms
                parts.svgGroup.selectAll("g.detail-exposed-split-distribution").remove();

                // Recover circle fill color in scatter plots
                d3.selectAll("circle.detailed.dot")
                    .style("fill", d => (typeof d === 'object' && d !== null) ? colorScale[d.label] : colorScale[trainY[d]]);
                break;
            default:
                throw new Error(`Unknown status: ${status}`);
            }
        }


    /**
     * Render sankey-like links according to param links
     * param links should be an array of objects with 
     * length # of classes * # of links in the tree diagram.
     * @date 2022-06-14
     * @param {links} links
     */
    renderLinks(links) {
        const { parts, constants: { colorScale } } = this;
        const flowLinks = this.generateFlows(links);
        parts.svgGroup.selectAll(".link")
            .data(flowLinks)
            .enter().append("path")
            .attr("class", (d) => {
                let currNodeName = d.id.split("-")[0];
                return `link ${currNodeName}`;
            })
            .attr("id", (d) => d.id)
            .attr("d", (d) => {
                return d3.area().curve(d3.curveBumpY).x0(dd => dd.x0).x1(dd => dd.x1).y(dd => dd.y)([
                    {
                        x0: d.source.x - 0.5 * d.source.width,
                        x1: d.source.x + 0.5 * d.source.width,
                        y: d.source.y,
                    },
                    {
                        x0: d.target.x - 0.5 * d.target.width,
                        x1: d.target.x + 0.5 * d.target.width,
                        y: d.target.y,
                    }
                ]);
            })
            .style("fill", (d) => colorScale[d.class])
            .style("stroke", "none");

    }

    /**
     * Render exposed sankey-like nodes according to param nodes
     * @date 2022-07-11
     * @param {targetSelection} targetSelection
     * @param {exposedFlowLink} exposedFlowLink
     */
    renderExposedLinks(targetSelection, exposedFlowLink) {
        const { constants: { nodeRectWidth, detailedViewNodeRectWidth, nodeRectStrokeWidth, colorScale }} = this;
        let currLinkData = d3.selectAll(`path.link#${exposedFlowLink.pathId}`).data()[0];
        let currWidth = (exposedFlowLink.count/currLinkData.count)*currLinkData.source.width;
        // Compute flow data for exposed flow link
        const flowLinkData = {
            source: {
                x: currLinkData.source.x-0.5*(currLinkData.source.width-currWidth),
                y: currLinkData.source.y,
                width: currWidth,
            },
            target: {
                x: currLinkData.target.x-0.5*(currLinkData.source.width-currWidth),
                y: currLinkData.target.y,
                width: currWidth,
            },
            class: currLinkData.class,
            id: exposedFlowLink.pathId,
        };

        // Draw new flow path line with the new width
        targetSelection.selectAll("link.exposed-flow-link")
            .data([flowLinkData])
            .enter()
            .append("path")
            .attr("class", (d) => {
                let currNodeName = d.id.split("-")[0];
                return `link exposed-flow-link ${currNodeName}`;
            })
            .attr("id", (d) => d.id)
            .attr("d", (d) => {
                return d3.area().curve(d3.curveBumpY).x0(dd => dd.x0).x1(dd => dd.x1).y(dd => dd.y)([
                    {
                        x0: d.source.x - 0.5 * d.source.width,
                        x1: d.source.x + 0.5 * d.source.width,
                        y: d.source.y+0.5*nodeRectStrokeWidth
                            + (this.pathsIdInDetailView.lower.includes(d.id.split("-")[0])
                                ? 0.5*(detailedViewNodeRectWidth-nodeRectWidth) : 0),
                    },
                    {
                        x0: d.target.x - 0.5 * d.target.width,
                        x1: d.target.x + 0.5 * d.target.width,
                        y: (exposedFlowLink.pathId.includes("f") 
                            ? d.target.y-0.2*nodeRectStrokeWidth
                            : d.target.y-0.5*nodeRectStrokeWidth)
                            + (this.pathsIdInDetailView.upper.includes(d.id.substring(0, d.id.length-1))
                                ? -0.5*(detailedViewNodeRectWidth-nodeRectWidth) : 0),
                    }
                ]);
            })
            .style("fill", (d) => colorScale[d.class])
            .style("stroke", "#000");
    }

    /**
     * Re-render sankey-like nodes according to pathsIdInDetailView
     * @date 2022-07-10
     */
    updateFlowLinks() {
        const { parts, pathsIdInDetailView, constants: { transitionDuration, nodeRectWidth, detailedViewNodeRectWidth, nodeRectStrokeWidth } } = this;
        parts.svgGroup.selectAll("path.link")
            .transition()
            .duration(transitionDuration)
                .attr("d", (d) => {
                    return d3.area().curve(d3.curveBumpY).x0(dd => dd.x0).x1(dd => dd.x1).y(dd => dd.y)([
                        {
                            x0: d.source.x - 0.5 * d.source.width,
                            x1: d.source.x + 0.5 * d.source.width,
                            y: d.source.y+0.5*nodeRectStrokeWidth
                                + (pathsIdInDetailView.lower.includes(d.id.split("-")[0])
                                    ? 0.5*(detailedViewNodeRectWidth-nodeRectWidth) : 0),
                        },
                        {
                            x0: d.target.x - 0.5 * d.target.width,
                            x1: d.target.x + 0.5 * d.target.width,
                            y: d.target.y-0.5*nodeRectStrokeWidth
                                + (pathsIdInDetailView.upper.includes(d.id.substring(0, d.id.length-1))
                                    ? -0.5*(detailedViewNodeRectWidth-nodeRectWidth) : 0),
                        }
                    ]);
                });
    }


    /**
     * Render decision and leaf nodes according to the param nodes 
     * which is an array of node objects.
     * @date 2022-06-14
     * @param {nodes} nodes
     */
    renderNodes(nodes) {
        const { parts, screenHeight, screenWidth, width, height, scale,
            constants: { nodeRectWidth, nodeRectRatio, leafNodeRectRatio, nodeRectStrokeWidth, leafNodeRectHeight, leafNodeRectStrokeWidth, detailedViewNodeRectWidth, transitionDuration } } = this;
        let _this = this;

        // Click event listener to switch between summary and detailed views
        function clicked(event, node) {
            if (event.shiftKey && node.data.type === "decision") {
                let currNodeGroup = d3.select(this);
                let currNodeName = currNodeGroup.data()[0].data.name, parentNodeName = "";
                _this.pathsIdInDetailView.lower.push(currNodeName);
                if (currNodeName !== "root") {
                    parentNodeName = currNodeGroup.data()[0].parent.data.name;
                    _this.pathsIdInDetailView.upper.push(`${parentNodeName}-${currNodeName}-`);
                }
                if (currNodeGroup.node().querySelector(".detailed") !== null || 
                    (currNodeGroup.node().querySelector(".detailed") === null &&
                        currNodeGroup.node().querySelector(".summary") === null)) {
                    // Remove the detailed view and render the summary view
                    currNodeGroup.selectAll(".detailed").remove();
                    _this.renderSummaryView(currNodeGroup);

                    // Update the pathsIdInDetailView
                    _this.pathsIdInDetailView.lower = _.without(_this.pathsIdInDetailView.lower, currNodeName);
                    _this.pathsIdInDetailView.upper = _.without(_this.pathsIdInDetailView.upper, `${parentNodeName}-${currNodeName}-`);
                    
                    // Update all the affected flow paths
                    _this.updateFlowLinks();

                    // Update the node rect width and stroke width
                    d3.select(this).select(".node-rect")
                    .transition()
                    .duration(transitionDuration)
                        .attr("x", -0.5*nodeRectWidth)
                        .attr("y", 0)
                        .attr("width", nodeRectWidth)
                        .attr("height", nodeRectWidth)
                    .on("end", () => {
                        // Re-render the exposed split histogram and flow links
                        if (_this.uniqueDecisionPaths.length !== 0) {
                            _this.update();
                        } else {
                            _this.update("reset");
                        };
                    })
                } else {
                    // Update all the affected flow paths
                    _this.updateFlowLinks();
                    // Update the node rect width and stroke width
                    d3.select(this).select(".node-rect")
                    .transition()
                    .duration(transitionDuration)
                        .attr("x", -0.5*nodeRectWidth-0.5*(detailedViewNodeRectWidth-nodeRectWidth))
                        .attr("y", -0.5*(detailedViewNodeRectWidth-nodeRectWidth))
                        .attr("width", detailedViewNodeRectWidth)
                        .attr("height", detailedViewNodeRectWidth)
                    .on("end", () => {
                        // Remove the summary view and render the detailed view after the transition
                        currNodeGroup.selectAll(".summary").remove();
                        const zoomListener = _this.registeredStateListeners[0];
                        // Center the node rect in the viewport
                        parts.svgGroup.transition()
                            .duration(750)
                            .call(zoomListener.transform,
                                d3.zoomIdentity.translate(screenHeight/2, screenWidth/2)
                                    .translate(-node.x, -node.y-nodeRectWidth/2)
                                    .scale(1),d3.pointer(event));
                        // Update the transform and scale of zoom listener in the detailed view
                        parts.baseSvg.call(zoomListener)
                                .call(zoomListener.transform,
                                    d3.zoomIdentity.translate(screenHeight/2, screenWidth/2)
                                    .translate(-node.x, -node.y-nodeRectWidth/2)
                                    .scale(1),d3.pointer(event));
                        // Render the detailed view
                        _this.renderDetailedView(currNodeGroup);
                        if (_this.uniqueDecisionPaths.length !== 0) {
                            _this.update();
                        } else {
                            _this.update("reset");
                        };
                    });
                }
            }
        }

        // Create svg group binding decision and leaf nodes
        const node = parts.svgGroup.selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .attr("class", (d) => { 
                return "node" + 
                (d.children ? " node--internal" : " node--leaf"); 
            })
            .attr("id", (d) => d.data.name)
            .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
            .on("click", clicked);
        
        // Add a rectangle to each node
        node.append("rect")
            .attr("class", "node-rect")
            .attr("id", (d) => d.data.name)
            .attr("width", nodeRectWidth)
            .attr("height", (d) => d.data.type === "leaf" ? leafNodeRectHeight : nodeRectWidth)
            .attr("x",- 0.5 * nodeRectWidth)
            .attr("y",0)
            .attr("rx", (d) => d.data.type === "leaf" ? leafNodeRectRatio : nodeRectRatio)
            .attr("ry", (d) => d.data.type === "leaf" ? leafNodeRectRatio : nodeRectRatio)
            .style("fill", "#fff")
            .style("stroke", "#000000")
            .style("stroke-width", (d) => d.data.type === "leaf" ? leafNodeRectStrokeWidth : nodeRectStrokeWidth);
        
        // this.renderPathSummaryView(node);
        this.renderSummaryView(node);
        this.renderPathSummaryViewNew(node);
    }

    /**
     * Render summary view in each decision node
     * @date 2022-06-17
     * @param {node} node
     */
    renderSummaryView(node) {
        let _this = this;
        // Draw class distribution
        node.each(function(nodeData, index) {
            if (nodeData.data.type === "decision") {
                // Draw class distribution
                // _this.drawClassDistribution(d3.select(this), nodeData, _this);
                if (nodeData.data.featureIdx.length === 2) {
                    // Draw feature coefficients distribution
                }
                // Draw feature coefficients distribution
                _this.drawCoefficientBar(d3.select(this), nodeData, _this);
                // _this.drawCoefficientDonutChart(d3.select(this), nodeData, _this);
                // Draw split point distribution
                _this.drawSplitHistogram(d3.select(this), nodeData, _this);
            }
            
        })
    }

    /**
     * Render detailed view in each decision node
     * @date 2022-06-16
     * @param {node} node
     */
    renderDetailedView(node) {
        const { constants: { histogramHeight, detailedViewNodeRectWidth, scatterPlotPadding, histogramScatterPlotPadding, featureArr } } = this;
        let _this = this;
        // Map two feature variables into visual representations
        const x = featureArr.map(f => d3.scaleLinear()
            .domain(d3.extent(this.trainX, d => d[f]))
            .range([0, detailedViewNodeRectWidth-histogramHeight-3*scatterPlotPadding-histogramScatterPlotPadding]));

        const y = x.map(x => x.copy()
            .range([detailedViewNodeRectWidth-histogramHeight-3*scatterPlotPadding-histogramScatterPlotPadding, 0]));

        // Add dots in each decision node
        node.each(function (nodeData, index) {
            let currFeatureIdx = nodeData.data.featureIdx;
            if (currFeatureIdx.length === 2) {
                // Draw two-feature scatter plot
                _this.drawScatterPlot(node, nodeData, currFeatureIdx, x, y, _this);
                // Draw two-feature histogram
                // _this.drawTwoFeatureBeeswarm(node, nodeData, currFeatureIdx, _this);
                _this.drawFeatureHistogram(node, nodeData, currFeatureIdx, x, y, _this);
                _this.drawSplitHistogramInDetailedView(node, nodeData, _this);
            }

            if (currFeatureIdx.length === 1) {
                // Draw strip chart for one-feature classifier
                // _this.drawBeeswarm(node, nodeData, currFeatureIdx, _this);
                _this.drawOneFeatureHistogram(node, nodeData, currFeatureIdx, _this);
            }
        })
    }


    renderPathSummaryViewNew(node) {
        const { parts, screenHeight, screenWidth, scale,
            constants: { nodeRectWidth, nodeRectRatio, nodeRectStrokeWidth, leafNodeRectStrokeWidth, 
                transitionDuration, colorScale } } = this;
        let _this = this;
        let svgGroupY;
        function clicked (event, node) {
            if (event.shiftKey) {
                if (d3.select(this).attr("clip-path") !== null) {
                    const zoomListener = _this.registeredStateListeners[0];
                    // Center the node rect in the viewport
                    parts.svgGroup.transition()
                        .duration(750)
                        .call(zoomListener.transform,
                            d3.zoomIdentity.translate(screenHeight/2, screenWidth/2)
                                .translate(-node.x, -node.y-nodeRectWidth)
                                .scale(1),d3.pointer(event));
                    // Update the transform and scale of zoom listener in the path summary view
                    parts.baseSvg.call(zoomListener)
                            .call(zoomListener.transform,
                                d3.zoomIdentity.translate(screenHeight/2, screenWidth/2)
                                .translate(-node.x, -node.y-nodeRectWidth)
                                .scale(1),d3.pointer(event));

                    d3.select(this).attr("clip-path", null)
                        .select(".node-rect")
                        .style("stroke", "transparent");
                        
                    d3.select(this).select(".hidden-rect")
                        .style("stroke", "black");
                    
                    d3.select(this).select(".scroll-bar")
                        .style("opacity", 0);
                } else {
                    d3.select(this).attr("clip-path", "url(#scrollbox-clip-path)")
                        .select(".node-rect")
                        .style("stroke", "black");

                    d3.select(this).select(".hidden-rect")
                        .style("stroke", "transparent");

                    d3.select(this).select(".scroll-bar")
                        .style("opacity", 1);
                }
            }
        }
        node.each(function (nodeData, index) {
            if (nodeData.data.type === "leaf") {
                const foreignObject = d3.select(this)
                    .append("svg:foreignObject")
                    .attr("class", "path-summary foreign-object")
                    .attr("width", nodeRectWidth)
                    .attr("height", nodeRectWidth)
                    .attr("x", -0.5 * nodeRectWidth)
                    .attr("y", 0);
                    
                const leafNodeTable = foreignObject.append("xhtml:body")
                    .append("table")
                    .attr("class", "path-summary table-auto border-separate border border-slate-400")
                    .attr("id", `path-summary table-${nodeData.data.name}`);

                const leafNodeTableHead = leafNodeTable.append("thead")
                    .attr("class", "path-summary-table-head")
                    .attr("id", `path-summary table-head-${nodeData.data.name}`);
                const leafNodeTableHeadRow = leafNodeTableHead.append("tr")
                    .attr("class", "path-summary table-head-row");
                
                const leafNodeTableBody = leafNodeTable.append("tbody")
                    .attr("class", "path-summary table-body");
                
                // Get valid feature contribution data for this node
                const { fcArr, fcRange } = getEffectiveFeatureContribution(nodeData, _this);
                // Add feature contribution table head
                leafNodeTableHeadRow.selectAll("th")
                    .data(["Name", "Contribution"])
                    .join("th")
                    .attr("class", "path-summary table-head-cell border rounded font-bold text-base border-slate-300")
                    .append((d) => {
                        const headerDiv = document.createElement("div");
                        headerDiv.setAttribute("class", "path-summary table-head-cell-header m-auto");
                        let w, h = 0.1*nodeRectWidth, padding = 10;
                        if (d === "Name") w = 0.25 * nodeRectWidth;
                        if (d === "Contribution") w = 0.7 * nodeRectWidth;
                        const headerSvg = d3.select(headerDiv)
                            .append("svg")
                            .attr("width", w)
                            .attr("height", h)
                            .attr("class", "path-summary table-head-cell-header-svg");
                        const headerG = headerSvg.append("g")
                            .attr("class", "path-summary table-head-cell-header-g")
                            .attr("id", `path-summary table-head-cell-header-g-${d}`);
                        headerG.append("text")
                            .attr("class", "path-summary table-head-cell-header-text")
                            .attr("x", padding)
                            .attr("y", h-padding)
                            .attr("dominant-baseline", "middle")
                            .style("font-weight", "bold")
                            .text(d);
                        return headerDiv;
                    })

                // Append table body rows
                const leafNodeTableBodyRow = leafNodeTableBody.selectAll("tr")
                    .data(fcArr)
                    .join("tr")
                    .attr("class", "path-summary table-body-row");

                leafNodeTableBodyRow.selectAll("td")
                    .data((d,i) => Object.entries(d).map(([key, value]) => ({
                        key: key,
                        value: value,
                        index: i
                    })))
                    .enter()
                    .append("td")
                    .attr("class", "border rounded text-center border-slate-300");

                // Append table body cells
                leafNodeTableBodyRow.selectAll("td")
                    .filter((d) => d.key === "featureName")
                    .attr("id", (d) => `path-summary table-body-cell-${nodeData.data.name}-${d.index}`)
                    .attr("width", "30%")
                    .append((d,i) => {
                        const featureNameDiv = document.createElement("div");
                        featureNameDiv.setAttribute("class", "path-summary table-body-cell-feature-name flex justify-center m-auto")
                        const w = 0.3*nodeRectWidth, h = 0.3*nodeRectWidth, padding = 10;
                        const featureNameSvg = d3.select(featureNameDiv)
                            .append("svg")
                            .attr("width", w)
                            .attr("height", h)
                            .attr("id", `path-summary table-body-cell-feature-name-svg-${nodeData.data.name}-${d.index}`);
                        let heightPadding = (h-d.value.split("_").length*padding)/2;
                        d.value.split("_").forEach((word, idx) => {
                            featureNameSvg.append("text")
                                .attr("class", "path-summary table-body-cell-feature-name-text cursor-default")
                                .attr("x", w/2)
                                .attr("y", heightPadding+idx*padding)
                                .attr("dominant-baseline", "middle")
                                .style("text-anchor", "middle")
                                .text(word);
                        })
                        return featureNameDiv;
                    });

                leafNodeTableBodyRow.selectAll("td")
                    .filter((d) => d.key === "featureContribution")
                    .attr("width", "70%")
                    .attr("id", (d) => `path-summary table-body-cell-${nodeData.data.name}-${d.index}`)
                    .append(function(d,i) {
                        const barchart = document.createElement("div");
                        barchart.setAttribute("class", "path-summary table-body-cell-feature-contribution flex justify-center m-auto");
                        const w = 0.7*nodeRectWidth, h = 0.35*nodeRectWidth, padding = 10;
                        const barchartSvg = d3.select(barchart)
                            .append("svg")
                            .attr("width", w)
                            .attr("height", h)
                            .attr("class", "path-summary table-body-cell-feature-contribution-svg")
                            .attr("id", `path-summary table-body-cell-feature-contribution-svg-${nodeData.data.name}-${d.index}`);
                        const cell = barchartSvg.append("g")
                            .attr("class", "path-summary table-body-cell-feature-contribution-cell");
                        
                        const x = d3.scaleLinear()
                            .domain(fcRange)
                            .range([2*padding, w-2*padding])
                        const y = d3.scaleBand()
                            .domain(d.value.map((val,idx)=>idx))
                            .range([2*padding, h-2*padding])
                            .padding(0.4);
                        // Add bars
                        cell.selectAll("bars")
                            .data(d.value)
                            .enter()
                            .append("rect")
                            .attr("class", "path-summary table-body-cell-feature-contribution-bar")
                            .attr("id", `path-summary table-body-cell-feature-contribution-bar-${nodeData.data.name}-${d.index}`)
                            .attr("x", (dd) => x(Math.min(0, dd.value))-padding)
                            .attr("y", (dd) => y(dd.label))
                            .attr('rx', 2)
                            .attr('ry', 2)
                            .attr("width", (dd) => Math.abs(x(dd.value) - x(0)))
                            .attr("height", y.bandwidth())
                            .style("fill", (dd) => colorScale[dd.label])
                            .style("stroke", "#000")
                            .style("stroke-width", "1px");
                        // Add x-axis
                        cell.append("g")
                            .attr("class", "path-summary table-body-cell-feature-contribution-x-axis cursor-default")
                            .attr("transform", `translate(${-padding}, ${h-2*padding})`)
                            .call(d3.axisBottom(x).ticks(4));

                        return barchart;
                    })

                // Set up clop-path attribute for leaf node
                d3.select(this).attr("clip-path", "url(#scrollbox-clip-path)");
                // Get node rect bbox
                const currLeafNode = d3.select(this).select("rect.node-rect");
                const leafNodeBBox = {
                    x: parseFloat(currLeafNode.attr("x")),
                    y: parseFloat(currLeafNode.attr("y")),
                    width: parseFloat(currLeafNode.attr("width")),
                    height: parseFloat(currLeafNode.attr("height")),
                };

                const scrollBarWidth = leafNodeRectStrokeWidth;
                let scrollDistance = 0;

                // Add a clip path and a rect within it.
                // Everything inside the scroll group that does not overlap this 
                // rectangle will be hidden
                const clipRect = d3.select(this).append("clipPath")
                    .attr("id", "scrollbox-clip-path")
                    .append("rect");
                
                clipRect
                    .attr("x", leafNodeBBox.x) // -nodeRectStrokeWidth to account for stroke
                    .attr("y", leafNodeBBox.y)
                    .attr("width", leafNodeBBox.width)
                    .attr("height", leafNodeBBox.height)
                
                // Insert an invisible rect that will be used to capture scroll events
                d3.select(this).append("rect")
                    .attr("class", "scroll-capture-rect")
                    .attr("x", leafNodeBBox.x)
                    .attr("y", leafNodeBBox.y)
                    .attr("width", leafNodeBBox.width)
                    .attr("height", leafNodeBBox.height)
                    .style("opacity", 0);
                
                // Position the scroll indicator
                const scrollBar = d3.select(this).append("rect")
                    .attr("class", "scroll-bar")
                    .attr("width", scrollBarWidth)
                    .attr("rx", scrollBarWidth/2)
                    .attr("ry", scrollBarWidth/2)
                    .style("fill", "#d6dee1")
                    .attr("transform", `translate(${-scrollBarWidth+0.5*leafNodeBBox.width-0.5*leafNodeRectStrokeWidth}, 
                        ${leafNodeBBox.y+0.5*leafNodeRectStrokeWidth})`)
                    .on("mouseover", function () {
                        d3.select(this)
                            .transition()
                            .duration(transitionDuration/3)
                            .attr("transform", `translate(${-(scrollBarWidth+2)+0.5*leafNodeBBox.width-0.5*leafNodeRectStrokeWidth}, 
                                ${leafNodeBBox.y+0.5*leafNodeRectStrokeWidth})`)
                            .attr("width", scrollBarWidth+2)
                            .attr("rx", (scrollBarWidth+2)/2)
                            .attr("ry", (scrollBarWidth+2)/2)
                            .style("fill", "#a8bbbf");
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .transition()
                            .duration(transitionDuration/3)
                            .attr("transform", `translate(${-scrollBarWidth+0.5*leafNodeBBox.width-0.5*leafNodeRectStrokeWidth}, 
                                ${leafNodeBBox.y+0.5*leafNodeRectStrokeWidth})`)
                            .attr("width", scrollBarWidth)
                            .attr("rx", scrollBarWidth/2)
                            .attr("ry", scrollBarWidth/2)
                            .style("fill", "#d6dee1");
                    })
                // Calculate maximum scrollable amount
                const contentBBox = foreignObject.select("table").node().getBoundingClientRect();
                const absoluteContentHeight = contentBBox.height/scale;
                foreignObject.attr("height", absoluteContentHeight);
                const scrollBarHeight = (leafNodeBBox.height-leafNodeRectStrokeWidth) * leafNodeBBox.height / absoluteContentHeight;
                scrollBar.attr("height", scrollBarHeight);
                const maxScroll = Math.max(absoluteContentHeight - leafNodeBBox.height, 0);
                // Add scroll event listener
                const updateScrollPosition = (diff) => {
                    if (diff === 0) return;
                    scrollDistance += diff;
                    scrollDistance = Math.max(0, scrollDistance);
                    scrollDistance = Math.min(maxScroll, scrollDistance);
                    foreignObject.attr("transform", 
                        `translate(${leafNodeBBox.x+0.5*leafNodeBBox.width},
                            ${leafNodeBBox.y-scrollDistance})`);
                    const scrollBarPosition = scrollDistance / maxScroll * ((leafNodeBBox.height-leafNodeRectStrokeWidth) - scrollBarHeight); 
                    scrollBar.attr("y", scrollBarPosition);
                }
                // Set up scroll events
                d3.select(this).on("wheel", (e,data) => {
                    updateScrollPosition(e.deltaY);
                });

                // Set up scrollbar drag events
                const dragBehaviour = d3.drag()
                    .on("drag", (e, data) => {
                        updateScrollPosition(e.dy * maxScroll / (leafNodeBBox.height - scrollBarHeight))
                    });
                // Add drag behaviour to scrollbar
                scrollBar.call(dragBehaviour);
                d3.select(this)
                    .on("click", clicked);
                d3.select(this).append("rect")
                    .attr("class", "hidden-rect")
                    .attr("x", leafNodeBBox.x)
                    .attr("y", leafNodeBBox.y)
                    .attr("width", leafNodeBBox.width)
                    .attr("height", absoluteContentHeight-leafNodeBBox.y)
                    .style("fill", "none")
                    .style("stroke", "transparent")
                    .style("stroke-width", nodeRectStrokeWidth);                
            }
        })
        
    }

    /**
     * Render path summary view, including feature contributions
     * @date 2022-06-17
     * @param {node} node
     */
    renderPathSummaryView(node) {
        const { parts, screenHeight, screenWidth, constants: { nodeRectWidth, nodeRectRatio, nodeRectStrokeWidth, leafNodeRectStrokeWidth, transitionDuration, colorScale } } = this;
        let _this = this;

        function clicked (event, node) {
            if (event.shiftKey) {
                if (d3.select(this).attr("clip-path") !== null) {
                    const zoomListener = _this.registeredStateListeners[0];
                    // Center the node rect in the viewport
                    parts.svgGroup.transition()
                        .duration(750)
                        .call(zoomListener.transform,
                            d3.zoomIdentity.translate(screenHeight/2, screenWidth/2)
                                .translate(-node.x, -node.y-nodeRectWidth)
                                .scale(1),d3.pointer(event));
                    // Update the transform and scale of zoom listener in the path summary view
                    parts.baseSvg.call(zoomListener)
                            .call(zoomListener.transform,
                                d3.zoomIdentity.translate(screenHeight/2, screenWidth/2)
                                .translate(-node.x, -node.y-nodeRectWidth)
                                .scale(1),d3.pointer(event));

                    d3.select(this).attr("clip-path", null)
                        .select(".node-rect")
                        .style("stroke", "transparent");
                        
                    d3.select(this).select(".hidden-rect")
                        .style("stroke", "black");
                    
                    d3.select(this).select(".scroll-bar")
                        .style("opacity", 0);
                } else {
                    d3.select(this).attr("clip-path", "url(#scrollbox-clip-path)")
                        .select(".node-rect")
                        .style("stroke", "black");

                    d3.select(this).select(".hidden-rect")
                        .style("stroke", "transparent");

                    d3.select(this).select(".scroll-bar")
                        .style("opacity", 1);
                }
            }
        }

        // Draw histogram for feature contribution
        node.each(function (nodeData, index) {
            if (nodeData.data.type === "leaf") {
                let svgGroupX, svgGroupY;
                d3.select(this)
                    .on("click", clicked);

                // Set up clop-path attribute for leaf node
                d3.select(this).attr("clip-path", "url(#scrollbox-clip-path)");
                // Get node rect bbox
                const currLeafNode = d3.select(this).select("rect.node-rect");
                const leafNodeBBox = {
                    x: parseFloat(currLeafNode.attr("x")),
                    y: parseFloat(currLeafNode.attr("y")),
                    width: parseFloat(currLeafNode.attr("width")),
                    height: parseFloat(currLeafNode.attr("height")),
                };

                const scrollBarWidth = leafNodeRectStrokeWidth;
                let scrollDistance = 0;

                // Add a clip path and a rect within it.
                // Everything inside the scroll group that does not overlap this 
                // rectangle will be hidden
                const clipRect = d3.select(this).append("clipPath")
                    .attr("id", "scrollbox-clip-path")
                    .append("rect");
                
                clipRect
                    .attr("x", leafNodeBBox.x) // -nodeRectStrokeWidth to account for stroke
                    .attr("y", leafNodeBBox.y)
                    .attr("width", leafNodeBBox.width)
                    .attr("height", leafNodeBBox.height)
                
                // Insert an invisible rect that will be used to capture scroll events
                d3.select(this).insert("rect", "g")
                    .attr("class", "scroll-capture-rect")
                    .attr("x", leafNodeBBox.x)
                    .attr("y", leafNodeBBox.y)
                    .attr("width", leafNodeBBox.width)
                    .attr("height", leafNodeBBox.height)
                    .style("opacity", 0);
                
                // Position the scroll indicator
                const scrollBar = d3.select(this).append("rect")
                    .attr("class", "scroll-bar")
                    .attr("width", scrollBarWidth)
                    .attr("rx", scrollBarWidth/2)
                    .attr("ry", scrollBarWidth/2)
                    .style("fill", "#d6dee1")
                    .attr("transform", `translate(${-scrollBarWidth+0.5*leafNodeBBox.width-0.5*leafNodeRectStrokeWidth}, 
                        ${leafNodeBBox.y+0.5*leafNodeRectStrokeWidth})`)
                    .on("mouseover", function () {
                        d3.select(this)
                            .transition()
                            .duration(transitionDuration/3)
                            .attr("transform", `translate(${-(scrollBarWidth+2)+0.5*leafNodeBBox.width-0.5*leafNodeRectStrokeWidth}, 
                                ${leafNodeBBox.y+0.5*leafNodeRectStrokeWidth})`)
                            .attr("width", scrollBarWidth+2)
                            .attr("rx", (scrollBarWidth+2)/2)
                            .attr("ry", (scrollBarWidth+2)/2)
                            .style("fill", "#a8bbbf");
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .transition()
                            .duration(transitionDuration/3)
                            .attr("transform", `translate(${-scrollBarWidth+0.5*leafNodeBBox.width-0.5*leafNodeRectStrokeWidth}, 
                                ${leafNodeBBox.y+0.5*leafNodeRectStrokeWidth})`)
                            .attr("width", scrollBarWidth)
                            .attr("rx", scrollBarWidth/2)
                            .attr("ry", scrollBarWidth/2)
                            .style("fill", "#d6dee1");
                    })

                // Get valid feature contribution data for this node
                const { fcArr, fcRange } = getEffectiveFeatureContribution(nodeData, _this);
                
                // Create value encoding for x and y axis
                let x = d3.scaleLinear()
                    .domain(fcRange)
                    .range([0, nodeRectWidth-4*nodeRectRatio]),
                    yBand = d3.scaleBand()
                    .range([0, (1/2)*(nodeRectWidth-2*nodeRectRatio)-0.5*nodeRectRatio])
                    .domain([0,1,2])
                    .padding(.2);
                
                // Iterate through the feature contribution arrays and draw them one by one
                fcArr.forEach((fc, idx) => {
                    // Draw feature contribution histogram
                    let featureContributionDistribution = d3.select(this).append("g")
                        .attr("class", "path-summary feature-contribution-histogram");

                    featureContributionDistribution.selectAll("rect")
                        .data(fc.featureContribution)
                        .enter()
                        .append("rect")
                            .attr("class", "path-summary feature-contribution-rect")
                            .attr("x", (d) => x(Math.min(0, d.value)) - x(0))
                            .attr('rx', 2)
                            .attr('ry', 2)
                            .attr("y", (d) => 3*nodeRectRatio
                                 +yBand(d.label)+idx*(1/2)*(nodeRectWidth-2*nodeRectRatio))
                            .attr("width", (d) => Math.abs(x(d.value) - x(0)))
                            .attr("height", yBand.bandwidth())
                            .style("fill", (d) => colorScale[d.label])
                            .style("stroke", "#000")
                            .style("stroke-width", "2px");

                    // Add line to separeate each feature contribution
                    featureContributionDistribution.append("line")
                        .attr("class", "path-summary feature-contribution-line")
                        .style("stroke", "#005CAB")
                        .style("stroke-width", 2)
                        .style("stroke-dasharray", ("3, 3"))
                        .attr("x1", -0.5*(nodeRectWidth-2*nodeRectRatio))
                        .attr("y1", 3*nodeRectRatio+idx*(1/2)*(nodeRectWidth-2*nodeRectRatio)-5)
                        .attr("x2", +0.5*(nodeRectWidth-2*nodeRectRatio))
                        .attr("y2", 3*nodeRectRatio+idx*(1/2)*(nodeRectWidth-2*nodeRectRatio)-5);

                    // Add text to show feature contribution name
                    featureContributionDistribution.append("text")
                        .attr("class", "path-summary feature-contribution-text")
                        .attr("x", -0.5*(nodeRectWidth-2*nodeRectRatio))
                        .attr("y", 3*nodeRectRatio+idx*(1/2)*(nodeRectWidth-2*nodeRectRatio)+yBand.bandwidth()*2)
                        .text(fc.featureName);
                    if (idx === fcArr.length-1) {
                        featureContributionDistribution.append("line")
                            .attr("class", "path-summary feature-contribution-line")
                            .style("stroke", "#005CAB")
                            .style("stroke-width", 2)
                            .style("stroke-dasharray", ("3, 3"))
                            .attr("x1", -0.5*(nodeRectWidth-2*nodeRectRatio))
                            .attr("y1", 3*nodeRectRatio+(idx+1)*(1/2)*(nodeRectWidth-2*nodeRectRatio)-5)
                            .attr("x2", +0.5*(nodeRectWidth-2*nodeRectRatio))
                            .attr("y2", 3*nodeRectRatio+(idx+1)*(1/2)*(nodeRectWidth-2*nodeRectRatio)-5);
                    }
                    svgGroupX = -0.5*(nodeRectWidth-2*nodeRectRatio);
                    svgGroupY = 3*nodeRectRatio+fcArr.length*(1/2)*(nodeRectWidth-2*nodeRectRatio) + nodeRectRatio;
                });
                // Calculate maximum scrollable amount
                const contentBBox = d3.select(this).node().getBBox();
                const absoluteContentHeight = contentBBox.y + contentBBox.height;
                const scrollBarHeight = (leafNodeBBox.height-leafNodeRectStrokeWidth) * leafNodeBBox.height / absoluteContentHeight;
                scrollBar.attr("height", scrollBarHeight);

                const maxScroll = Math.max(absoluteContentHeight - leafNodeBBox.height, 0);
                // Add scroll event listener
                const updateScrollPosition = (diff) => {
                    if (diff === 0) return;
                    scrollDistance += diff;
                    scrollDistance = Math.max(0, scrollDistance);
                    scrollDistance = Math.min(maxScroll, scrollDistance);
                    d3.select(this).selectAll("rect.summary")
                        .attr("transform", 
                        `translate(${leafNodeBBox.x+0.5*leafNodeBBox.width},
                            ${leafNodeBBox.y-scrollDistance})`);
                    d3.select(this).selectAll("g.path-summary")
                        .attr("transform", 
                        `translate(${leafNodeBBox.x+0.5*leafNodeBBox.width},
                            ${leafNodeBBox.y-scrollDistance})`);
                    const scrollBarPosition = scrollDistance / maxScroll * ((leafNodeBBox.height-leafNodeRectStrokeWidth) - scrollBarHeight); 
                    scrollBar.attr("y", scrollBarPosition);
                }
                // Set up scroll events
                d3.select(this).on("wheel", (e,data) => {
                    updateScrollPosition(e.deltaY);
                });

                // Set up scrollbar drag events
                const dragBehaviour = d3.drag()
                    .on("drag", (e, data) => {
                        updateScrollPosition(e.dy * maxScroll / (leafNodeBBox.height - scrollBarHeight))
                    });
                // Add drag behaviour to scrollbar
                scrollBar.call(dragBehaviour);

                d3.select(this).append("rect")
                    .attr("class", "hidden-rect")
                    .attr("x", leafNodeBBox.x)
                    .attr("y", leafNodeBBox.y)
                    .attr("width", leafNodeBBox.width)
                    .attr("height", svgGroupY-leafNodeBBox.y)
                    .style("fill", "none")
                    .style("stroke", "transparent")
                    .style("stroke-width", nodeRectStrokeWidth+2);
            }
        });
    }

    /**
     * Update the oblique tree visualization according to selected data points
     * @date 2020-06-30
     * @param {any} selectedNodes
     * @returns {any} 
     */ 
    renderSelectionEffect(selectedDataPoints) {
        const { nodes, trainX, trainY, constants: { featureArr } } = this;
        this.selectedPoints = selectedDataPoints.map(selectedDataPoint => selectedDataPoint.id);
        const decisionPaths = selectedDataPoints.map((selectedDataPoint) => ({
            label: selectedDataPoint.label,
            path: new Array(),
            id: selectedDataPoint.id
        }));
        const traverse = (res, currNode, selectedPoint, idx) => {
            if (currNode.data.subTrainingSet.includes(selectedPoint.id)) {
                res[idx].path.push(currNode.data.name);
                currNode.children?.forEach((child) => {
                    traverse(res, child, selectedPoint, idx);
                });
            }
        };
        selectedDataPoints.forEach((selectedDataPoint, index) => {
            traverse(decisionPaths, nodes, selectedDataPoint, index);
        });
        let dict = {}, res = [];
        decisionPaths.forEach((decisionPath) => {
            let hash = decisionPath.label+JSON.stringify(decisionPath.path);
            if (!dict[hash]) {
                dict[hash] = {
                    label: decisionPath.label,
                    path: decisionPath.path,
                    idArr: [decisionPath.id]
                };
                res.push(dict[hash]);
            } else {
                dict[hash].idArr.push(decisionPath.id);
            }
        });
        // Assign unique decision path to this
        this.uniqueDecisionPaths = res.map(obj => ({...obj}));
        
        // Store exposed flow links in this
        let i, j, k;
        let flowLinks = [], currNodeSubTrainingSet, tmpLinkDict = {};
        this.uniqueDecisionPaths.forEach((decisionPath) => {
            k = decisionPath.path.length;
            i = 0, j = 1;
            while (j < k) {
                tmpLinkDict = {};
                currNodeSubTrainingSet = d3.select(`rect#${decisionPath.path[i]}`).data()[0].data.subTrainingSet;
                tmpLinkDict.pathId = `${decisionPath.path[i]}-${decisionPath.path[j]}-${decisionPath.label}`;
                tmpLinkDict.count = 0;
                decisionPath.idArr.forEach((id) => {
                    if (currNodeSubTrainingSet.includes(id)) {
                        tmpLinkDict.count++;
                    }
                });
                flowLinks.push(tmpLinkDict);
                i += 1;
                j += 1;
            }
        });
        this.exposedFlowLinks = flowLinks.map(link => ({...link}));
        const exposedFeatureContributions = [];
        res.forEach((decisionPath) => {
            let leafNodeName = decisionPath.path[decisionPath.path.length-1];
            let currFeatureContribution = this.constants.localFeatureContribution[leafNodeName];
            currFeatureContribution.forEach((val, i) => {
                if (!val.every(e => e === 0)) {
                    exposedFeatureContributions.push({
                        featureId: i,
                        fcArr: val,
                        idArr: decisionPath.idArr,
                    });
                }
            })
        });
        const uniqueExposedFeatureContributions = exposedFeatureContributions.reduce((acc, curr) => {
            let found = acc.find(e => e.featureId === curr.featureId);
            if (found) {
                curr.fcArr.map((fc, i) => {
                    found.contribution[i] = found.contribution[i].concat(Array(curr.idArr.length).fill(fc));
                })
                found.datasets = found.datasets.concat(curr.idArr);
            } else {
                acc.push({
                    featureId: curr.featureId,
                    contribution: curr.fcArr.map(fc => Array(curr.idArr.length).fill(fc)),
                    datasets: curr.idArr
                });
            }
            return acc;
        }, []);
        this.exposedFeatureContributions = uniqueExposedFeatureContributions.map((ele) => ({
            featureId: ele.featureId,
            contribution: ele.contribution.map((arr) => d3.quantile(arr.sort(d3.ascending), 0.5)),
            datasets: ele.datasets
        }));
        return this.exposedFeatureContributions;
    }


    /**
     * Zooming is performed by either double clickiing on an empty part
     * of the SVG or by scrolling the mouse-wheel.
     * @date 2022-06-14
     */
    enableZooming() {
        const { parts, width, height } = this;
        const zoomed = ({ transform }) => {
            if (parts.svgGroup.node().querySelector(".detailed") === null) {
                parts.svgGroup.attr('transform', transform);
            }
        }

        const zoomListener = d3.zoom()
            .extent([[0,0], [width, height]])
            .scaleExtent([1, 8])
            .on('zoom', zoomed);
        parts.baseSvg.call(zoomListener)
            .call(d3.zoom().transform, 
                d3.zoomIdentity.translate(width/2,height/2).scale(0.5));
            
    }

    /**
     * Set preprocessed data and options.
     * @date 2022-06-14
     * @param {opts} opts
     * @param {data} data
     */
    setDataAndOpts(opts, data, trainingData) {
        this.constants.nodeRectWidth = this.height*(1/(2*maxDepth(data)));
        this.constants.leafNodeRectHeight = this.height*(1/(2*maxDepth(data)));
        this.opts = opts;
        this.data = data;
        this.trainX = trainingData.trainingSet;
        this.trainY = trainingData.labelSet;
        this.constants.featureArr = trainingData.featureArr;
    }

    /**
     * Return an array of processed link object with structure
     * {"source": {x: , y: , width: }, "target": {x: , y: , width: }, class: }
     * @date 2022-06-15
     * @param {links} links
     */
    generateFlows(links) {
        const { constants: { nodeRectWidth, nodeRectRatio } } = this;

        // Width of flow should not be larger than (node rect width - 2 * node rect ratio)
        const widthFlow = nodeRectWidth - 2 * nodeRectRatio;
        let currSize, currWidth;
        const fullsize = _.sum(links[0].parent.data.totalCount);
        const resFlows = [];
        let currParentX, currChildX;
        // Loop through each link and generate flow
        for (const link of links) {
            currSize = _.sum(link.data.totalCount);
            currWidth = (currSize / fullsize) * widthFlow;
            const currLinkWidthArr = [];
            const currParentCountArr = link.parent.data.leftCount.concat(link.parent.data.rightCount);
            // Loop through left and right count of parent node
            currParentCountArr.forEach((ele, idx) => {
                currLinkWidthArr.push({
                    label: idx > 2 ? idx - 3 : idx,
                    value: (ele / currSize) * currWidth,
                    count: ele
                });
            });
            currParentX = link.parent.x;
            currChildX = link.x;
            // Generate flow for each link
            currLinkWidthArr.forEach((val, idx) => {
                // Update x position of parent and child node
                currParentX += idx > 0
                    ? 0.5 * (currLinkWidthArr[idx-1].value + currLinkWidthArr[idx].value) 
                    : - 0.5 * (_.sum(currLinkWidthArr.map(ele => ele.value)) - currLinkWidthArr[idx].value);
                currChildX += idx > 0 
                    ? 0.5 * (currLinkWidthArr[idx-1].value + currLinkWidthArr[idx].value) 
                    : - 0.5 * (currWidth - currLinkWidthArr[idx].value);
                let emptySpace = 0;
                // Calculate invalid movement for each child node on x axis
                for (let i = 0; i <= idx; i++) {
                    if (link.data.totalCount[currLinkWidthArr[i].label] !== currParentCountArr[i]) {
                        emptySpace += currLinkWidthArr[i].value;
                    }
                }
                // Store valid flow into resFlows to be rendered
                if (link.data.totalCount[val.label] === currParentCountArr[idx] && currLinkWidthArr[idx].count > 0) {
                    resFlows.push({
                        source: {
                            x: currParentX,
                            y: link.parent.y + nodeRectWidth,
                            width: currLinkWidthArr[idx].value,
                        },
                        target: {
                            x: currChildX - emptySpace,
                            y: link.y,
                            width: currLinkWidthArr[idx].value,
                        },
                        class: val.label,
                        id: `${link.parent.data.name}-${link.data.name}-${val.label}`,
                        count: currLinkWidthArr[idx].count
                    })
                }
            })
        }
        return resFlows;
    }

    /**
     * Render the tree diagram to highlight selected features.
     * @date 2022-09-09
     * @param { * } selectedFeatures
     */
    renderSelectedFeaturesUpdate(selectedFeaturesArr) {
        // Clear selected features
        this.selectedFeatureNames = [];
        if (selectedFeaturesArr.length === 0) {
            d3.selectAll("rect.coefficients-bar")
                .style("opacity", 1)
                .style("stroke", "none");
            d3.selectAll("g.node")
                .style("opacity", 1);
        } else {

            // Weak display of non-target feature decision nodes
            d3.selectAll("rect.coefficients-bar")
                .style("opacity", 0.2);
            d3.selectAll("g.node")
                .style("opacity", 0.4);
            selectedFeaturesArr.forEach((featureName) => {
                this.selectedFeatureNames.push(featureName);
                // Highlight target feature decision nodes and donut chart
                d3.selectAll(`rect#coefficients-bar-${featureName}`)
                    .style("opacity", 1)
                    .style("stroke", "black")
                    .style("stroke-width", 2);

                d3.selectAll(`rect#coefficients-bar-${featureName}`).nodes().forEach((node) => {
                    d3.select(node.parentNode.parentNode)
                        .style("opacity", 1);
                })
            })
        }
    }

    /**
     * Compute the global feature contribution of the whole tree.
     * @date 2022-09-05
     */
    computeGlobalFeatureContribution() {
        const { data, trainX, trainY, constants: { featureArr } } = this;
        const featureData = {};
        featureArr.forEach((featureName) => {
            featureData[featureName] = Object.assign(...Array.from(new Set(trainY)).map((val) => ({[val]: []})));
            trainY.forEach((val, idx) => {
                featureData[featureName][val].push(trainX[idx][featureName]);
            });
        });
        const featureTable = featureArr.map(featureName => ({
            name: featureName,
        }));
        const tmpLocalFeatureContribution = {};
        let tmpFeatureContributionArr = featureArr.map(() => Array.from({length:3}, () => []));
        const helper = (curr) => {
            if (!curr) return;

            if (curr.children && curr.children.length > 0) {
                curr.children.map(child => helper(child));
            } else {
                tmpLocalFeatureContribution[curr.name] = curr.featureContribution;
                curr.featureContribution.map((contributionArr, idx) => {
                    contributionArr.map((contribution, idx2) => {
                        contribution !== 0 && 
                        (tmpFeatureContributionArr[idx][idx2] = tmpFeatureContributionArr[idx][idx2].concat(Array(curr.subTrainingSet.length).fill(contribution)));
                    })
                })
        }
        }
        helper(data);
        this.constants.localFeatureContribution = tmpLocalFeatureContribution;
        featureTable.map((feature, idx) => {
            // feature.contribution = tmpFeatureContributionArr[idx].map((contributionArr) => contributionArr.length ? d3.quantile(contributionArr.sort(d3.ascending), 0.5): 0);
            feature.contribution = tmpFeatureContributionArr[idx];
        });
        this.featureTable = featureTable;
        return featureTable;
    }
}

Odt.initClass();
export default Odt;